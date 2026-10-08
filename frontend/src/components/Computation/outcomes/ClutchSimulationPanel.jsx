import { useMemo } from 'react'
import { inheritsSplitGenes, outcomeBaseColor } from '../shared/format'
import { ProbabilityBar } from '../shared/primitives'
import { eggStatusShort } from './eggStatus'

const STAGES = [
  ['fertilization', 'Fertile'],
  ['development', 'Keeps growing'],
  ['hatching', 'Hatches'],
]

const STAGE_COPY = {
  fertilization: { pass: 'Fertile', stop: 'Clear egg' },
  development: { pass: 'Kept growing', stop: 'Stopped growing' },
  hatching: { pass: 'Hatched', stop: 'Did not hatch' },
}

function stageState(stages, key) {
  const stage = (stages || []).find((item) => item.stage === key)
  if (!stage) return 'later'
  return stage.passed ? 'pass' : 'stop'
}

function stageLabel(key, state) {
  const copy = STAGE_COPY[key]
  if (state === 'stop') return copy.stop
  return copy.pass
}

function checkPlain(stage) {
  if (!stage) return 'Not checked. This egg had already stopped.'
  const pick = percentLabel(stage.roll)
  const chance = percentLabel(stage.success_probability)
  if (stage.passed) return `Draw ${pick}. The egg continues when the draw is ${chance} or lower.`
  return `Draw ${pick}. The egg stops because the draw is above ${chance}.`
}

function bandCaption(row, picked, pickLabel) {
  const share = `${row.percent}% of nests with this score lay ${row.eggs} eggs.`
  if (picked && pickLabel) return `This nest. The draw was ${pickLabel}, inside ${row.from}% to ${row.to}%.`
  return share
}

function percentLabel(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const hundredths = Math.round(n * 10000) / 100
  const whole = Math.round(hundredths)
  if (Math.abs(hundredths - whole) < 0.001) return `${whole}%`
  return `${hundredths.toFixed(2)}%`
}

function clutchBands(distribution) {
  let covered = 0
  return (distribution || []).map((row) => {
    const from = covered
    covered += Number(row.percent) || 0
    return { ...row, from, to: covered }
  })
}

function bandHolds(band, roll) {
  const value = Number(roll)
  if (!Number.isFinite(value)) return false
  const from = band.from / 100
  const to = band.to / 100
  const afterStart = from === 0 ? value >= 0 : value > from
  return afterStart && value <= to
}

function traitName(item) {
  if (typeof item === 'string') return item.trim()
  return String(item?.name || '').trim()
}

function chickLook(card) {
  if (!card) return null
  const color = /^not recorded$/i.test(String(card.base_color || '').trim())
    ? outcomeBaseColor({ ...card, base_color: null })
    : card.base_color
  const look = [card.sex_label || card.sex, color, ...(card.visual_mutations || []).map(traitName)]
    .filter(Boolean)
    .join(' · ')
  if (!inheritsSplitGenes(card)) return look
  const hidden = (card.split_hidden_genes || card.split_genes || [])
    .map(traitName)
    .filter(Boolean)
    .map((name) => (/^split\b/i.test(name) ? name : `split ${name}`))
  return hidden.length ? `${look} · ${hidden.join(', ')}` : look
}

