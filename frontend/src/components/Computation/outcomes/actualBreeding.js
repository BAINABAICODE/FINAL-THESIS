import { breedingOutcome } from '../shared/format'

const STORAGE_PREFIX = 'agapora-actual-breed:'
const MAX_EGGS = 24

export function chickTypeKey(row) {
  return [
    row?.genotype || row?.genotype_display || '',
    row?.sex || row?.sex_label || '',
    breedingOutcome(row),
  ].join('|')
}

export function emptyActualBreed() {
  return {
    mode: 'computed',
    eggCount: null,
    slots: [],
    saved: false,
    locked: false,
    savedEggCount: null,
    savedSlots: [],
  }
}

function clampCount(value) {
  const count = Number(value)
  if (!Number.isInteger(count)) return 0
  return Math.max(0, Math.min(MAX_EGGS, count))
}

function normalizeSlot(slot) {
  const eggNumber = Number(slot?.eggNumber)
  if (!Number.isInteger(eggNumber) || eggNumber < 1 || eggNumber > MAX_EGGS) return null
  return {
    eggNumber,
    typeKey: typeof slot.typeKey === 'string' && slot.typeKey ? slot.typeKey : null,
    hatched: slot.hatched !== false,
  }
}

export function normalizeActualBreed(value) {
  const slots = Array.isArray(value?.slots)
    ? value.slots.map(normalizeSlot).filter(Boolean)
    : []
  const savedSlots = Array.isArray(value?.savedSlots)
    ? value.savedSlots.map(normalizeSlot).filter(Boolean)
    : []
  const savedEggCount = value?.savedEggCount == null ? null : clampCount(value.savedEggCount)
  const saved = value?.saved === true && savedEggCount != null
  return {
    mode: value?.mode === 'actual' ? 'actual' : 'computed',
    eggCount: value?.eggCount == null ? null : clampCount(value.eggCount),
    slots,
    saved,
    locked: saved && value?.locked !== false,
    savedEggCount: saved ? savedEggCount : null,
    savedSlots: saved ? savedSlots : [],
  }
}

export function savedClutchRecord(record) {
  if (!record?.saved) return { eggCount: 0, slots: [] }
  return { eggCount: record.savedEggCount, slots: record.savedSlots }
}

export function loadActualBreed(resultId) {
  if (!resultId || typeof window === 'undefined') return emptyActualBreed()
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${resultId}`)
    if (!raw) return emptyActualBreed()
    return normalizeActualBreed(JSON.parse(raw))
  } catch {
    return emptyActualBreed()
  }
}

export function saveActualBreed(resultId, record) {
  if (!resultId || typeof window === 'undefined') return
  window.localStorage.setItem(`${STORAGE_PREFIX}${resultId}`, JSON.stringify(normalizeActualBreed(record)))
}

export function resolveSlots(record, computedEggCount) {
  const count = record?.eggCount == null
    ? clampCount(computedEggCount)
    : clampCount(record.eggCount)
  return Array.from({ length: count }, (_, index) => {
    const eggNumber = index + 1
    return record?.slots?.find((slot) => slot.eggNumber === eggNumber)
      || { eggNumber, typeKey: null, hatched: true }
  })
}

export function withEggCount(record, count) {
  const eggCount = clampCount(count)
  return {
    ...normalizeActualBreed(record),
    eggCount,
    slots: resolveSlots({ ...record, eggCount }, eggCount),
  }
}

export function findChickType(types, typeKey) {
  if (!typeKey) return null
  return (types || []).find((row) => chickTypeKey(row) === typeKey) || null
}

export function slotsToChicks(slots, types) {
  return (slots || []).flatMap((slot) => {
    if (!slot.hatched || !slot.typeKey) return []
    const type = findChickType(types, slot.typeKey)
    if (!type) return []
    return [{
      ...type,
      egg_number: slot.eggNumber,
      egg_status: 'living_chick',
      egg_status_label: 'Actual chick',
    }]
  })
}

export function slotsToEggs(slots, types) {
  return (slots || []).map((slot) => {
    if (!slot.hatched) {
      return {
        egg_number: slot.eggNumber,
        egg_status: 'failed_to_hatch',
        egg_status_label: 'Did not hatch',
      }
    }
    const type = findChickType(types, slot.typeKey)
    if (!type) {
      return {
        egg_number: slot.eggNumber,
        egg_status: 'living_chick',
        unassigned: true,
      }
    }
    return {
      ...type,
      egg_number: slot.eggNumber,
      egg_status: 'living_chick',
      egg_status_label: 'Actual chick',
    }
  })
}
