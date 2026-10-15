import { useEffect, useMemo, useState } from 'react'
import PhenotypeMap from '../inheritance/PhenotypeMap'
import EggMutationMedia from './EggMutationMedia'
import { barColor, breedingOutcome, outcomeBaseColor, outcomeSplit, outcomeVisual, percentText } from '../shared/format'
import { translateGenotype } from '../../../services/genetics'
import {
  chickTypeKey,
  findChickType,
  resolveSlots,
  withEggCount,
} from './actualBreeding'

function percentWidth(row) {
  const raw = row?.probability
  const value = typeof raw === 'number' ? raw : Number(raw?.probability)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
}

function displayText(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') return value.display || value.description || value.genotype || '—'
  return '—'
}

function sexLabel(row) {
  const value = String(row?.sex_label || row?.sex || '').toLowerCase()
  if (value.includes('cock') || value === 'male') return 'Cock'
  if (value.includes('hen') || value === 'female') return 'Hen'
  return row?.sex_label || row?.sex || '—'
}

function visualNames(row) {
  const list = row?.visual_mutations || row?.visualMutations
  return Array.isArray(list) ? list : []
}

function ChickPhoto({ row, speciesId }) {
  if (!row) return null
  return (
    <EggMutationMedia
      names={visualNames(row)}
      species={row.species || speciesId}
      baseColor={outcomeBaseColor(row)}
      sizes="(max-width: 720px) 40vw, 240px"
      compact
    />
  )
}

function slotLabel(slot, types) {
  if (!slot.hatched) return 'Did not hatch'
  const type = findChickType(types, slot.typeKey)
  if (!type && slot.typeKey) return 'Choose this chick again'
  if (!type) return 'Choose a calculated chick'
  return breedingOutcome(type)
}

