import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { getCatalog } from '../../api/catalogs'
import { downloadSimplePdf } from '../../services/simplePdf'
import { speciesImages } from '../../assets/birds'
import BreedingLesson, { LessonCue, MendelianPrimer } from './lesson/BreedingLesson'
import ComplexitySection from './complexity/ComplexitySection'
import CompatibilitySummary from './compatibility/CompatibilitySummary'
import WeightedFormula from './compatibility/WeightedFormula'
import ScoreBreakdown from './compatibility/ScoreBreakdown'
import SpeciesCompatibilityPanel from './compatibility/SpeciesCompatibilityPanel'
import ParentGeneticProfile from './compatibility/ParentGeneticProfile'
import RbgiaPipeline from './inheritance/RbgiaPipeline'
import RbgiaSummary from './inheritance/RbgiaSummary'
import AlleleTranslation from './inheritance/AlleleTranslation'
import PunnettSquare from './inheritance/PunnettSquare'
import PhenotypeMap from './inheritance/PhenotypeMap'
import PairInheritanceBoard from './inheritance/PairInheritanceBoard'
import GeneActionBoard from './inheritance/GeneActionBoard'
import ClutchSimulationPanel from './outcomes/ClutchSimulationPanel'
import EggInheritance from './outcomes/EggInheritance'
import EggMutationMedia from './outcomes/EggMutationMedia'
import PairOverview from './outcomes/PairOverview'
import ActualBreedingPanel from './outcomes/ActualBreedingPanel'
import { loadActualBreed, resolveSlots, saveActualBreed, savedClutchRecord, slotsToChicks, slotsToEggs } from './outcomes/actualBreeding'
import { eggStatusShort, eggStatusTone, isLivingEgg } from './outcomes/eggStatus'
import { StatusPill } from './shared/primitives'
import { barColor, breedingOutcome, geneInheritanceRows, inheritsSplitGenes, outcomeBaseColor, outcomeSplit, outcomeVisual, percentText } from './shared/format'
import { attachHeadToTail, buildCompatibilityModel, buildComplexityReport, buildRbgiaTrace, translateGenotype } from '../../services/genetics'
import '../Breeding/BreedingWorkflow.css'
import './CompatibilityModule.css'
import './ComputationResult.css'

const RESULT_SECTIONS = [
  {
    id: 'overview',
    n: '00',
    label: 'Overview',
    hint: 'Parents and chicks',
    proves: 'Each chick is a card with a large photo. The first bar is that chick’s share of the nest. The bars under it are the chance of each trait, and which parent passed it.',
  },
  {
    id: 'final-output',
    n: '01',
    label: 'The result',
    hint: 'Should you breed them?',
    proves: 'The score says how well this pair fits. The reasons under it are the points that raised or lowered that score.',
  },
  {
    id: 'flow',
    n: '02',
    label: 'The path',
    hint: 'RBGIA, then GICA',
    proves: 'RBGIA works out how genes pass. GICA scores that evidence. The nest forecast uses the score and never rewrites a Punnett square.',
  },
  {
    id: 'compatibility',
    n: '03',
    label: 'The two birds',
    hint: 'Only saved records',
    proves: 'Both engines read the color, mutations, and hidden genes already saved. A missing genotype stays missing.',
  },
  {
    id: 'inheritance',
    n: '04',
    label: 'How genes pass',
    hint: 'Mendel and Punnett',
    proves: 'Each gene is translated, split into the alleles a parent can pass, crossed in a Punnett square, then read as a look. The same parents always fill the same boxes.',
  },
  {
    id: 'distribution',
    n: '05',
    label: 'Possible chicks',
    hint: 'Looks and hidden genes',
    proves: 'Sex, base color, visual mutations, and split genes are counted from those squares. A whole chick is those genes combined.',
  },
  {
    id: 'gica',
    n: '06',
    label: 'The score',
    hint: 'Why the points land here',
    proves: 'Desirable traits, recessive risk, diversity, mutation load, species fit, and breeding limits each have a fixed share of 100. GICA does not change the RBGIA fractions.',
  },
  {
    id: 'forecast',
    n: '07',
    label: 'Eggs and hatch',
    hint: 'An estimate',
    proves: 'The forecast stays inside the species clutch range and moves with the score, diversity, and genetic load. Expected hatchlings apply the hatch rate.',
  },
  {
    id: 'complexity',
    n: '08',
    label: 'Work this run did',
    hint: 'Time and space',
    proves: 'Time grows with chick outcomes times traits. Space grows with the trait map. The counts are from this stored run.',
  },
]

function getSection(id) {
  return RESULT_SECTIONS.find((item) => item.id === id)
}

function resolveSection(id) {
  if (!id) return null
  if (id === 'time-complexity' || id === 'space-complexity') return 'complexity'
  return getSection(id) ? id : null
}

function sectionHash(resultId, sectionId) {
  if (!resultId) return '#predictions'
  const valid = resolveSection(sectionId) || RESULT_SECTIONS[0].id
  return `#computation/${resultId}/${valid}`
}

function displayText(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') return value.display || value.description || value.genotype || '—'
  return '—'
}

function storedColor(value) {
  if (typeof value !== 'string') return value || null
  const text = value.trim()
  if (!text || /^not recorded$/i.test(text)) return null
  return text
}

function chickFacts(egg) {
  const traits = egg?.collected_traits || {}
  return {
    ...egg,
    ...traits,
    egg_number: egg?.egg_number ?? traits.egg_number,
    base_color: storedColor(traits.base_color) || storedColor(egg?.base_color),
    visual_mutations: traits.visual_mutations?.length ? traits.visual_mutations : egg?.visual_mutations,
    split_hidden_genes: inheritsSplitGenes(egg)
      ? (traits.split_hidden_genes?.length
        ? traits.split_hidden_genes
        : (egg?.split_hidden_genes || egg?.split_genes))
      : [],
    passed_from_parents: egg?.passed_from_parents || traits.passed_from_parents,
  }
}

function isAbsentSplit(row) {
  const text = String(row?.trait || row?.name || '').trim().toLowerCase()
  return text === 'not split' || text === 'non-carrier' || text === 'non carrier'
}

function cockSplitRows(rows) {
  return (rows || []).filter((row) => !isAbsentSplit(row))
}

function mendelianDistribution(stored, chicks, answerOf, category) {
  if (Array.isArray(stored) && stored.length) return stored
  if (!chicks?.length) return []
  const groups = new Map()
  chicks.forEach((row) => {
    const trait = answerOf(row)
    const raw = row?.probability
    const probability = typeof raw === 'number'
      ? (raw > 1 ? raw / 100 : raw)
      : (typeof raw?.probability === 'number' ? raw.probability : 0)
    const current = groups.get(trait) || { trait, category, probability: 0 }
    groups.set(trait, current)
    current.probability += probability
  })
  return [...groups.values()]
}

function listOrDash(items) {
  if (!items?.length) return 'None calculated'
  const names = items.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
  return names.length ? names.join(', ') : 'None calculated'
}

function passedSummary(rows, chick) {
  if (!rows?.length) return '—'
  const maleSplits = inheritsSplitGenes(chick)
  return rows
    .filter((row) => row?.locus)
    .map((row) => {
      const look = String(row.expression || '')
      const kind = look.startsWith('visual')
        ? 'visual'
        : look === 'carrier_split'
          ? (maleSplits ? 'split' : 'not inherited')
          : look === 'non_carrier' || look === 'hemizygous_wild'
            ? 'not carried'
            : look.replace(/_/g, ' ')
      return `${row.locus}: ${row.from_cock || '—'} × ${row.from_hen || '—'} (${kind})`
    })
    .join('; ')
}

function speciesLabel(species) {
  if (!species) return '—'
  if (typeof species === 'string') return species
  return species.common_name || species.scientific_name || species.name || '—'
}

/** Visualize engine probability/fraction as a display percent. Does not recalculate genetics. */
function toPercent(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) return Math.round(value * 1000) / 10
    return Math.round(value * 10) / 10
  }
  if (typeof value === 'string') {
    const fraction = value.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (fraction) {
      const num = Number(fraction[1])
      const den = Number(fraction[2])
      if (den > 0) return Math.round((num / den) * 1000) / 10
    }
    const pct = value.match(/([\d.]+)\s*%/)
    if (pct) return Number(pct[1])
  }
  if (value && typeof value === 'object') {
    if (typeof value.probability === 'number') return toPercent(value.probability)
    if (value.fraction) return toPercent(value.fraction)
  }
  return null
}

function formatPercent(value) {
  const pct = toPercent(value)
  if (pct == null) return null
  return `${pct}%`
}

function sameChance(rows) {
  const values = (rows || []).map((row) => toPercent(row)).filter((value) => value != null)
  return values.length > 1 && values.every((value) => value === values[0])
}

function gicaStatusLabel(label, score) {
  if (label) return String(label).trim()
  if (score == null) return 'Not documented'
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Not Recommended'
}

function sexLabel(sex, sexLabelText) {
  if (sexLabelText) return sexLabelText
  const value = String(sex || '').toLowerCase()
  if (value === 'cock' || value === 'male') return 'Male / Cock'
  if (value === 'hen' || value === 'female') return 'Female / Hen'
  if (value === 'both') return 'Both / Unspecified'
  return sex || '—'
}

function classifyInheritance(type) {
  const value = String(type || '').toLowerCase()
  if (!value) return null
  if (value.includes('sex-linked')) return 'sex-linked'
  if (value.includes('dominant') && !value.includes('recessive')) return 'dominant'
  if (value.includes('incomplete') || value.includes('intermediate') || value.includes('partial')) return 'dominant'
  if (value.includes('recessive')) return 'recessive'
  return null
}

function chickTraitLabel(row) {
  return breedingOutcome(row)
}

