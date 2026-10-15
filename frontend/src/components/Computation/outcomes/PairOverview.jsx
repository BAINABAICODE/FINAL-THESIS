import { speciesImages } from '../../../assets/birds'
import { breedingOutcome, outcomeBaseColor, outcomeSplit, outcomeVisual, percentText } from '../shared/format'
import { buildInheritanceRows, formatInheritancePercent } from './eggCardModel'
import EggMutationMedia from './EggMutationMedia'

function traitNames(list) {
  return (list || [])
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
}

function sexKind(parent, fallback) {
  const value = String(parent?.sex_label || parent?.sex || fallback?.sex || '').toLowerCase()
  if (value.includes('cock') || value === 'male') return 'father'
  if (value.includes('hen') || value === 'female') return 'mother'
  return 'parent'
}

function speciesOf(parent, fallback) {
  if (parent?.species && typeof parent.species === 'object') return parent.species
  if (typeof parent?.species === 'string') return { common_name: parent.species }
  if (fallback?.species) return { common_name: fallback.species, scientific_name: fallback.scientific_name }
  return {}
}

function speciesImage(parent, fallback) {
  const id = parent?.species?.id ?? parent?.species_id ?? fallback?.species_id
  return id != null ? speciesImages[id] || null : null
}

function chancePercent(row) {
  const raw = row?.probability
  const value = typeof raw === 'number' ? raw : Number(raw?.probability)
  if (!Number.isFinite(value)) return null
  const scaled = value <= 1 ? value * 100 : value
  return Math.round(scaled * 10) / 10
}

function ParentLook({ parent, fallback, role }) {
  const species = speciesOf(parent, fallback)
  const common = species.common_name || '—'
  const scientific = species.scientific_name || ''
  const image = speciesImage(parent, fallback)
  const sex = parent?.sex_label || fallback?.sex || (role === 'father' ? 'Cock' : role === 'mother' ? 'Hen' : '—')
  const base = parent?.base_color?.name || (typeof parent?.base_color === 'string' ? parent.base_color : '—')
  const visuals = traitNames(parent?.visual_mutations)
  const splits = traitNames(parent?.split_genes)
  const showSplits = role !== 'mother' || splits.length > 0
  const title = role === 'father' ? 'Father' : role === 'mother' ? 'Mother' : 'Parent'
  const alt = `${common}${scientific ? ` (${scientific})` : ''}, ${sex}`

  return (
    <article className={`pair-overview__bird is-${role}`}>
      <p className="pair-overview__role">{title}</p>
      <figure className="pair-overview__portrait">
        {image ? (
          <img src={image} alt={alt} loading="lazy" />
        ) : (
          <span className="pair-overview__portrait-fallback" role="img" aria-label={`${common} image unavailable`}>
            {common !== '—' ? common.charAt(0) : '?'}
          </span>
        )}
        <figcaption>{parent?.bird_id || fallback?.bird_id || 'Saved bird'}</figcaption>
      </figure>
      <dl className="pair-overview__facts">
        <div><dt>Sex</dt><dd>{sex}</dd></div>
        <div><dt>Base color</dt><dd>{base}</dd></div>
        <div><dt>Visual mutation</dt><dd>{visuals.length ? visuals.join(', ') : 'Wild type'}</dd></div>
        {showSplits ? (
          <div><dt>Split / hidden genes</dt><dd>{splits.length ? splits.join(', ') : 'None recorded'}</dd></div>
        ) : null}
      </dl>
      <p className="pair-overview__species">{common}</p>
    </article>
  )
}

function shareLabel(percent) {
  const text = formatInheritancePercent(percent)
  return text || '—'
}

function ShareBar({ percent, label }) {
  const width = percent == null ? 0 : Math.max(0, Math.min(100, percent))
  return (
    <div
      className="pair-overview__share"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      aria-label={label}
    >
      <span style={{ width: `${width}%` }} />
    </div>
  )
}

function shortTrait(name) {
  const text = String(name || '').trim()
  const wrapped = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!wrapped) return text || 'Trait'
  const outside = wrapped[1].trim()
  const inside = wrapped[2].trim()
  if (inside.length <= 2 && outside) return outside
  return inside || outside || text
}

