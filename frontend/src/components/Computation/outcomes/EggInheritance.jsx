import { useEffect, useId, useState } from 'react'
import { buildInheritanceRows, formatInheritancePercent, segmentText, segmentValue } from './eggCardModel'

function useNarrowScreen() {
  const query = '(max-width: 719px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setNarrow(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return narrow
}

function ParentSegment({ role, state, trait }) {
  const label = role === 'father' ? 'Father' : 'Mother'
  return (
    <div
      className={`compute-result__inherit-bar-seg is-${role} is-${state}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={segmentValue(state)}
      aria-valuetext={segmentText(label, state)}
      aria-label={`${trait} from the ${label.toLowerCase()}`}
    />
  )
}

function isQuietRow(row) {
  return row.badge === 'Normal' && !row.hint && (row.percent == null || row.percent >= 100)
}

function badgeLabel(row) {
  if (row.badge === 'Normal' && /does not keep this as a split/i.test(String(row.hint || ''))) {
    return 'Not a split'
  }
  return row.badge
}

export default function EggInheritance({ egg, locusOutcomes = [] }) {
  const rows = buildInheritanceRows(egg, locusOutcomes)
  const notable = rows.filter((row) => !isQuietRow(row))
  const quiet = rows.filter(isQuietRow)
  const narrow = useNarrowScreen()
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const panelId = useId()
  const expanded = !narrow || open

  return (
    <section className="compute-result__inherit" aria-labelledby={titleId}>
      <div className="compute-result__inherit-head">
        <h4 id={titleId}>Inheritance</h4>
        {narrow ? (
          <button
            type="button"
            className="compute-result__inherit-toggle"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {expanded ? 'Hide inheritance' : 'Show inheritance'}
          </button>
        ) : null}
      </div>
      <div id={panelId} className="compute-result__inherit-panel" hidden={!expanded}>
        <ul className="compute-result__inherit-legend">
          <li><span className="compute-result__inherit-swatch is-father" aria-hidden="true" /> Father</li>
          <li><span className="compute-result__inherit-swatch is-mother" aria-hidden="true" /> Mother</li>
          <li><span className="compute-result__inherit-swatch is-wild" aria-hidden="true" /> Normal allele</li>
        </ul>
        {notable.length ? (
          <ul className="compute-result__inherit-list">
            {notable.map((row) => {
              const percentText = formatInheritancePercent(row.percent)
              const badge = badgeLabel(row)
              return (
                <li key={row.key} className="compute-result__inherit-row">
                  <div className="compute-result__inherit-trait">
                    <span className="compute-result__inherit-name">{row.name}</span>
                    <span className={`compute-result__badge is-${row.badge.toLowerCase()}`}>{badge}</span>
                  </div>
                  <p className="compute-result__inherit-notation">{row.notation}</p>
                  <p className="compute-result__inherit-source">{row.source}</p>
                  <div className="compute-result__inherit-bar">
                    <ParentSegment role="father" state={row.father} trait={row.name} />
                    <ParentSegment role="mother" state={row.mother} trait={row.name} />
                  </div>
                  <div className="compute-result__inherit-chance">
                    <span className="compute-result__inherit-pct">{percentText ? `${percentText} of chicks` : '—'}</span>
                    {percentText ? (
                      <div
                        className="compute-result__inherit-meter"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={row.percent}
                        aria-label={`${row.name} probability`}
                      >
                        <span style={{ '--meter': row.percent / 100 }} />
                      </div>
                    ) : null}
                  </div>
                  {row.hint ? <p className="compute-result__inherit-hint">{row.hint}</p> : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        {quiet.length ? (
          <p className="compute-result__inherit-empty">
            Normal on every chick: {quiet.map((row) => String(row.name).trim()).filter(Boolean).join(', ')}.
          </p>
        ) : null}
        {!rows.length ? (
          <p className="compute-result__inherit-empty">Parent alleles were not stored for this chick.</p>
        ) : null}
      </div>
    </section>
  )
}