function outcomeFlags(row) {
  const flags = { dominant: false, 'sex-linked': false, recessive: false }
  const classes = row.inheritance_classes || null
  if (classes) {
    if (classes.dominant) flags.dominant = true
    if (classes.sex_linked || classes['sex-linked']) flags['sex-linked'] = true
    if (classes.recessive) flags.recessive = true
    return flags
  }
  const loci = row.loci || []
  if (loci.length) {
    loci.forEach((locus) => {
      const kind = classifyInheritance(locus.inheritance_type)
      if (kind) flags[kind] = true
    })
  }
  const direct = classifyInheritance(row.inheritance_type)
  if (direct) flags[direct] = true
  if (inheritsSplitGenes(row) && (row.split_hidden_genes || []).length) flags.recessive = true
  return flags
}

function buildTraitSummary(rows) {
  return rows
    .slice(0, 8)
    .map((row) => {
      const pct = formatPercent(row)
      return `${chickTraitLabel(row)}${pct ? ` (${pct})` : ''}`
    })
    .join(' · ')
}

function parentLine(parent) {
  if (!parent) return '—'
  return [parent.bird_id, parent.species, parent.sex].filter(Boolean).join(' · ') || '—'
}

function downloadBreedingReport({ pair, species, gica, gicaScore, eggs, probabilities, recommendation }) {
  const score = gicaScore ?? pair?.score ?? null
  const label = pair?.label || gicaStatusLabel(gica.label, score)
  const advice = recommendation || gica.recommendation || pair?.recommendation || '—'
  const positives = pair?.why?.positives || gica.why?.positives || []
  const warnings = pair?.why?.warnings || gica.why?.warnings || []
  const breakdown = pair?.breakdown || gica.breakdown || []
  const rows = (probabilities.complete_offspring || []).length
    ? probabilities.complete_offspring
    : eggs
  const blocks = [
    { type: 'title', text: 'AGAPORA' },
    { type: 'heading', text: 'Genetic pair compatibility report' },
    { type: 'body', text: 'Rule-based inheritance for this stored lovebird pair. The same parents always produce this same report.' },
    { type: 'heading', text: '1. Result' },
    { type: 'body', text: `Score: ${score == null ? '—' : `${score} / 100`} · ${label}` },
    { type: 'body', text: `Recommendation: ${advice}` },
    { type: 'heading', text: '2. Parents' },
    { type: 'body', text: `Parent 1: ${parentLine(pair?.parent_1 || species.parent_1)}` },
    { type: 'body', text: `Parent 2: ${parentLine(pair?.parent_2 || species.parent_2)}` },
    { type: 'heading', text: '3. Why this score' },
    { type: 'body', text: positives.length ? `In favor: ${positives.join(' ')}` : 'In favor: none recorded.' },
    { type: 'body', text: warnings.length ? `Watch for: ${warnings.join(' ')}` : 'Watch for: none recorded.' },
    { type: 'body', text: `Genetic risk: ${pair?.risk?.level || gica.risk?.level || '—'}` },
    { type: 'body', text: `Genetic diversity: ${pair?.diversity?.level || gica.diversity?.level || '—'}` },
  ]

  if (breakdown.length) {
    blocks.push({ type: 'heading', text: '4. Score breakdown' })
    breakdown.forEach((row) => {
      blocks.push({
        type: 'body',
        text: `${row.factor}: ${row.points ?? row.contribution ?? '—'} / ${row.max_points ?? '—'} (${row.value ?? '—'})`,
      })
    })
  }

  blocks.push({ type: 'heading', text: breakdown.length ? '5. Possible offspring' : '4. Possible offspring' })
  if (!rows.length) {
    blocks.push({ type: 'body', text: 'No offspring distribution was stored for this pair.' })
  } else {
    rows.forEach((row, index) => {
      blocks.push({
        type: 'body',
        text: `${index + 1}. ${chickTraitLabel(row)}. Sex: ${sexLabel(row.sex, row.sex_label)}. Chance: ${formatPercent(row) || '—'}.`,
      })
    })
  }

  blocks.push({
    type: 'body',
    text: 'This is an estimate from the stored pair. It does not guarantee a nest, a hatch, or the exact chicks you will see.',
  })

  downloadSimplePdf({
    filename: `agapora-pair-compatibility-${Date.now()}.pdf`,
    blocks,
  })
}

function rowName(row, fallback = 'Outcome') {
  if (row.sex && !row.genotype && !row.trait && !row.phenotype) return sexLabel(row.sex, row.sex_label || row.trait)
  if (row.trait) return row.trait
  return [row.genotype, row.phenotype, row.sex ? sexLabel(row.sex, row.sex_label) : null]
    .filter(Boolean)
    .join(' · ') || fallback
}

function sortByProbability(rows) {
  return [...(rows || [])]
    .filter((row) => toPercent(row) != null || row.fraction || typeof row.probability === 'number')
    .sort((a, b) => (toPercent(b) ?? -1) - (toPercent(a) ?? -1))
}

function parseTraitBadges(items = []) {
  return items.map((item) => {
    const text = String(item)
    const match = text.match(/^(Base color|Visual mutation|Split\/hidden gene):\s*(.+)$/i)
    if (match) return { kind: match[1], value: match[2] }
    return { kind: 'Trait', value: text }
  })
}

function plainColorName(value) {
  let text = String(value || '').trim()
  if (!text) return ''
  text = text.replace(/\s+expression$/i, '')
  const wrapped = text.match(/ground color \(([^)]+)\)/i)
  return wrapped ? wrapped[1] : text
}

function joinNames(items) {
  const names = (items || []).map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
  return names.length ? names.join(' · ') : 'None'
}

function colorOutcomeLabel(row) {
  const phenotype = plainColorName(row.phenotype || row.base_color)
  if (phenotype && phenotype.length <= 42 && !/not specified/i.test(phenotype)) return phenotype
  const meaning = {
    non_carrier: 'Wild type',
    carrier_split: 'Hidden',
    visual: 'Shows',
    visual_single_factor: 'Shows once',
    visual_double: 'Shows stronger',
  }[row.expression]
  return meaning || row.genotype || 'Outcome'
}

const TRAIT_GROUPS = [
  ['Color', (badge) => /base color/i.test(badge.kind)],
  ['Shows', (badge) => /visual mutation/i.test(badge.kind)],
  ['Hidden', (badge) => /split/i.test(badge.kind)],
]

function TraitGroups({ badges }) {
  if (!badges.length) return <p className="compute-result__empty">None recorded</p>
  const used = new Set()
  const groups = TRAIT_GROUPS.map(([label, test]) => {
    const items = badges.filter((badge) => test(badge))
    items.forEach((badge) => used.add(badge))
    return { label, items }
  }).filter((group) => group.items.length)
  const rest = badges.filter((badge) => !used.has(badge))
  if (rest.length) groups.push({ label: 'Other', items: rest })

  return (
    <dl className="inherit-lines">
      {groups.map((group) => (
        <div key={group.label}>
          <dt>{group.label}</dt>
          <dd>{group.items.map((item) => (group.label === 'Hidden' ? item.value.replace(/^split\s+/i, '') : item.value)).join(' · ')}</dd>
        </div>
      ))}
    </dl>
  )
}

function forecastIsDocumented(value) {
  if (value == null || value === '') return false
  return !String(value).toLowerCase().includes('not documented')
}

function ProgressBar({ percent, tone = 'info', label, color }) {
  const width = Math.max(0, Math.min(100, percent ?? 0))
  return (
    <div className={`compute-bar is-${tone}`} title={label || undefined}>
      <div className="compute-bar__track" aria-hidden="true">
        <div className="compute-bar__fill" style={{ width: `${width}%`, background: color || undefined }} />
      </div>
      {label ? <span className="compute-bar__label">{label}</span> : null}
    </div>
  )
}

function MetricCard({ label, value, hint, children }) {
  return (
    <article className="compute-metric">
      <p className="compute-metric__label">{label}</p>
      <p className="compute-metric__value">{value}</p>
      {hint ? <p className="compute-metric__hint">{hint}</p> : null}
      {children}
    </article>
  )
}

function ProvesNote({ sectionId }) {
  const item = getSection(sectionId)
  if (!item) return null
  return (
    <p className="compute-proves">
      <span className="compute-proves__label">Why this step</span>
      {item.proves}
    </p>
  )
}

function ResultBlock({ title, children, eyebrow, sectionId, showHeading = true, showNote = true }) {
  return (
    <section id={sectionId ? `process-${sectionId}` : undefined} className="compute-result__card compute-section-panel">
      {eyebrow ? <p className="compute-result__eyebrow">{eyebrow}</p> : null}
      {showHeading ? <h2>{title}</h2> : null}
      {showHeading && showNote ? <ProvesNote sectionId={sectionId} /> : null}
      {children}
    </section>
  )
}

function unavailableReasonFor(probabilities, category) {
  const hit = (probabilities?.unavailable || []).find((item) => item.category === category)
  return hit?.reason || null
}

function DistributionPanel({ title, rows, nameResolver, unavailableReason, showCode = true }) {
  const sorted = useMemo(() => sortByProbability(rows), [rows])

  if (!sorted.length) {
    return (
      <article className="compute-dist-panel">
        <header className="compute-dist-panel__head">
          <h3>{title}</h3>
        </header>
        <p className="compute-result__empty">
          {unavailableReason
            ? `Calculation unavailable. Reason: ${unavailableReason}`
            : 'Calculation unavailable. Reason: Missing parental genotype or undocumented locus for this category.'}
        </p>
      </article>
    )
  }

  const topPct = toPercent(sorted[0])
  const tied = sorted.every((row) => toPercent(row) === topPct)

  return (
    <article className="compute-dist-panel">
      <header className="compute-dist-panel__head">
        <div>
          <p className="compute-dist-panel__kicker">{tied ? 'Same chance' : 'Highest probability'}</p>
          <h3>{title}</h3>
        </div>
        <span className="compute-dist-panel__highest">{formatPercent(topPct) || '—'}</span>
      </header>
      <ul className="compute-prob-list">
        {sorted.map((row, index) => {
          const pct = toPercent(row)
          const name = nameResolver ? nameResolver(row) : rowName(row)
          const genotype = row.genotype || row.base_color_genotype || null
          return (
            <li key={`${title}-${name}-${row.fraction || pct}-${index}`} className={`compute-prob-row${index === 0 && !tied ? ' is-top' : ''}`}>
              <div className="compute-prob-row__head">
                <span className="compute-prob-row__name">{name}</span>
                <span className="compute-prob-row__pct">{formatPercent(pct)}</span>
              </div>
              {showCode && genotype ? <p className="compute-prob-row__genotype">Code: {genotype} · Means: {translateGenotype(genotype, row.locus || row.trait)}</p> : null}
              <ProgressBar percent={pct} color={barColor(name, index)} />
              {row.fraction ? <p className="compute-prob-row__fraction">{row.fraction} of all calculated chicks</p> : null}
            </li>
          )
        })}
      </ul>
    </article>
  )
}

