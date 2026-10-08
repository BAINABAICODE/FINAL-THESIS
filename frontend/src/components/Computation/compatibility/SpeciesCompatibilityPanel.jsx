import { KeyValue, StatusPill } from '../shared/primitives'

function plainSex(value) {
  const text = String(value || '').toLowerCase()
  if (text.includes('female') || text.includes('hen')) return 'Female'
  if (text.includes('male') || text.includes('cock')) return 'Male'
  return value || 'Sex not saved'
}

function ParentSpecies({ label, parent }) {
  return (
    <div className="gx-species__parent">
      <p className="gx-species__slot">{label}</p>
      <p className="gx-species__common">{parent?.species || 'Not saved'}</p>
      <p className="gx-species__sci">{parent?.scientific_name || 'Scientific name not saved'}</p>
      <p className="gx-species__meta">
        <span>Bird {parent?.bird_id || '—'}</span>
        <span>{plainSex(parent?.sex)}</span>
        {parent?.species_group ? <span>{parent.species_group}</span> : null}
      </p>
    </div>
  )
}

export default function SpeciesCompatibilityPanel({ species }) {
  const tone = species.sameSpecies ? 'ok' : species.interspecific ? 'warn' : 'neutral'
  return (
    <div className="gx-species">
      <div className="gx-species__grid">
        <ParentSpecies label="Parent 1" parent={species.parent1} />
        <div className="gx-species__verdict">
          <StatusPill tone={tone}>
            {species.sameSpecies ? 'Same species' : species.interspecific ? 'Different species' : 'Not saved'}
          </StatusPill>
        </div>
        <ParentSpecies label="Parent 2" parent={species.parent2} />
      </div>
      {species.interspecific ? (
        <p className="gx-alert is-warn">
          The selected parents belong to different species records. Compatibility classification: <strong>{species.label}</strong>.
          Genetic prediction confidence: <strong>Reduced</strong>. The pairing is not labelled impossible unless the stored species-compatibility rules say so.
        </p>
      ) : null}
      <KeyValue rows={[
        ['Pair', species.sameSpecies ? 'Same species' : species.interspecific ? 'Different species' : null],
        ['Species match', species.scorePercent != null ? `${species.scorePercent}%` : null],
        ['Can calculate', species.predictionAllowed ? 'Yes' : 'No'],
      ]} />
      {species.sameSpecies ? <p className="gx-note">Both birds are the same species, so this pair can be calculated.</p> : null}
      {species.warning ? <p className="gx-alert is-warn">{species.warning}</p> : null}
    </div>
  )
}