export default function ActualBreedingPanel({
  record,
  computedEggCount,
  chickTypes,
  speciesId,
  onChange,
}) {
  const showingActual = record.mode === 'actual'
  const slots = useMemo(
    () => resolveSlots(record, computedEggCount),
    [record, computedEggCount],
  )
  const [activeEgg, setActiveEgg] = useState(slots[0]?.eggNumber || 1)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const locked = record.locked === true
  const missingChick = slots.some((slot) => slot.hatched && !findChickType(chickTypes, slot.typeKey))

  useEffect(() => {
    if (!slots.some((slot) => slot.eggNumber === activeEgg)) {
      setActiveEgg(slots[0]?.eggNumber || 1)
    }
  }, [slots, activeEgg])

  const activeSlot = slots.find((slot) => slot.eggNumber === activeEgg) || null

  function handleMode(mode) {
    if (mode === record.mode) return
    setConfirmOpen(false)
    if (mode === 'actual') {
      const next = record.eggCount == null ? withEggCount(record, computedEggCount) : record
      onChange({ ...next, mode: 'actual' })
      return
    }
    onChange({ ...record, mode: 'computed' })
  }

  function handleCount(count) {
    if (locked) return
    const parsed = typeof count === 'number' ? count : Number(count)
    if (!Number.isInteger(parsed)) return
    onChange({ ...withEggCount(record, parsed), mode: 'actual', locked: false })
  }

  function updateSlot(eggNumber, patch) {
    if (locked) return
    const nextSlots = resolveSlots(record, computedEggCount).map((slot) => (
      slot.eggNumber === eggNumber ? { ...slot, ...patch } : slot
    ))
    onChange({
      ...record,
      mode: 'actual',
      locked: false,
      eggCount: nextSlots.length,
      slots: nextSlots,
    })
  }

  function handlePick(row) {
    if (locked || !activeSlot?.hatched) return
    updateSlot(activeSlot.eggNumber, { typeKey: chickTypeKey(row), hatched: true })
  }

  function handleConfirmSave() {
    const snapshot = slots.map((slot) => ({ ...slot }))
    onChange({
      ...record,
      mode: 'computed',
      eggCount: snapshot.length,
      slots: snapshot,
      saved: true,
      locked: true,
      savedEggCount: snapshot.length,
      savedSlots: snapshot,
    })
    setConfirmOpen(false)
  }

  function handleUnlock() {
    onChange({ ...record, locked: false })
  }

  return (
    <div className="actual-breed">
      <div className="compute-result__switch" role="tablist" aria-label="Overview source">
        <button
          type="button"
          role="tab"
          aria-selected={!showingActual}
          className={`compute-result__tab${!showingActual ? ' is-active' : ''}`}
          onClick={() => handleMode('computed')}
        >
          {record.saved ? 'Real life clutch' : 'System computation'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={showingActual}
          className={`compute-result__tab${showingActual ? ' is-active' : ''}`}
          onClick={() => handleMode('actual')}
        >
          Actual breeding
        </button>
      </div>

      {showingActual ? (
        <>
          <p className="actual-breed__lead">
            {locked
              ? 'This clutch is saved. System computation is now Real life clutch.'
              : 'Choose each hatched chick, then save. System computation then shows this clutch and its name becomes Real life clutch.'}
          </p>

          <div className="actual-breed__count">
            <p className="actual-breed__count-label" id="actual-egg-count-label">Eggs laid</p>
            <div className="actual-breed__stepper">
              <button
                type="button"
                className="breed__btn"
                onClick={() => handleCount(slots.length - 1)}
                disabled={locked || slots.length <= 0}
                aria-label="Fewer eggs"
              >
                −
              </button>
              <input
                id="actual-egg-count"
                aria-labelledby="actual-egg-count-label"
                type="number"
                min={0}
                max={24}
                value={slots.length}
                disabled={locked}
                onChange={(event) => handleCount(event.target.value)}
              />
              <button
                type="button"
                className="breed__btn"
                onClick={() => handleCount(slots.length + 1)}
                disabled={locked || slots.length >= 24}
                aria-label="More eggs"
              >
                +
              </button>
            </div>
            <p className="actual-breed__count-note">
              The computation produced {computedEggCount} {computedEggCount === 1 ? 'egg' : 'eggs'} for this nest.
            </p>
          </div>

          {slots.length ? (
            <ol className="actual-breed__eggs">
              {slots.map((slot) => {
                const active = slot.eggNumber === activeEgg
                const chosen = slot.hatched ? findChickType(chickTypes, slot.typeKey) : null
                return (
                  <li key={slot.eggNumber} className={`actual-breed__egg${active ? ' is-active' : ''}`}>
                    <button
                      type="button"
                      className="actual-breed__egg-pick"
                      aria-pressed={active}
                      onClick={() => setActiveEgg(slot.eggNumber)}
                    >
                      <ChickPhoto row={chosen} speciesId={speciesId} />
                      <span className="actual-breed__egg-copy">
                        <span className="actual-breed__egg-no">Egg {slot.eggNumber}</span>
                        <strong>{slotLabel(slot, chickTypes)}</strong>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="breed__btn actual-breed__hatch"
                      onClick={() => updateSlot(slot.eggNumber, { hatched: !slot.hatched })}
                      disabled={locked}
                    >
                      {slot.hatched ? 'Did not hatch' : 'Mark hatched'}
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="actual-breed__lead">Set the egg count above, then save if this pair laid no eggs.</p>
          )}

          <div className="actual-breed__save">
            {locked ? (
              <button type="button" className="breed__btn" onClick={handleUnlock}>
                Change this clutch
              </button>
            ) : (
              <button
                type="button"
                className="breed__btn breed__btn--primary"
                disabled={missingChick}
                onClick={() => setConfirmOpen(true)}
              >
                Save actual clutch
              </button>
            )}
            {!locked && missingChick ? (
              <p className="actual-breed__count-note">Choose a calculated chick for every egg that hatched.</p>
            ) : null}
          </div>

          {!locked && activeSlot?.hatched ? (
            <>
              <h3 className="compute-dist-complete-title">Every calculated chick type</h3>
              <p className="compute-dist-legend">
                Choose the bird for egg {activeSlot.eggNumber}. Save the clutch when every hatched egg has a bird.
              </p>
              {chickTypes.length ? (
                <div className="compute-dist-complete-grid">
                  {chickTypes.map((row, index) => {
                    const key = chickTypeKey(row)
                    const selected = activeSlot.typeKey === key
                    const split = outcomeSplit(row)
                    return (
                      <button
                        key={`${key}-${index}`}
                        type="button"
                        className={`compute-dist-complete-card actual-breed__type${selected ? ' is-selected' : ''}`}
                        aria-pressed={selected}
                        onClick={() => handlePick(row)}
                      >
                        <ChickPhoto row={row} speciesId={speciesId} />
                        <header>
                          <h4>{breedingOutcome(row)}</h4>
                          <span>{percentText(row.probability) || '—'}</span>
                        </header>
                        <dl className="compute-result__facts">
                          <div><dt>Sex</dt><dd>{sexLabel(row)}</dd></div>
                          <div><dt>Base Color</dt><dd>{outcomeBaseColor(row)}</dd></div>
                          <div><dt>Visual Mutations</dt><dd>{outcomeVisual(row)}</dd></div>
                          {split ? <div><dt>Split / Hidden Genes</dt><dd>{split}</dd></div> : null}
                          <div><dt>Genotype</dt><dd>{displayText(row.genotype)}</dd></div>
                          <div><dt>Means</dt><dd>{translateGenotype(row.genotype, row.base_color)}</dd></div>
                          <div><dt>Phenotype</dt><dd>{displayText(row.phenotype)}</dd></div>
                        </dl>
                        <PhenotypeMap source={row} />
                        <div className="compute-bar is-info">
                          <div className="compute-bar__track" aria-hidden="true">
                            <div
                              className="compute-bar__fill"
                              style={{ width: `${percentWidth(row)}%`, background: barColor('', index) }}
                            />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="compute-result__empty">This result has no calculated chick types to choose from.</p>
              )}
            </>
          ) : null}
        </>
      ) : (
        <p className="actual-breed__lead">
          {record.saved
            ? 'These parents and chicks are the real life clutch you saved.'
            : 'These parents and chicks come from the computed nest. Switch to actual breeding to record the eggs this pair laid.'}
        </p>
      )}

      {confirmOpen ? (
        <div className="actual-breed__confirm">
          <button
            type="button"
            className="actual-breed__confirm-backdrop"
            aria-label="Go back"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            className="actual-breed__confirm-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="actual-breed-confirm-title"
          >
            <h3 id="actual-breed-confirm-title">Save this real clutch?</h3>
            <p>
              Confirm these are the eggs and chicks this pair actually produced. Saving replaces the system computation on the overview, and that tab becomes Real life clutch.
            </p>
            {slots.length ? (
              <ol>
                {slots.map((slot) => {
                  const chosen = slot.hatched ? findChickType(chickTypes, slot.typeKey) : null
                  return (
                    <li key={slot.eggNumber}>
                      <ChickPhoto row={chosen} speciesId={speciesId} />
                      <span className="actual-breed__confirm-copy">
                        <span className="actual-breed__egg-no">Egg {slot.eggNumber}</span>
                        <strong>{slotLabel(slot, chickTypes)}</strong>
                      </span>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p>This pair laid no eggs.</p>
            )}
            <div className="actual-breed__confirm-actions">
              <button type="button" className="breed__btn" onClick={() => setConfirmOpen(false)}>
                Go back
              </button>
              <button type="button" className="breed__btn breed__btn--primary" onClick={handleConfirmSave}>
                Yes, save this clutch
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