export default function ClutchSimulationPanel({ simulation, eggs = [] }) {
  const counts = simulation?.counts || {}
  const level = simulation?.compatibility_level || {}
  const distribution = simulation?.clutch_distribution || []
  const eggsLaid = counts.eggs_laid ?? simulation?.clutch_size
  const chicks = counts.living_chicks

  const eggTimeline = useMemo(() => (simulation?.eggs || []).map((egg) => {
    const card = eggs.find((item) => Number(item.egg_number) === Number(egg.egg_number))
    return { ...egg, card }
  }), [simulation, eggs])

  const bands = useMemo(() => clutchBands(distribution), [distribution])
  const heldBand = bands.find((band) => bandHolds(band, simulation?.clutch_roll)) || null

  if (!simulation) {
    return (
      <p className="compute-result__empty">
        This result has no nest estimate. Run the pair again to calculate eggs and hatchlings.
      </p>
    )
  }

  return (
    <section className="nest-forecast" aria-label="Nest estimate">
      <ol className="nest-steps">
        <li>
          <span>1</span>
          <p>Pair score</p>
          <strong>{simulation.gica_score != null ? simulation.gica_score : '—'}</strong>
          <small>{level.label || 'Compatibility'}{level.range ? ` · ${level.range}` : ''}</small>
        </li>
        <li>
          <span>2</span>
          <p>Eggs in this nest</p>
          <strong>{eggsLaid ?? '—'}</strong>
          <small>Chosen from 3 to 7</small>
        </li>
        <li>
          <span>3</span>
          <p>Chicks hatched</p>
          <strong>{chicks ?? '—'}</strong>
          <small>{eggsLaid != null ? `out of ${eggsLaid} eggs` : 'Living chicks'}</small>
        </li>
      </ol>

      <div className="nest-clutch">
        <h3>Each egg, first to last</h3>
        <p className="nest-tally">
          <span><em>Eggs laid</em><strong>{counts.eggs_laid ?? eggsLaid ?? '—'}</strong></span>
          <span><em>Fertile</em><strong>{counts.fertilized ?? '—'}</strong></span>
          <span><em>Kept growing</em><strong>{counts.developed ?? '—'}</strong></span>
          <span><em>Hatched</em><strong>{counts.hatched ?? chicks ?? '—'}</strong></span>
        </p>
        <ol>
          {eggTimeline.map((egg) => {
            const living = egg.status === 'living_chick'
            const look = living ? chickLook(egg.card) : null
            return (
              <li key={egg.egg_number} className={`nest-egg is-${egg.status}`}>
                <p className="nest-egg__no">Egg {egg.egg_number}</p>
                <p className="nest-egg__result">{eggStatusShort(egg.status, egg.status_label)}</p>
                {look ? <p className="nest-egg__look">{look}</p> : (
                  <p className="nest-egg__look">No color and no genotype. This egg did not become a chick.</p>
                )}
                <ol className="nest-egg__stages" aria-label={`Egg ${egg.egg_number} checks`}>
                  {STAGES.map(([key]) => {
                    const state = stageState(egg.stages, key)
                    return (
                      <li key={key} className={`is-${state}`}>{stageLabel(key, state)}</li>
                    )
                  })}
                </ol>
                <details className="nest-fold">
                  <summary>How this egg was checked</summary>
                  <ol className="nest-math">
                    {STAGES.map(([key]) => {
                      const stage = (egg.stages || []).find((item) => item.stage === key)
                      const state = stageState(egg.stages, key)
                      return (
                        <li key={key} className={`is-${state}`}>
                          <span>{stageLabel(key, state)}</span>
                          <b>{checkPlain(stage)}</b>
                        </li>
                      )
                    })}
                  </ol>
                </details>
              </li>
            )
          })}
        </ol>
      </div>

      <details className="nest-fold nest-fold--work">
        <summary>How this nest got {simulation.clutch_size} eggs</summary>
        <p>
          {level.label || 'This score'}
          {level.tendency ? ` usually lays ${String(level.tendency).trim().replace(/\.+$/, '')}` : ' lays between 3 and 7 eggs'}.
          {simulation.clutch_roll != null && heldBand ? (
            <> A draw of <strong>{percentLabel(simulation.clutch_roll)}</strong> landed in the band for {heldBand.eggs} eggs ({heldBand.from}% to {heldBand.to}%).</>
          ) : (
            <> This nest has <strong>{simulation.clutch_size} eggs</strong>.</>
          )}
        </p>
        <ul className="nest-bars">
          {bands.map((row) => {
            const picked = simulation?.clutch_roll != null
              ? bandHolds(row, simulation.clutch_roll)
              : row.eggs === simulation.clutch_size
            const pickLabel = simulation.clutch_roll == null ? null : percentLabel(simulation.clutch_roll)
            return (
              <li key={row.eggs} className={picked ? 'is-picked' : ''}>
                <span>{row.eggs}{picked ? <em>This nest</em> : null}</span>
                <div className="nest-bars__meter">
                  <ProbabilityBar probability={(row.percent || 0) / 100} label={`${row.eggs} eggs`} tone={picked ? 'brand' : 'muted'} />
                  <small>{bandCaption(row, picked, pickLabel)}</small>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="nest-gates">
          <h3>Chance an egg continues</h3>
          <p>Each egg is checked in order: fertile, then growing, then hatch. A lower draw continues. A higher draw stops, and later checks are skipped.</p>
          <ul>
            {STAGES.map(([key, label]) => {
              const rate = simulation.viability_modifiers?.[key]
              return (
                <li key={key}>
                  <span>{label}</span>
                  <strong>{rate == null ? '—' : `${Math.round(rate * 100)}%`}</strong>
                </li>
              )
            })}
          </ul>
        </div>
      </details>

      <p className="nest-forecast__note">
        This is one possible nest for this score. Age, health, food, and the cage can still change a real clutch. A hatched chick’s color comes from the gene chart, and those odds do not change because this nest drew them.
      </p>
    </section>
  )
}