/** Presentation-only split of a GICA factor string into title + detail. Text is unchanged. */
function splitFactor(text) {
  const raw = String(text || '').trim()
  const colon = raw.match(/^([^:]{3,60}):\s+(.+)$/)
  if (colon) return { title: colon[1].trim(), detail: colon[2].trim() }
  const paren = raw.match(/^(.+?)\s\(([^()]+)\)$/)
  if (paren) return { title: paren[1].trim(), detail: paren[2].trim() }
  return { title: raw, detail: '' }
}

function evidenceValue(value) {
  if (value == null || value === '') return '—'
  const text = String(value)
  if (/^[A-Z_]+$/.test(text)) {
    return text.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return text
}

function locusLabel(value) {
  if (value == null || value === '') return '—'
  const text = String(value)
  if (/^[a-z_]+$/.test(text)) {
    return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return evidenceValue(text)
}

function speciesBreakdownValue(breakdown) {
  const row = (breakdown || []).find((item) => item.key === 'species_compatibility')
  return row?.value || null
}

function gicaTone(score) {
  if (score == null) return 'muted'
  if (score >= 90) return 'full'
  if (score >= 75) return 'high'
  if (score >= 60) return 'moderate'
  if (score >= 40) return 'low'
  return 'poor'
}

function CompatibilityScoreCard({ score, status, summary, onGenerate }) {
  const pct = score == null ? null : Math.max(0, Math.min(100, Math.round(score)))
  const tone = gicaTone(score)
  return (
    <article className={`thesis-score-card is-${tone}`} aria-labelledby="thesis-score-title">
      <p className="compute-result__eyebrow" id="thesis-score-title">Compatibility score</p>
      <div className="thesis-score-card__figure">
        <p className="thesis-score-card__score">
          <strong>{pct == null ? '—' : pct}</strong>
          <span>/ 100</span>
        </p>
        <p className="thesis-score-card__percent">{pct == null ? 'Not documented' : `${pct}%`}</p>
      </div>
      <div
        className={`thesis-score-bar is-${tone}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
        aria-valuetext={pct == null ? 'Score unavailable' : `${pct} percent, ${status}`}
        aria-label="Genetic pair compatibility score"
      >
        <div className="thesis-score-bar__fill" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <p className="thesis-score-card__rating">{status}</p>
      {summary ? <p className="thesis-score-card__summary">{summary}</p> : null}
      {onGenerate ? (
        <button type="button" className="thesis-report-btn" onClick={onGenerate}>
          Generate Report
        </button>
      ) : null}
    </article>
  )
}

function resultSpeciesId(result, presentation = {}) {
  const parents = [
    result?.parent_snapshot?.parent_1,
    result?.parent_snapshot?.parent_2,
    presentation?.pair_compatibility?.parent_1,
    presentation?.pair_compatibility?.parent_2,
  ]
  for (const parent of parents) {
    const id = parent?.species?.id ?? parent?.species_id
    if (id != null) return id
  }
  return null
}

function parentSpeciesImage(parent) {
  const id = parent?.species?.id ?? parent?.species_id
  return id != null ? speciesImages[id] || null : null
}

function ParentBirdColumn({ label, parent, fallback }) {
  const species = parent?.species?.common_name || parent?.species || fallback?.species || '—'
  const scientific = parent?.species?.scientific_name || fallback?.scientific_name || ''
  const sex = parent?.sex_label || sexLabel(parent?.sex, fallback?.sex)
  const birdId = parent?.bird_id || fallback?.bird_id || '—'
  const image = parentSpeciesImage(parent)
  const alt = `${species}${scientific ? ` (${scientific})` : ''} — ${sex}, ${label}`

  return (
    <div className="thesis-parent">
      <p className="thesis-parent__label">{label}</p>
      <div className="thesis-parent__media">
        {image ? (
          <img src={image} alt={alt} loading="lazy" />
        ) : (
          <div className="thesis-parent__placeholder" role="img" aria-label={`${species} image unavailable`}>
            <span>{species !== '—' ? species.charAt(0) : '?'}</span>
          </div>
        )}
      </div>
      <p className="thesis-parent__id">{birdId}</p>
      <dl className="thesis-parent__facts">
        <div>
          <dt>Species</dt>
          <dd>{species}{scientific ? <em>{scientific}</em> : null}</dd>
        </div>
        <div><dt>Sex</dt><dd>{sex}</dd></div>
        <div><dt>Base Color</dt><dd>{parent?.base_color?.name || displayText(parent?.base_color)}</dd></div>
        <div><dt>Visual Mutation</dt><dd>{parent?.visual_mutations?.length ? listOrDash(parent.visual_mutations) : 'Wild Type'}</dd></div>
        <div><dt>Split / Hidden Genes</dt><dd>{listOrDash(parent?.split_genes)}</dd></div>
      </dl>
    </div>
  )
}

function ParentBirdsCard({ parentSnapshot, parent1Fallback, parent2Fallback }) {
  return (
    <article className="thesis-parents-card" aria-labelledby="thesis-parents-title">
      <p className="compute-result__eyebrow" id="thesis-parents-title">Parent birds</p>
      <div className="thesis-parents-grid">
        <ParentBirdColumn label="Parent 1" parent={parentSnapshot?.parent_1} fallback={parent1Fallback} />
        <div className="thesis-parents-x" aria-hidden="true">×</div>
        <ParentBirdColumn label="Parent 2" parent={parentSnapshot?.parent_2} fallback={parent2Fallback} />
      </div>
    </article>
  )
}

function InheritanceTag({ kind }) {
  const labels = {
    dominant: 'Dominant',
    'sex-linked': 'Sex-Linked',
    recessive: 'Recessive',
  }
  return <span className={`thesis-tag is-${kind}`}>{labels[kind] || kind}</span>
}

function OverviewSection({
  pair,
  species,
  eggs,
  parentSnapshot,
  speciesId,
  locusOutcomes,
  actualBreed,
  computedEggCount,
  chickTypes,
  onActualBreedChange,
}) {
  const parent1 = pair?.parent_1 || species.parent_1 || {}
  const parent2 = pair?.parent_2 || species.parent_2 || {}
  const showSaved = actualBreed?.saved === true
  const savedSlots = useMemo(
    () => resolveSlots(savedClutchRecord(actualBreed), actualBreed?.savedEggCount ?? 0),
    [actualBreed],
  )
  const computedChicks = useMemo(() => (
    [...eggs]
      .filter(isLivingEgg)
      .sort((a, b) => Number(a.egg_number) - Number(b.egg_number))
      .map((egg) => chickFacts(egg))
  ), [eggs])
  const actualChicks = useMemo(
    () => slotsToChicks(savedSlots, chickTypes).map((chick) => chickFacts(chick)),
    [savedSlots, chickTypes],
  )
  const hatchedSlots = savedSlots.filter((slot) => slot.hatched)
  let emptyMessage = 'No living chicks hatched in this nest.'
  let nestNote = 'Hatched eggs from the nest, in egg order.'
  let chicksTitle = 'Living chicks'
  if (showSaved) {
    chicksTitle = 'Real life clutch'
    nestNote = 'Saved eggs and chicks, in egg order.'
    if (!savedSlots.length) emptyMessage = 'This pair laid no eggs.'
    else if (!hatchedSlots.length) emptyMessage = 'Every egg in this clutch did not hatch.'
    else emptyMessage = 'Choose a calculated chick for each egg that hatched.'
  }

  return (
    <ResultBlock
      title="Parents and chicks"
      eyebrow="Overview"
      sectionId="overview"
      showNote={false}
    >
      <ActualBreedingPanel
        record={actualBreed}
        computedEggCount={computedEggCount}
        chickTypes={chickTypes}
        speciesId={speciesId}
        onChange={onActualBreedChange}
      />
      <PairOverview
        parentSnapshot={parentSnapshot}
        parent1Fallback={parent1}
        parent2Fallback={parent2}
        chicks={showSaved ? actualChicks : computedChicks}
        speciesId={speciesId}
        locusOutcomes={locusOutcomes}
        chicksTitle={chicksTitle}
        nestNote={nestNote}
        emptyMessage={emptyMessage}
      />
    </ResultBlock>
  )
}

function parentAlleleLine(parent, alleles, fallback) {
  const sex = String(parent?.sex_label || parent?.sex || '').toLowerCase()
  const who = sex.includes('cock') || sex === 'male'
    ? 'Cock'
    : sex.includes('hen') || sex === 'female'
      ? 'Hen'
      : fallback
  return `${who} ${alleles || '—'}`
}

function FinalSystemOutputSection({
  pair,
  species,
  gica,
  gicaScore,
  probabilities,
  eggs,
  parentSnapshot,
  compact = false,
}) {
  const score = pair?.score ?? gicaScore ?? null
  const status = gicaStatusLabel(pair?.label || gica.label, score)
  const recommendation = pair?.recommendation || gica.recommendation || '—'
  const why = pair?.why || gica.why || { positives: [], warnings: [] }
  const breakdown = pair?.breakdown || gica.breakdown || []
  const risk = pair?.risk || gica.risk || null
  const diversity = pair?.diversity || gica.diversity || null
  const parent1 = pair?.parent_1 || species.parent_1 || {}
  const parent2 = pair?.parent_2 || species.parent_2 || {}

  const predictedRows = useMemo(() => {
    const source = (probabilities.complete_offspring || []).length
      ? probabilities.complete_offspring
      : eggs
    return sortByProbability(source).slice(0, 12)
  }, [probabilities.complete_offspring, eggs])

  const support = pair?.rbgia_support || {}

  return (
    <ResultBlock
      eyebrow="01 · The result"
      sectionId="final-output"
      showHeading={false}
    >
      <p className="thesis-thesis-line">
        This score says how well these two birds fit. The notes below say what raised it and what to watch.
      </p>

      <div className="thesis-final">
        <div className="thesis-primary">
          <CompatibilityScoreCard
            score={score}
            status={status}
            summary={pair?.summary || gica.summary || null}
            onGenerate={() => downloadBreedingReport({
              pair,
              species,
              gica,
              gicaScore: score,
              eggs,
              probabilities,
              recommendation,
            })}
          />
          <ParentBirdsCard
            parentSnapshot={parentSnapshot}
            parent1Fallback={parent1}
            parent2Fallback={parent2}
          />
        </div>

        <div className="thesis-report">
          <article className="thesis-report__card" aria-labelledby="thesis-why-title">
            <header className="thesis-report__head">
              <h3 className="thesis-report__title" id="thesis-why-title">Why this pair received this score</h3>
              <p className="thesis-report__subtitle">What helped, and what to watch.</p>
            </header>

            <section className="thesis-report__section" aria-labelledby="thesis-positive-title">
              <h4 className="thesis-report__section-title" id="thesis-positive-title">Positive Factors</h4>
              {(why.positives || []).length ? (
                <ul className="thesis-factors">
                  {why.positives.map((item) => {
                    const factor = splitFactor(item)
                    return (
                      <li key={`pos-${item}`} className="thesis-factor is-positive">
                        <span className="thesis-factor__icon" aria-hidden="true">✓</span>
                        <div>
                          <p className="thesis-factor__title">{factor.title}</p>
                          {factor.detail ? <p className="thesis-factor__detail">{factor.detail}</p> : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="thesis-report__empty">Nothing in the records raised this score.</p>
              )}
            </section>

            <section className="thesis-report__section" aria-labelledby="thesis-risk-title">
              <h4 className="thesis-report__section-title" id="thesis-risk-title">Risk / Consideration Factors</h4>
              {(why.warnings || []).length ? (
                <ul className="thesis-factors">
                  {why.warnings.map((item) => {
                    const factor = splitFactor(item)
                    return (
                      <li key={`warn-${item}`} className="thesis-factor is-warning">
                        <span className="thesis-factor__icon" aria-hidden="true">•</span>
                        <div>
                          <p className="thesis-factor__title">{factor.title}</p>
                          {factor.detail ? <p className="thesis-factor__detail">{factor.detail}</p> : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="thesis-report__empty">No significant risk factors identified from the available records.</p>
              )}
            </section>

            {breakdown.length ? (
              <section className="thesis-report__section" aria-labelledby="thesis-evidence-title">
                <h4 className="thesis-report__section-title" id="thesis-evidence-title">Where the points came from</h4>
                <dl className="thesis-evidence">
                  {breakdown.map((row) => {
                    const points = Number(row.points ?? row.contribution)
                    const max = Number(row.max_points)
                    return (
                      <div key={row.key || row.factor} className="thesis-evidence__row">
                        <dt>{row.factor}</dt>
                        <dd>
                          <span className="thesis-evidence__value">{evidenceValue(row.value)}</span>
                          {Number.isFinite(points) && Number.isFinite(max) ? (
                            <span className="thesis-evidence__points">{points} / {max} pts</span>
                          ) : null}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            ) : null}
          </article>
        </div>

        <article className="thesis-card thesis-gica-report">
          <div className="thesis-gica-report__main">
            <header className="gica-breakdown__head">
              <h3 className="gica-breakdown__title">Score breakdown</h3>
              <p className="gica-breakdown__subtitle">Each part of the 100 points.</p>
            </header>
            {breakdown.length ? (
              <ol className="gica-breakdown">
                {breakdown.map((row) => {
                  const points = Number(row.points ?? row.contribution)
                  const max = Number(row.max_points)
                  const scoreText = Number.isFinite(points)
                    ? `${points}${Number.isFinite(max) ? ` / ${max}` : ''}`
                    : null
                  const valueText = row.value != null && row.value !== '' ? evidenceValue(row.value) : null
                  return (
                    <li key={row.key || row.factor} className="gica-factor">
                      <p className="gica-factor__name">{row.factor}</p>
                      <p className="gica-factor__score">
                        {scoreText ? <strong>{scoreText}</strong> : null}
                        {scoreText && valueText ? <span aria-hidden="true"> · </span> : null}
                        {valueText ? <span>{valueText}</span> : null}
                        {!scoreText && !valueText ? '—' : null}
                      </p>
                      {row.detail ? <p className="gica-factor__description">{row.detail}</p> : null}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="compute-result__empty">No score breakdown was stored for this pair.</p>
            )}
            <p className="gica-breakdown__footnote">
              Final score: <strong>{score == null ? '—' : `${Math.round(score)} / 100`}</strong> · {status}
            </p>
          </div>

          <aside className="thesis-gica-report__side" aria-label="Genetic risk and diversity">
            <section className="genetic-card">
              <h3 className="genetic-card__title">Genetic Risk</h3>
              <p className={`genetic-card__value is-${String(risk?.level || 'none').toLowerCase()}`}>{risk?.level || '—'}</p>
              <p className="genetic-card__summary">{risk?.summary || 'No genetic risk was recorded for this pair.'}</p>
              {(risk?.affected || []).length ? (
                <section className="genetic-evidence">
                  <h4 className="genetic-evidence__title">Genes behind this risk</h4>
                  <ul className="genetic-evidence__list">
                    {risk.affected.slice(0, 6).map((item, index) => {
                      const share = item.fraction || (item.probability != null ? formatPercent(item.probability) : null)
                      const outcome = item.message || item.possible_offspring || item.type
                      return (
                        <li key={`risk-${index}`} className="genetic-evidence__item">
                          {item.locus ? <p className="genetic-evidence__locus">{locusLabel(item.locus)}</p> : null}
                          {outcome || share ? (
                            <p className="genetic-evidence__outcome">
                              {outcome ? <strong>{outcome}</strong> : null}
                              {outcome && share ? ' · ' : ''}
                              {share || ''}
                            </p>
                          ) : null}
                          {item.parent_1 || item.parent_2 ? (
                            <p className="genetic-evidence__parents">
                              {parentAlleleLine(parent1, item.parent_1, 'Bird 1')} × {parentAlleleLine(parent2, item.parent_2, 'Bird 2')}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : null}
            </section>
            <section className="genetic-card">
              <h3 className="genetic-card__title">Genetic Diversity</h3>
              <p className={`genetic-card__value is-${String(diversity?.level || 'none').toLowerCase()}`}>{diversity?.level || '—'}</p>
              <p className="genetic-card__summary">{diversity?.summary || 'No diversity note was recorded for this pair.'}</p>
              {(diversity?.loci || []).length ? (
                <section className="genetic-evidence">
                  <h4 className="genetic-evidence__title">Genes compared</h4>
                  <ul className="genetic-evidence__list genetic-evidence__list--compact">
                    {diversity.loci.slice(0, 6).map((item, index) => (
                      <li key={`div-${index}`} className="genetic-evidence__item">
                        <p className="genetic-evidence__locus">
                          {locusLabel(item.locus)}
                          {item.relationship ? <span className="genetic-evidence__tag">{item.relationship}</span> : null}
                        </p>
                        <p className="genetic-evidence__parents">
                          {parentAlleleLine(parent1, item.parent_1, 'Bird 1')} × {parentAlleleLine(parent2, item.parent_2, 'Bird 2')}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </section>
          </aside>
        </article>

        {compact ? null : (
        <>
        <article className="thesis-card">
          <p className="compute-result__eyebrow">RBGIA · supporting inheritance analysis</p>
          <h3>Rule-Based Inheritance Analysis</h3>
          <p className="thesis-card__summary">
            {support.message || 'Parent 1 + Parent 2 genetic contributions were crossed under documented inheritance rules to produce theoretical offspring outcomes that support the compatibility analysis.'}
          </p>
          <div className="thesis-flow">
            <div className="thesis-flow__node">Parent 1 genetic contribution</div>
            <div className="thesis-flow__arrow">+</div>
            <div className="thesis-flow__node">Parent 2 genetic contribution</div>
            <div className="thesis-flow__arrow">↓</div>
            <div className="thesis-flow__node">RBGIA genetic cross → possible offspring outcomes</div>
          </div>
          <div className="compute-dist-grid" style={{ marginTop: '0.85rem' }}>
            <DistributionPanel
              title="Sex Distribution"
              rows={predictedRows.length ? geneInheritanceRows(predictedRows, 'sex') : (support.sex || probabilities.sex)}
              nameResolver={(row) => sexLabel(row.sex, row.trait || row.sex_label)}
              unavailableReason={unavailableReasonFor(probabilities, 'chromosomal_sex')}
            />
            <DistributionPanel
              title="Base Color Distribution"
              rows={predictedRows.length ? geneInheritanceRows(predictedRows, 'base_color') : mendelianDistribution(probabilities.base_color, predictedRows, outcomeBaseColor, 'base_color')}
              unavailableReason={unavailableReasonFor(probabilities, 'base_color')}
            />
            <DistributionPanel
              title="Visual Mutation Distribution"
              rows={predictedRows.length ? geneInheritanceRows(predictedRows, 'visual_mutation') : mendelianDistribution(probabilities.visual_mutations, predictedRows, outcomeVisual, 'visual_mutation')}
              unavailableReason={unavailableReasonFor(probabilities, 'visual_mutation')}
            />
            <DistributionPanel
              title="Split / Hidden Gene Distribution"
              rows={cockSplitRows(predictedRows.length ? geneInheritanceRows(predictedRows, 'split_gene') : mendelianDistribution(probabilities.split_hidden_genes, predictedRows, outcomeSplit, 'split_gene'))}
              unavailableReason={unavailableReasonFor(probabilities, 'split_gene')}
            />
          </div>
        </article>

        <article className="thesis-card thesis-card--offspring">
          <header className="thesis-card__head">
            <div>
              <p className="compute-result__eyebrow">Complete offspring outcomes · evidence for compatibility</p>
              <h3>
                {predictedRows.length
                  ? `${predictedRows.length} Theoretical Genetic Outcome${predictedRows.length === 1 ? '' : 's'}`
                  : 'No theoretical offspring outcomes calculated'}
              </h3>
            </div>
          </header>
          {predictedRows.length ? (
            <div className="thesis-table-wrap">
              <table className="thesis-table">
                <thead>
                  <tr>
                    <th>Breeding outcome</th>
                    <th>Sex</th>
                    <th>Base Color</th>
                    <th>Visual Mutations</th>
                    <th>Split / Hidden</th>
                    <th>Passed from parents</th>
                    <th>Genotype</th>
                    <th>Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {predictedRows.map((row, index) => (
                    <tr key={`out-${index}-${row.genotype || chickTraitLabel(row)}`}>
                      <td>{breedingOutcome(row)}</td>
                      <td>{sexLabel(row.sex, row.sex_label)}</td>
                      <td>{outcomeBaseColor(row)}</td>
                      <td>{outcomeVisual(row)}</td>
                      <td>{outcomeSplit(row) || '—'}</td>
                      <td>{passedSummary(row.passed_from_parents, row)}</td>
                      <td><span className="thesis-table__geno">{displayText(row.genotype)}</span></td>
                      <td>{formatPercent(row) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="compute-result__empty">
              Calculation unavailable. Reason: Joint offspring outcomes could not be assembled from the parental genotypes.
            </p>
          )}
          <p className="thesis-card__footnote">
            These are theoretical RBGIA genotype/phenotype combinations used as supporting evidence for GICA. They are not a guaranteed clutch sequence.
          </p>
        </article>
        </>
        )}
      </div>
    </ResultBlock>
  )
}

function ComputationalFlowSection({
  pair,
  gica,
  gicaScore,
  rbgiaTrace,
  algorithm,
  parentSnapshot,
}) {
  const method = algorithm?.method || 'AGAPORA-RBGIA-GICA-v3'
  const loci = rbgiaTrace?.loci?.length ?? algorithm?.loci_processed ?? '—'
  const outcomes = rbgiaTrace?.summary?.totalOutcomes ?? '—'
  const status = gicaStatusLabel(pair?.label || gica?.label, gicaScore)
  const parent1 = parentSnapshot?.parent_1?.bird_id || pair?.parent_1?.bird_id || 'Parent 1'
  const parent2 = parentSnapshot?.parent_2?.bird_id || pair?.parent_2?.bird_id || 'Parent 2'

  const featuredLocus = rbgiaTrace?.loci?.find((locus) => locus.square?.valid) || rbgiaTrace?.loci?.[0] || null
  const appearanceRows = (rbgiaTrace?.appearanceOutcomes || []).map((row) => ({
    ...row,
    trait: row.label,
    probability: row.probability,
    fraction: row.fraction,
  }))

  return (
    <ResultBlock
      title="The path from the two birds to the score"
      eyebrow="02 · RBGIA passes the genes, then GICA scores the pair"
      sectionId="flow"
      showNote={false}
    >
      <ol className="algo-process" aria-label="Algorithm process for this pair">
        <li>
          <span className="algo-process__n">1</span>
          <div>
            <p className="algo-process__label">Encode the pair</p>
            <p><strong>{parent1}</strong> × <strong>{parent2}</strong>. Phenotype, genotype, visual mutations, and known splits are read from stored records.</p>
            <p className="algo-process__why">Why: later steps cannot invent a genotype that was never stored.</p>
          </div>
        </li>
        <li>
          <span className="algo-process__n">2</span>
          <div>
            <p className="algo-process__label">Translate alleles</p>
            <p>Each stored code is read as normal (+) or mutation. W means no gene on that side.</p>
            <p className="algo-process__why">Why: the Punnett square needs symbols, not only the color name a breeder sees.</p>
          </div>
        </li>
        <li>
          <span className="algo-process__n">3</span>
          <div>
            <p className="algo-process__label">Build gametes</p>
            <p>Each parent passes one allele per gene. Heterozygotes split 50 / 50. Sex-linked genes follow the Z chromosome.</p>
            <p className="algo-process__why">Why: this is the Law of Segregation, including chromosomal sex-linkage.</p>
          </div>
        </li>
        <li>
          <span className="algo-process__n">4</span>
          <div>
            <p className="algo-process__label">Punnett square</p>
            <p>Every cock allele is crossed with every hen allele. Method {method}.</p>
            <p className="algo-process__why">Why: the same parents must always fill the same boxes. That is the determinism check.</p>
          </div>
        </li>
        <li>
          <span className="algo-process__n">5</span>
          <div>
            <p className="algo-process__label">Count gene odds</p>
            <p>{loci} genes · {outcomes} chick genotypes. Visible looks and hidden splits are totaled from those boxes.</p>
            <p className="algo-process__why">Why: GICA needs probabilities. It does not roll a random clutch and call that the inheritance.</p>
          </div>
        </li>
        <li>
          <span className="algo-process__n">6</span>
          <div>
            <p className="algo-process__label">Weight the pair</p>
            <p>{gicaScore == null ? '—' : `${Math.round(gicaScore)} / 100`} · {status}. Desirable traits, recessive risk, diversity, and mutation load, plus species fit and breeding constraints.</p>
            <p className="algo-process__why">Why: one score has to show which factor gave or withheld points. RBGIA fractions stay unchanged.</p>
          </div>
        </li>
        <li>
          <span className="algo-process__n">7</span>
          <div>
            <p className="algo-process__label">Forecast eggs and hatchlings</p>
            <p>The species clutch range is adjusted by the score, diversity, and genetic load. Hatchlings apply the stored hatch rate.</p>
            <p className="algo-process__why">Why: clutch size is not a fixed number of chicks. The forecast is an estimate, not a promised nest.</p>
          </div>
        </li>
      </ol>

      <div className="gx-table-wrap">
        <table className="gx-table compute-flow-table">
          <caption className="gx-visually-hidden">Computational components used on this result</caption>
          <thead>
            <tr>
              <th scope="col">Engine</th>
              <th scope="col">What it does</th>
              <th scope="col">Kind</th>
              <th scope="col">This pair</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Framework</th>
              <td>Evaluates the selected pairing</td>
              <td>Single-pair run · {method}</td>
              <td>{parent1} × {parent2}</td>
            </tr>
            <tr>
              <th scope="row">RBGIA</th>
              <td>Walks inheritance for every stored gene</td>
              <td>Rule-based, same input → same odds</td>
              <td>{loci} genes · {outcomes} chick genotypes</td>
            </tr>
            <tr>
              <th scope="row">GICA</th>
              <td>Scores whether the pair should be bred</td>
              <td>Weighted 0–100 index</td>
              <td>{gicaScore == null ? '—' : `${Math.round(gicaScore)} / 100`} · {status}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {rbgiaTrace?.loci?.length ? <AlleleTranslation loci={rbgiaTrace.loci} title="Allele translation for this pair" /> : null}

      {featuredLocus?.square?.valid ? (
        <div className="algo-punnett">
          <header>
            <p className="compute-result__eyebrow">Featured Punnett square</p>
            <h3>{featuredLocus.name}</h3>
            <p>Cock alleles down the side. Hen alleles across the top. Each box is one possible chick at this gene.</p>
          </header>
          <PunnettSquare locus={featuredLocus} />
        </div>
      ) : null}

      {appearanceRows.length ? (
        <DistributionPanel
          title="Visible gene distribution"
          rows={appearanceRows}
          nameResolver={(row) => row.label || row.trait}
        />
      ) : null}

      <p className="compute-read">
        {pair?.recommendation || gica?.recommendation || 'Open Pair result for the full GICA recommendation, or Punnett walk for every gene.'}
      </p>
    </ResultBlock>
  )
}

function CombinedComplexitySection({ report }) {
  const [mode, setMode] = useState('time')
  return (
    <div className="compute-complexity-wrap">
      <div className="compute-result__switch compute-complexity-switch" role="tablist" aria-label="Complexity measure">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'time'}
          className={`compute-result__tab${mode === 'time' ? ' is-active' : ''}`}
          onClick={() => setMode('time')}
        >
          Time
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'space'}
          className={`compute-result__tab${mode === 'space' ? ' is-active' : ''}`}
          onClick={() => setMode('space')}
        >
          Space
        </button>
      </div>
      <ComplexitySection mode={mode} report={report} proves={getSection('complexity')?.proves} />
    </div>
  )
}

function CompatibilitySection({ result }) {
  const presentation = result?.result_presentation || {}
  const model = useMemo(
    () => buildCompatibilityModel(presentation.gica || {}, presentation.species_compatibility || {}),
    [presentation.gica, presentation.species_compatibility],
  )

  return (
    <ResultBlock
      title="The two birds"
      eyebrow="03 · Saved birds"
      sectionId="compatibility"
      showNote={false}
    >
      <div className="gx-module compute-chapter">
        <SpeciesCompatibilityPanel species={model.species} />
        <h3>Saved on each bird</h3>
        <p className="compute-read">
          Color, mutations, and hidden genes from the saved record. A blank field stays blank.
        </p>
        <ParentGeneticProfile snapshot={result?.parent_snapshot} species={model.species} />
        <PedigreeAccuracy pedigree={presentation.pedigree} />
      </div>
    </ResultBlock>
  )
}

function PedigreeAccuracy({ pedigree }) {
  const applied = pedigree?.applied || []
  const possible = pedigree?.possible || []
  if (!applied.length && !possible.length) return null

  return (
    <section className="pair-group">
      <h3>Grandparents in this calculation</h3>
      <p className="compute-read">
        A proven gene is added in full. A possible gene changes the offspring odds only by its smaller chance.
      </p>
      <ul className="pair-genes">
        {applied.map((item) => (
          <li key={`applied-${item.bird_id}-${item.gene}`}>
            <strong>{item.gene}</strong>
            <span>{item.message}</span>
          </li>
        ))}
        {possible.map((item) => (
          <li key={`possible-${item.bird_id}-${item.gene}`}>
            <strong>{item.gene} possible</strong>
            <span>{item.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function GicaSection({ result, gica, gicaScore, rbgiaTrace }) {
  const presentation = result?.result_presentation || {}
  const model = useMemo(
    () => buildCompatibilityModel(gica || {}, presentation.species_compatibility || {}),
    [gica, presentation.species_compatibility],
  )
  const trace = rbgiaTrace

  return (
    <ResultBlock
      title="How the score is built"
      eyebrow="06 · GICA weights the RBGIA odds"
      sectionId="gica"
    >
      <LessonCue
        why="A list of possible chicks does not, by itself, say the pair is a wise match. The score gathers those chances into one recommendation."
        how="Desirable traits, recessive risk, diversity, mutation load, species fit, and breeding limits each have a fixed maximum. Points earned out of that maximum are added to a score from 0 to 100. The Punnett fractions stay the same."
      />
      <dl className="compute-glossary">
        <div>
          <dt>Weighted combination</dt>
          <dd>
            Species, inheritance information, mutation compatibility, genetic risk, genetic diversity, and breeding constraints.
            Stored engine score: {gicaScore == null ? '—' : `${gicaScore} / 100`}.
          </dd>
        </div>
        <div>
          <dt>Relationship to RBGIA</dt>
          <dd>RBGIA supplies offspring odds as supporting evidence. GICA does not change those fractions, invent genotypes, or replace the inheritance engine.</dd>
        </div>
      </dl>
      <div className="gx-module compute-chapter">
        <CompatibilitySummary
          model={model}
          rbgiaSummary={trace ? { ...trace.summary, lociTotal: trace.loci.length } : null}
        />
        <h3>How the 100 points are awarded</h3>
        <WeightedFormula model={model} />
        <h3>Factor-by-factor proof</h3>
        <p className="compute-read">
          Each factor below is taken from the stored breakdown. The client only presents the formula; it does not re-score the pair.
        </p>
        <ScoreBreakdown model={model} trace={trace} />
      </div>
    </ResultBlock>
  )
}

function SplitCarrierHomozygousList({ loci }) {
  const rows = (loci || []).filter((locus) => locus?.carrierHomozygous)
  if (!rows.length) return null

  return (
    <div className="compute-dist-panel">
      <header className="compute-dist-panel__head">
        <div>
          <p className="compute-dist-panel__kicker">Mendelian split carriers</p>
          <h3>Visual homozygous from heterozygous carriers</h3>
        </div>
      </header>
      <ul className="compute-prob-list">
        {rows.map((locus) => {
          const chance = locus.carrierHomozygous
          return (
            <li key={locus.key} className="compute-prob-row">
              <div className="compute-prob-row__head">
                <span className="compute-prob-row__name">{locus.name}</span>
                <span className="compute-prob-row__pct">{percentText(chance.probability)}</span>
              </div>
              <p className="compute-prob-row__genotype">{chance.formula}</p>
              <p className="compute-prob-row__fraction">{chance.statement}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GeneticDistributionSection({ probabilities, eggs, exampleNote, rbgiaTrace }) {
  const phenotypeRows = (probabilities.phenotype || []).length
    ? probabilities.phenotype
    : eggs.map((egg) => ({
      phenotype: egg.phenotype,
      genotype: egg.genotype,
      sex: egg.sex,
      probability: egg.probability,
      fraction: egg.probability?.fraction,
      count: egg.probability?.count,
      trait: egg.trait_name || egg.base_color,
    }))

  const complete = (probabilities.complete_offspring || []).length
    ? probabilities.complete_offspring
    : eggs.map((egg) => ({
      sex: egg.sex,
      sex_label: egg.sex_label,
      base_color: egg.base_color,
      base_color_genotype: egg.base_color_genotype,
      visual_mutations: egg.visual_mutations,
      split_hidden_genes: egg.split_hidden_genes || egg.split_genes,
      passed_from_parents: egg.passed_from_parents,
      genotype: egg.genotype_display || egg.genotype,
      phenotype: egg.phenotype,
      probability: egg.probability?.probability ?? egg.probability,
      fraction: egg.probability?.fraction,
    }))

  const unavailableFor = (category) => {
    const hit = (probabilities.unavailable || []).find((item) => item.category === category)
    return hit?.reason || null
  }
  const sexRows = complete.length ? geneInheritanceRows(complete, 'sex') : (probabilities.sex || [])
  const baseRows = complete.length ? geneInheritanceRows(complete, 'base_color') : mendelianDistribution(probabilities.base_color, complete, outcomeBaseColor, 'base_color')
  const visualRows = complete.length ? geneInheritanceRows(complete, 'visual_mutation') : mendelianDistribution(probabilities.visual_mutations, complete, outcomeVisual, 'visual_mutation')
  const splitRows = cockSplitRows(complete.length ? geneInheritanceRows(complete, 'split_gene') : mendelianDistribution(probabilities.split_hidden_genes, complete, outcomeSplit, 'split_gene'))
  const boardProbabilities = {
    ...probabilities,
    base_color: baseRows,
    visual_mutations: visualRows,
    split_hidden_genes: splitRows,
  }

  return (
    <ResultBlock title="Chicks this pair can produce" eyebrow="05 · RBGIA odds, after the squares" sectionId="distribution">
      <LessonCue
        why="Breeders want to know what a chick might look like, and what it might hide. A hidden split can still be passed to the next generation."
        how="Each graph is one gene: sex, base color, a visual mutation, or a split. A full chick card multiplies those genes together, so its share is smaller than a single gene’s bar."
      />
      <SplitCarrierHomozygousList loci={rbgiaTrace?.loci} />
      <PairInheritanceBoard trace={rbgiaTrace} probabilities={boardProbabilities} />
      {probabilities.message ? <p className="compute-result__empty">{probabilities.message}</p> : null}
      <p className="compute-dist-legend">
        These four graphs are not the same list. Sex, base color, and the visual look are each their own chance. The split graph counts cocks only. Each hidden gene a cock carries has its own chance, so a split on every cock is not drawn as another 12.5% bar.
        {exampleNote ? ` ${exampleNote}` : ''}
      </p>
      <div className="compute-dist-grid">
        <DistributionPanel
          title="Sex Distribution"
          rows={sexRows}
          nameResolver={(row) => sexLabel(row.sex, row.trait || row.sex_label)}
          unavailableReason={unavailableFor('chromosomal_sex')}
        />
        <DistributionPanel
          title="Base Color Distribution"
          rows={baseRows}
          unavailableReason={unavailableFor('base_color')}
        />
        <DistributionPanel
          title="Visual Mutation Distribution"
          rows={visualRows}
          unavailableReason={unavailableFor('visual_mutation')}
        />
        <DistributionPanel
          title="Split / Hidden Gene Distribution"
          rows={splitRows}
          unavailableReason={unavailableFor('split_gene')}
        />
      </div>

      <h3 className="compute-dist-complete-title">Every calculated chick type</h3>
      <p className="compute-dist-legend">
        Each card is a different chick: look, sex, then hidden splits. When sex, base color, and a visual gene each divide in half, every full combination has the same chance. The bar on each card uses its own color so the chicks stay distinct. The graphs above are the ones whose chances differ.
      </p>
      {(complete || []).length ? (
        <div className="compute-dist-complete-grid">
          {complete.map((row, index) => {
            const pct = toPercent(row)
            return (
              <article key={`complete-${row.genotype || index}-${pct}`} className="compute-dist-complete-card">
                <header>
                  <h4>{breedingOutcome(row)}</h4>
                  <span>{formatPercent(pct) || '—'}</span>
                </header>
                <dl className="compute-result__facts">
                  <div><dt>Sex</dt><dd>{sexLabel(row.sex, row.sex_label)}</dd></div>
                  <div><dt>Base Color</dt><dd>{outcomeBaseColor(row)}</dd></div>
                  <div><dt>Visual Mutations</dt><dd>{outcomeVisual(row)}</dd></div>
                  {outcomeSplit(row) ? <div><dt>Split / Hidden Genes</dt><dd>{outcomeSplit(row)}</dd></div> : null}
                  <div><dt>Passed from parents</dt><dd>{passedSummary(row.passed_from_parents, row)}</dd></div>
                  <div><dt>Genotype</dt><dd>{displayText(row.genotype)}</dd></div>
                  <div><dt>Means</dt><dd>{translateGenotype(row.genotype, row.base_color)}</dd></div>
                  <div><dt>Phenotype</dt><dd>{displayText(row.phenotype)}</dd></div>
                </dl>
                <PhenotypeMap source={row} />
                <ProgressBar percent={pct} color={barColor('', index)} />
                {row.fraction ? <p className="compute-prob-row__fraction">{row.fraction}</p> : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="compute-result__empty">
          Calculation unavailable. Reason: Joint offspring outcomes could not be assembled from the parental genotypes.
        </p>
      )}

      {sameChance(probabilities.genotype) && sameChance(phenotypeRows) ? null : (
        <div className="compute-dist-grid" style={{ marginTop: '1rem' }}>
          {sameChance(probabilities.genotype) ? null : (
            <DistributionPanel
              title="Genotype Distribution"
              rows={probabilities.genotype}
              nameResolver={(row) => row.genotype || rowName(row)}
            />
          )}
          {sameChance(phenotypeRows) ? null : (
            <DistributionPanel
              title="Phenotype Distribution"
              rows={phenotypeRows}
              nameResolver={(row) => row.phenotype || row.trait || row.genotype || rowName(row)}
            />
          )}
        </div>
      )}
    </ResultBlock>
  )
}

function ForecastSection({ forecast, eggs, clutchSimulation }) {
  return (
    <ResultBlock
      title="Eggs and hatchlings"
      eyebrow="07 · One possible nest"
      sectionId="forecast"
      showNote={false}
    >
      <ClutchSimulationPanel simulation={clutchSimulation} eggs={eggs} />
      {!clutchSimulation && forecast.note ? <p className="compute-result__empty">{forecast.note}</p> : null}
    </ResultBlock>
  )
}

function InheritanceSection({ inherited, report, rbgiaTrace, probabilities = {} }) {
  const parent1Badges = parseTraitBadges(inherited.traits_from_parent_1)
  const parent2Badges = parseTraitBadges(inherited.traits_from_parent_2)
  const trace = rbgiaTrace

  return (
    <ResultBlock
      title="How each gene is passed"
      eyebrow="04 · RBGIA, Mendel’s rules, and the Punnett square"
      sectionId="inheritance"
      showNote={false}
    >
      <MendelianPrimer />
      <GeneActionBoard loci={trace?.loci} />
      <PairInheritanceBoard trace={trace} probabilities={probabilities} title="Parent alleles → chick odds" />
      {trace?.loci?.length ? <AlleleTranslation loci={trace.loci} title="Allele translation" /> : null}
      <div className="compute-inherit-flow">
        <article className="compute-inherit-card">
          <h3>From parent 1</h3>
          <TraitGroups badges={parent1Badges} />
        </article>

        <div className="compute-inherit-arrow" aria-hidden="true">↓</div>

        <article className="compute-inherit-card">
          <h3>From parent 2</h3>
          <TraitGroups badges={parent2Badges} />
        </article>

        <div className="compute-inherit-arrow" aria-hidden="true">↓</div>

        <article className="compute-inherit-card compute-inherit-card--offspring">
          <h3>What chicks can inherit</h3>
          <dl className="inherit-lines">
            <div>
              <dt>Color</dt>
              <dd>{plainColorName(inherited.base_color_inheritance?.name || report.most_likely_base_color) || 'Not calculated'}</dd>
            </div>
            <div>
              <dt>Shows</dt>
              <dd>{joinNames((inherited.mutation_inheritance || []).map((item) => item.name))}</dd>
            </div>
            <div>
              <dt>Hides</dt>
              <dd>{joinNames(inherited.recessive_traits_carried)}</dd>
            </div>
          </dl>
          <p className="inherit-lines__note">A gene in both lists can show on some chicks and stay hidden on others. Each square below gives that chance.</p>

          {inherited.base_color_inheritance?.results?.length ? (
            <DistributionPanel
              title="Color odds"
              showCode={false}
              rows={inherited.base_color_inheritance.results.map((row) => ({
                ...row,
                trait: colorOutcomeLabel(row),
              }))}
            />
          ) : null}
        </article>
      </div>

      {(inherited.sex_linked_inheritance || []).length ? (
        <>
          <h3>Sex-linked inheritance</h3>
          <div className="compute-badge-wrap">
            {inherited.sex_linked_inheritance.map((item) => (
              <span key={item.name} className="compute-result__badge is-warning">
                {item.name} · {item.inheritance_type}
              </span>
            ))}
          </div>
        </>
      ) : null}

      <p className="compute-result__empty" style={{ marginTop: '0.75rem' }}>
        {inherited.overall_genetic_interpretation || '—'}
      </p>

      {trace?.loci?.length ? (
        <div className="gx-module compute-chapter">
          <h3>Every gene · Punnett square and odds</h3>
          <RbgiaPipeline loci={trace.loci} />
          <h3>RBGIA summary for this pair</h3>
          <RbgiaSummary trace={trace} />
        </div>
      ) : (
        <p className="compute-result__empty">
          No per-locus RBGIA trace was stored for this result, so Punnett squares cannot be shown without inventing genotypes.
        </p>
      )}
    </ResultBlock>
  )
}

function NonLivingEggCard({ egg }) {
  const label = egg.egg_status_label || eggStatusShort(egg.egg_status)
  return (
    <article className={`compute-result__egg-card is-nonliving is-${egg.egg_status}`}>
      <header className="compute-result__egg-head">
        <div>
          <p className="compute-result__eyebrow">{`Egg ${egg.egg_number}`}</p>
          <h3>{label}</h3>
        </div>
        <StatusPill tone={eggStatusTone(egg.egg_status)}>{eggStatusShort(egg.egg_status, label)}</StatusPill>
      </header>
      <p className="compute-prob-row__fraction">This egg does not become a chick, so no color or genes are assigned to it.</p>
    </article>
  )
}

function EggChickCard({ egg, locusOutcomes, speciesId }) {
  if (!isLivingEgg(egg)) return <NonLivingEggCard egg={egg} />
  return <LivingChickCard egg={egg} locusOutcomes={locusOutcomes} speciesId={speciesId} />
}

function showsLabel(egg) {
  const text = outcomeVisual(egg)
  return text === 'Wild Type' ? 'None' : text
}

function hidesLabel(egg) {
  const text = outcomeSplit(egg)
  if (text) return text
  return inheritsSplitGenes(egg) ? 'None' : 'None. A hen is not listed as split.'
}

function chickShare(egg) {
  const pct = formatPercent(toPercent(egg.probability))
  const fraction = egg.probability?.fraction
  if (fraction && pct) return `${fraction} of chicks · ${pct}`
  return fraction || pct || null
}

function chickPlainReason(egg) {
  const look = breedingOutcome(chickFacts(egg))
  const share = egg.probability?.fraction
  const shareSentence = share ? ` The gene chart gives this look to ${share} of chicks.` : ''
  const hideSentence = inheritsSplitGenes(egg) ? '' : ' Hidden genes are listed on the cock only.'
  return `${look}.${shareSentence} Egg ${egg.egg_number} is one draw of that result.${hideSentence}`
}

function LivingChickCard({ egg, locusOutcomes, speciesId }) {
  const facts = chickFacts(egg)
  const share = chickShare(egg)

  return (
    <article className="compute-result__egg-card">
      <header className="compute-result__egg-head">
        <div>
          <p className="compute-result__eyebrow">{`Egg ${egg.egg_number} · living chick`}</p>
          <h3>{chickTraitLabel(egg)}</h3>
        </div>
        {egg.egg_status ? <StatusPill tone={eggStatusTone(egg.egg_status)}>{eggStatusShort(egg.egg_status, egg.egg_status_label)}</StatusPill> : null}
      </header>
      <div className="compute-result__egg-body is-chick">
        <EggMutationMedia
          names={facts.visual_mutations}
          species={facts.species || speciesId}
          baseColor={outcomeBaseColor(facts)}
        />
        <div className="compute-result__egg-copy">
          <dl className="compute-result__facts">
            <div><dt>Sex</dt><dd>{sexLabel(egg.sex, egg.sex_label || egg.collected_traits?.sex)}</dd></div>
            <div><dt>Color</dt><dd>{outcomeBaseColor(facts)}</dd></div>
            <div><dt>Shows</dt><dd>{showsLabel(facts)}</dd></div>
            <div><dt>Hides</dt><dd>{hidesLabel(facts)}</dd></div>
            <div><dt>Species</dt><dd>{speciesLabel(egg.collected_traits?.species || egg.species)}</dd></div>
            <div><dt>Genotype</dt><dd>{displayText(egg.genotype_display || egg.genotype)}</dd></div>
          </dl>
          {share ? (
            <div className="compute-prob-row">
              <div className="compute-prob-row__head">
                <span className="compute-prob-row__name">This look in the gene chart</span>
                <span className="compute-prob-row__pct">{share}</span>
              </div>
              <ProgressBar percent={toPercent(egg.probability)} tone="info" />
            </div>
          ) : null}
          <p className="compute-result__egg-reason">{chickPlainReason(egg)}</p>
        </div>
      </div>
      <details className="compute-result__egg-more">
        <summary>Alleles and color</summary>
        <EggInheritance egg={facts} locusOutcomes={locusOutcomes} />
        <PhenotypeMap source={egg} />
      </details>
    </article>
  )
}

function LessonPanel({ id, activeId, children }) {
  return (
    <div hidden={id !== activeId}>
      {children}
    </div>
  )
}

function LessonChapters({
  activeId = 'overview',
  result,
  pair,
  species,
  gica,
  gicaScore,
  rbgiaTrace,
  algorithm,
  probabilities,
  eggs,
  livingEggs,
  forecast,
  clutchSimulation,
  inherited,
  report,
  complexityReport,
  speciesId,
  locusOutcomes,
  actualBreed,
  computedEggCount,
  chickTypes,
  onActualBreedChange,
}) {
  return (
    <>
      <LessonPanel id="overview" activeId={activeId}>
        <OverviewSection
          pair={pair}
          species={species}
          eggs={livingEggs}
          parentSnapshot={result?.parent_snapshot}
          speciesId={speciesId}
          locusOutcomes={locusOutcomes}
          actualBreed={actualBreed}
          computedEggCount={computedEggCount}
          chickTypes={chickTypes}
          onActualBreedChange={onActualBreedChange}
        />
      </LessonPanel>
      <LessonPanel id="final-output" activeId={activeId}>
        <FinalSystemOutputSection
          pair={pair}
          species={species}
          gica={gica}
          gicaScore={gicaScore}
          probabilities={probabilities}
          eggs={livingEggs}
          parentSnapshot={result?.parent_snapshot}
          compact
        />
      </LessonPanel>
      <LessonPanel id="flow" activeId={activeId}>
        <ComputationalFlowSection
          pair={pair}
          gica={gica}
          gicaScore={gicaScore}
          rbgiaTrace={rbgiaTrace}
          algorithm={algorithm}
          parentSnapshot={result?.parent_snapshot}
        />
      </LessonPanel>
      <LessonPanel id="compatibility" activeId={activeId}>
        <CompatibilitySection result={result} />
      </LessonPanel>
      <LessonPanel id="inheritance" activeId={activeId}>
        <InheritanceSection
          inherited={inherited}
          report={report}
          rbgiaTrace={rbgiaTrace}
          probabilities={probabilities}
        />
      </LessonPanel>
      <LessonPanel id="distribution" activeId={activeId}>
        <GeneticDistributionSection
          probabilities={probabilities}
          eggs={livingEggs}
          exampleNote={result?.result_presentation?.example_outcomes_note}
          rbgiaTrace={rbgiaTrace}
        />
      </LessonPanel>
      <LessonPanel id="gica" activeId={activeId}>
        <GicaSection result={result} gica={gica} gicaScore={gicaScore} rbgiaTrace={rbgiaTrace} />
      </LessonPanel>
      <LessonPanel id="forecast" activeId={activeId}>
        <ForecastSection forecast={forecast} eggs={eggs} clutchSimulation={clutchSimulation} />
      </LessonPanel>
      {complexityReport ? (
        <LessonPanel id="complexity" activeId={activeId}>
          <div id="process-complexity" className="compute-process__anchor">
            <CombinedComplexitySection report={complexityReport} />
          </div>
        </LessonPanel>
      ) : null}
    </>
  )
}

export default function ComputationResult({ resultId, sectionId }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [area, setArea] = useState('dashboard')
  const [headToTailCatalog, setHeadToTailCatalog] = useState(null)
  const [actualBreed, setActualBreed] = useState(() => loadActualBreed(resultId))

  const activeSection = resolveSection(sectionId) || RESULT_SECTIONS[0].id

  const handleSectionChange = useCallback((nextSection) => {
    const resolved = resolveSection(nextSection)
    if (!resolved) return
    const nextHash = sectionHash(resultId, resolved).replace(/^#/, '')
    if (window.location.hash.replace(/^#/, '') !== nextHash) {
      window.location.hash = nextHash
    }
  }, [resultId])

  useEffect(() => {
    setActualBreed(loadActualBreed(resultId))
  }, [resultId])

  const handleActualBreedChange = useCallback((next) => {
    setActualBreed(next)
    saveActualBreed(resultId, next)
  }, [resultId])

  useEffect(() => {
    let active = true
    setResult(null)
    setError('')
    setArea('dashboard')
    api
      .get(`/computation-results/${resultId}`)
      .then((response) => {
        if (active) setResult(response.data?.data || null)
      })
      .catch(() => {
        if (active) setError('This computation result could not be loaded.')
      })
    getCatalog('/head-to-tail-phenotypes')
      .then((response) => {
        if (active) setHeadToTailCatalog(response.data?.data || null)
      })
      .catch(() => {
        if (active) setHeadToTailCatalog(null)
      })
    return () => {
      active = false
    }
  }, [resultId])

  const presentation = result?.result_presentation || {}
  const species = presentation.species_compatibility || {}
  const gica = presentation.gica || {}
  const pair = presentation.pair_compatibility || {}
  const probabilities = presentation.probabilities || {}
  const forecast = presentation.reproductive_forecast || {}
  const speciesId = useMemo(() => resultSpeciesId(result, presentation), [result, presentation])
  const eggs = useMemo(() => {
    const raw = [...(presentation.egg_chick_examples || result?.egg_outcomes || [])]
      .sort((a, b) => Number(a.egg_number) - Number(b.egg_number))
    if (!headToTailCatalog) return raw
    return raw.map((egg) => attachHeadToTail(egg, headToTailCatalog, speciesId))
  }, [presentation.egg_chick_examples, result?.egg_outcomes, headToTailCatalog, speciesId])
  const enrichedProbabilities = useMemo(() => {
    if (!headToTailCatalog || !probabilities.complete_offspring) return probabilities
    return {
      ...probabilities,
      complete_offspring: probabilities.complete_offspring.map((row) => attachHeadToTail(row, headToTailCatalog, speciesId)),
    }
  }, [probabilities, headToTailCatalog, speciesId])
  const clutchSimulation = presentation.clutch_simulation || null
  const livingEggs = useMemo(() => eggs.filter(isLivingEgg), [eggs])
  const chickTypes = useMemo(() => {
    const complete = enrichedProbabilities.complete_offspring
    return complete?.length ? complete : livingEggs
  }, [enrichedProbabilities.complete_offspring, livingEggs])
  const computedEggCount = eggs.length || Number(clutchSimulation?.clutch_size) || 0
  const showingActual = actualBreed.saved === true
  const recordedSlots = useMemo(
    () => resolveSlots(savedClutchRecord(actualBreed), actualBreed.savedEggCount ?? 0),
    [actualBreed],
  )
  const recordedEggs = useMemo(
    () => (showingActual ? slotsToEggs(recordedSlots, chickTypes) : eggs),
    [showingActual, recordedSlots, chickTypes, eggs],
  )
  const inherited = presentation.inherited_traits || {}
  const report = presentation.report || {}
  const algorithm = presentation.algorithm || {}

  const gicaScore = typeof gica.score === 'number' ? gica.score : (typeof pair.score === 'number' ? pair.score : null)
  const rbgiaTrace = useMemo(() => (result ? buildRbgiaTrace(result) : null), [result])
  const complexityReport = useMemo(
    () => (result ? buildComplexityReport(result, rbgiaTrace) : null),
    [result, rbgiaTrace],
  )

  return (
    <main className="breed compute-result">
      <div className="breed__shell compute-result__shell">
        <header className="compute-result__header">
          <div>
            <p className="compute-result__eyebrow">Breeding complete</p>
            <h1>Lovebird pair compatibility</h1>
            <p className="compute-result__lede">
              {area === 'eggs'
                ? (showingActual
                  ? 'The eggs below are the clutch you recorded. A chosen chick shows that calculated bird. An egg that did not hatch stays blank.'
                  : 'One possible nest, egg by egg. A hatched chick shows sex, color, and hidden genes. An egg that fails is left blank.')
                : 'Start with the score. Use the outline to open one part at a time: how the genes pass, then why the score landed there.'}
            </p>
          </div>
          {result ? (
            <div className="compute-result__switch" role="tablist" aria-label="Result areas">
              <button
                type="button"
                role="tab"
                aria-selected={area === 'dashboard'}
                className={`compute-result__tab${area === 'dashboard' ? ' is-active' : ''}`}
                onClick={() => setArea('dashboard')}
              >
                Learn this pair
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={area === 'eggs'}
                className={`compute-result__tab${area === 'eggs' ? ' is-active' : ''}`}
                onClick={() => setArea('eggs')}
              >
                Eggs and chicks{recordedEggs.length ? ` (${recordedEggs.length}${!showingActual && clutchSimulation ? ` eggs · ${livingEggs.length} chicks` : ''})` : ''}
              </button>
            </div>
          ) : null}
        </header>

        {error ? <p className="breed__alert">{error}</p> : null}
        {!result && !error ? <p className="compute-result__empty">Loading computation result…</p> : null}

        {result && area === 'dashboard' ? (
          <BreedingLesson
            activeId={activeSection}
            onJump={handleSectionChange}
          >
            <LessonChapters
              activeId={activeSection}
              result={result}
              pair={pair}
              species={species}
              gica={gica}
              gicaScore={gicaScore}
              rbgiaTrace={rbgiaTrace}
              algorithm={algorithm}
              probabilities={enrichedProbabilities}
              eggs={eggs}
              livingEggs={livingEggs}
              forecast={forecast}
              clutchSimulation={clutchSimulation}
              inherited={inherited}
              report={report}
              complexityReport={complexityReport}
              speciesId={speciesId}
              locusOutcomes={presentation.genetic_analysis?.outcomes}
              actualBreed={actualBreed}
              computedEggCount={computedEggCount}
              chickTypes={chickTypes}
              onActualBreedChange={handleActualBreedChange}
            />
          </BreedingLesson>
        ) : null}

        {result && area === 'eggs' ? (
          <div className="compute-result__stack" role="tabpanel">
            <ResultBlock title="Eggs and chicks" eyebrow="In nest order">
              <LessonCue
                why={showingActual
                  ? 'These eggs are the clutch you recorded on Overview. Each hatched egg uses the calculated chick you selected.'
                  : 'This page is one possible nest. The gene chart says how often each look can appear. An egg that fails is left blank: no color and no genotype.'}
                how={showingActual
                  ? 'Change the egg count and the chosen birds from the Overview switch. Eggs stay in the order you recorded.'
                  : 'Eggs stay in lay order. A hatched chick shows sex, color, what you can see, and what a cock can hide. The fraction is that look’s share of all chicks.'}
              />
              {showingActual ? null : <ClutchSimulationPanel simulation={clutchSimulation} eggs={eggs} />}
              {recordedEggs.length ? (
                <div className="compute-result__egg-grid">
                  <h3 className="compute-result__egg-grid-title">
                    {showingActual ? 'Recorded eggs' : 'What each hatched chick inherited'}
                  </h3>
                  {recordedEggs.map((egg, index) => (
                    egg.unassigned ? (
                      <article key={`unassigned-${egg.egg_number}`} className="compute-result__egg-card">
                        <header className="compute-result__egg-head">
                          <div>
                            <p className="compute-result__eyebrow">{`Egg ${egg.egg_number}`}</p>
                            <h3>Chick not chosen yet</h3>
                          </div>
                        </header>
                        <p className="compute-prob-row__fraction">Choose this egg’s bird from the calculated types on Overview.</p>
                      </article>
                    ) : (
                      <EggChickCard
                        key={`egg-${egg.egg_number}-${egg.egg_outcome_id || egg.outcome_key || index}`}
                        egg={egg}
                        locusOutcomes={presentation.genetic_analysis?.outcomes}
                        speciesId={speciesId}
                      />
                    )
                  ))}
                </div>
              ) : (
                <p className="compute-result__empty">
                  {showingActual
                    ? 'This pair laid no eggs.'
                    : 'No eggs were calculated for this pair. Missing genotypes were left missing.'}
                </p>
              )}
            </ResultBlock>
          </div>
        ) : null}
      </div>
    </main>
  )
}