function TraitShares({ chick, locusOutcomes }) {
  const rows = buildInheritanceRows(chick, locusOutcomes)
  if (!rows.length) return <p className="pair-overview__empty">No parent alleles stored for this chick.</p>

  return (
    <table className="pair-overview__inherit">
      <caption>What they inherit</caption>
      <thead>
        <tr>
          <th scope="col">Trait</th>
          <th scope="col">Result</th>
          <th scope="col">From</th>
          <th scope="col">Chance</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const label = shortTrait(row.name)
          const from = row.source && row.source !== 'Not stored' ? row.source : '—'
          return (
            <tr key={row.key}>
              <th scope="row">{label}</th>
              <td>{row.notation}</td>
              <td>{from}</td>
              <td>
                <strong>{shareLabel(row.percent)}</strong>
                <ShareBar percent={row.percent} label={`${label} chance`} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function chickSexKind(chick) {
  const value = String(chick?.sex_label || chick?.sexLabel || chick?.sex || '').toLowerCase()
  if (value.includes('cock') || value === 'male') return 'cock'
  if (value.includes('hen') || value === 'female') return 'hen'
  return 'chick'
}

function ChickCard({ chick, speciesId, locusOutcomes }) {
  const pct = chancePercent(chick)
  const title = breedingOutcome(chick)
  const chance = pct == null ? percentText(chick.probability) : `${Number.isInteger(pct) ? pct : pct}%`
  const sex = chickSexKind(chick)
  const sexText = sex === 'cock' ? 'Cock' : sex === 'hen' ? 'Hen' : (chick?.sex_label || chick?.sex || '—')
  const splitText = outcomeSplit(chick)
  const showSplits = sex !== 'hen' || Boolean(splitText)

  const eggNumber = chick?.egg_number

  return (
    <article className={`pair-overview__chick is-${sex}`}>
      {eggNumber ? <p className="pair-overview__kicker">{`Egg ${eggNumber} · living chick`}</p> : null}
      <EggMutationMedia
        names={chick.visual_mutations || chick.visualMutations}
        species={chick.species || speciesId}
        baseColor={outcomeBaseColor(chick)}
        sizes="(max-width: 720px) 100vw, 640px"
      />
      <div className="pair-overview__chick-copy">
        <div className="pair-overview__trait-head">
          <h3>{title}</h3>
          <strong>{chance}</strong>
        </div>
        <dl className="pair-overview__facts">
          <div><dt>Sex</dt><dd>{sexText}</dd></div>
          <div><dt>Base color</dt><dd>{outcomeBaseColor(chick)}</dd></div>
          <div><dt>Visual mutation</dt><dd>{outcomeVisual(chick)}</dd></div>
          {showSplits ? (
            <div><dt>Split / hidden genes</dt><dd>{splitText || 'None recorded'}</dd></div>
          ) : null}
        </dl>
        <TraitShares chick={chick} locusOutcomes={locusOutcomes} />
      </div>
    </article>
  )
}

export default function PairOverview({
  parentSnapshot,
  parent1Fallback,
  parent2Fallback,
  chicks = [],
  speciesId,
  locusOutcomes = [],
  chicksTitle = 'Living chicks',
  nestNote = 'Hatched eggs from the nest, in egg order.',
  emptyMessage = 'No living chicks hatched in this nest.',
}) {
  const parents = [
    {
      parent: parentSnapshot?.parent_1,
      fallback: parent1Fallback,
      role: sexKind(parentSnapshot?.parent_1, parent1Fallback),
    },
    {
      parent: parentSnapshot?.parent_2,
      fallback: parent2Fallback,
      role: sexKind(parentSnapshot?.parent_2, parent2Fallback),
    },
  ].sort((left, right) => {
    const rank = { father: 0, mother: 1, parent: 2 }
    return rank[left.role] - rank[right.role]
  })

  return (
    <div className="pair-overview">
      <div className="pair-overview__parents">
        <ParentLook parent={parents[0].parent} fallback={parents[0].fallback} role={parents[0].role} />
        <p className="pair-overview__cross" aria-hidden="true">×</p>
        <ParentLook parent={parents[1].parent} fallback={parents[1].fallback} role={parents[1].role} />
      </div>
      <div className="pair-overview__chicks">
        <header className="pair-overview__chicks-head">
          <h3 className="pair-overview__chicks-title">{chicksTitle}</h3>
          <p className="pair-overview__legend">
            <span className="is-cock">Blue is the cock</span>
            <span className="is-hen">Pink is the hen</span>
          </p>
          <p className="pair-overview__nest-note">{nestNote}</p>
        </header>
        {chicks.length ? (
          <div className="pair-overview__chick-list">
            {chicks.map((chick, index) => (
              <ChickCard
                key={`${chick.genotype || chick.outcome_key || 'chick'}-${chick.sex || index}-${index}`}
                chick={chick}
                speciesId={speciesId}
                locusOutcomes={locusOutcomes}
              />
            ))}
          </div>
        ) : (
          <p className="pair-overview__empty">{emptyMessage}</p>
        )}
      </div>
    </div>
  )
}
