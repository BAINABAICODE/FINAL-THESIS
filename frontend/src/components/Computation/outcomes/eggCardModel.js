import { FISCHER_IMAGES, FISCHER_WILD_TYPE_KEY } from '../../../assets/mutations/fischers.images'
import { MUTATION_IMAGES, WILD_TYPE_KEY } from '../../../assets/mutations/mutations.images'

export function mutationKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function traitLabel(item) {
  if (typeof item === 'string') return item.trim()
  return String(item?.name || '').trim()
}

const FISCHER_SPECIES_ID = '2'

export function isFischerSpecies(species) {
  if (species == null || species === '') return false
  if (typeof species === 'number') return String(species) === FISCHER_SPECIES_ID
  if (typeof species === 'string') {
    const text = species.toLowerCase()
    return text === FISCHER_SPECIES_ID || text.includes('fischer')
  }
  const id = species.id ?? species.species_id
  if (id != null && String(id) === FISCHER_SPECIES_ID) return true
  const text = [species.common_name, species.scientific_name, species.name, species.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return text.includes('fischer')
}

/** Green and blue are the photo series. Aqua and other grounds are neither. */
export function baseColorSeries(baseColor) {
  if (baseColor && typeof baseColor === 'object') {
    const series = String(baseColor.series || '').trim().toLowerCase()
    if (series === 'blue' || series === 'green') return series
  }
  const text = String(
    typeof baseColor === 'string' ? baseColor : (baseColor?.name || baseColor?.base_color || ''),
  ).trim().toLowerCase()
  if (!text) return 'green'
  if (text.includes('aqua')) return 'other'
  if (/blue|cobalt|mauve|teal/.test(text)) return 'blue'
  if (/green|olive/.test(text)) return 'green'
  return 'other'
}

function photoSrcSet(photo) {
  if (!photo?.image2x || !photo.width2x) return undefined
  return `${photo.image} ${photo.width || 480}w, ${photo.image2x} ${photo.width2x}w`
}

function choosePhoto(entry, series) {
  if (!entry) return null
  if (entry.image) return entry
  if (series === 'blue' && entry.blue) return entry.blue
  if (series === 'green' && entry.green) return entry.green
  return entry.default || entry.green || entry.blue || null
}

function findMutationEntry(images, label) {
  const key = mutationKey(label)
  if (images[key]) return { key, entry: images[key] }
  const keys = Object.keys(images)
    .filter((item) => item !== 'wild-type')
    .sort((a, b) => b.length - a.length)
  const hit = keys.find((item) => key.startsWith(`${item}-`) || key.endsWith(`-${item}`))
  return hit ? { key: hit, entry: images[hit] } : null
}

export function resolveMutationVisual(names, options = {}) {
  const fischer = isFischerSpecies(options.species)
  const images = options.images || (fischer ? FISCHER_IMAGES : MUTATION_IMAGES)
  const wildKey = fischer ? FISCHER_WILD_TYPE_KEY : WILD_TYPE_KEY
  const series = baseColorSeries(options.baseColor)
  const labels = (Array.isArray(names) ? names : []).map(traitLabel).filter(Boolean)
  const matched = labels
    .map((label) => ({ label, found: findMutationEntry(images, label) }))
    .map((item) => ({ ...item, photo: choosePhoto(item.found?.entry, series) }))
    .find((item) => item.photo)
  const known = matched?.photo || null
  const chip = matched?.label || labels[0] || 'Wild Type'
  const fallback = choosePhoto(images[wildKey], series)
  const chosen = known || fallback

  return {
    key: known ? matched.found.key : wildKey,
    chip,
    image: chosen?.image || '',
    srcSet: photoSrcSet(chosen),
    alt: known
      ? known.alt
      : `No ${chip} reference photo. ${fallback?.alt || 'Wild-type placeholder.'}`,
    usedFallback: !known && labels.length > 0,
    extras: labels.filter((label) => label !== chip),
    series,
    fallbackKey: wildKey,
    fallbackImage: fallback?.image || '',
    fallbackSrcSet: photoSrcSet(fallback),
    fallbackAlt: fallback?.alt || 'Wild-type placeholder.',
  }
}

function isHen(egg) {
  const value = String(egg?.sex_label || egg?.sexLabel || egg?.sex || '').toLowerCase()
  if (value.includes('cock') || value === 'male') return false
  return value.includes('hen') || value === 'female'
}

function lociOf(egg) {
  if (Array.isArray(egg?.loci) && egg.loci.length) return egg.loci
  if (Array.isArray(egg?.passed_from_parents) && egg.passed_from_parents.length) return egg.passed_from_parents
  if (Array.isArray(egg?.passedFromParents) && egg.passedFromParents.length) return egg.passedFromParents
  return []
}

function locusName(locus) {
  return String(locus?.name || locus?.locus || '').trim()
}

export function isSexLinkedLocus(locus) {
  if (locus?.category === 'chromosomal_sex') return false
  const type = String(locus?.inheritance_type || locus?.inheritanceType || '')
  if (/sex-linked|sex linked|z-linked/i.test(type)) return true
  if (locus?.basis === 'chromosomal') return true
  return /^w$/i.test(String(locus?.from_hen || '').trim())
}

function alleleState(allele) {
  const text = String(allele ?? '').trim()
  if (!text) return 'unknown'
  if (/^w$/i.test(text)) return 'w'
  if (/^z$/i.test(text)) return 'z'
  if (text.endsWith('+')) return 'wild'
  return 'mutant'
}

function badgeFor(expression, sexLinked, hen) {
  const value = String(expression || '')
  if (value.startsWith('visual')) return 'Visual'
  if (value === 'carrier_split') {
    if (hen && !sexLinked) return 'Normal'
    return sexLinked ? 'Carrier' : 'Split'
  }
  return 'Normal'
}

function sourceFor(father, mother, { sexLinked, hen, category }) {
  if (father === 'unknown' && mother === 'unknown') return 'Not stored'
  if (category === 'chromosomal_sex') return 'Both'
  if (sexLinked && hen) return 'Father'
  const fatherMutant = father === 'mutant'
  const motherMutant = mother === 'mutant'
  if (fatherMutant && motherMutant) return 'Both'
  if (fatherMutant) return 'Father'
  if (motherMutant) return 'Mother'
  return 'Both'
}

function shortTraitName(name) {
  const text = String(name || '').replace(/^split\s+/i, '').trim()
  const wrapped = text.match(/\(([^)]+)\)\s*$/)
  return (wrapped ? wrapped[1] : text).trim() || 'Trait'
}

function notationFor({ name, expression, sexLinked, hen, category, father, mother }) {
  if (category === 'chromosomal_sex' || expression === 'male' || expression === 'female') {
    return hen ? 'Hen (ZW)' : 'Cock (ZZ)'
  }
  const clean = shortTraitName(name)
  if (hen && expression === 'carrier_split' && !sexLinked) return 'Normal'
  if (String(expression || '').startsWith('visual')) return clean
  if (expression === 'carrier_split') return `Normal / ${clean}`
  if (expression === 'hemizygous_wild' || expression === 'non_carrier') return 'Normal'
  if (sexLinked && hen) return father === 'mutant' ? clean : 'Normal'
  if (father === 'mutant' && mother === 'mutant') return clean
  if (father === 'mutant' || mother === 'mutant') return `Normal / ${clean}`
  if (father === 'unknown' && mother === 'unknown') return clean
  return 'Normal'
}

function hintFor({ category, sexLinked, hen, expression }) {
  if (category === 'chromosomal_sex') {
    return hen
      ? 'Hen: Z from the father, W from the mother.'
      : 'Cock: one Z from the father and one Z from the mother.'
  }
  if (hen && expression === 'carrier_split' && !sexLinked) {
    return 'Hidden genes are recorded for cocks. This hen does not keep this as a split.'
  }
  if (sexLinked && hen) return 'Hen: one Z allele, inherited from the father.'
  if (sexLinked) return 'Cock: two Z alleles.'
  return null
}

function toPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const scaled = value <= 1 ? value * 100 : value
  const rounded = Math.round(scaled * 10) / 10
  return rounded
}

function genotypeKey(value) {
  return String(value || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join('/')
}

function normalizedSex(value) {
  const text = String(value || '').toLowerCase()
  if (!text || text === 'both') return text ? 'both' : ''
  if (text.includes('cock') || text === 'male') return 'cock'
  if (text.includes('hen') || text === 'female') return 'hen'
  return text
}

function sexMatches(rowSex, eggSex) {
  const row = normalizedSex(rowSex || 'both')
  const egg = normalizedSex(eggSex)
  if (row === 'both' || !egg) return true
  return row === egg
}

function storedLocusPercent(locus, egg, outcomes) {
  const direct = toPercent(locus?.probability)
  if (direct != null) return direct
  const genotype = genotypeKey(locus?.chick_genotype || locus?.genotype)
  if (!genotype || !Array.isArray(outcomes)) return null
  const name = locusName(locus)
  const outcome = outcomes.find((item) => item?.name === name || item?.locus === name)
  const match = (outcome?.results || []).find((row) => (
    genotypeKey(row?.genotype) === genotype && sexMatches(row?.sex, egg?.sex)
  ))
  return toPercent(match?.probability)
}

function rowFromLocus(locus, index, hen, egg, outcomes) {
  const name = locusName(locus)
  const category = locus?.category || null
  const expression = locus?.expression || null
  const sexLinked = isSexLinkedLocus(locus)
  const father = alleleState(locus?.from_cock)
  const mother = alleleState(locus?.from_hen)
  const context = { sexLinked, hen, category, expression, father, mother, name }

  return {
    key: `${index}-${name}`,
    name,
    badge: badgeFor(expression, sexLinked, hen),
    notation: notationFor(context),
    source: sourceFor(father, mother, context),
    father,
    mother,
    percent: storedLocusPercent(locus, egg, outcomes),
    sexLinked,
    hint: hintFor(context),
  }
}

function unknownRow(name, badge, notation, index) {
  return {
    key: `fallback-${index}-${name}`,
    name,
    badge,
    notation,
    source: 'Not stored',
    father: 'unknown',
    mother: 'unknown',
    percent: null,
    sexLinked: false,
    hint: null,
  }
}

function fallbackRows(egg, hen) {
  const rows = []
  const base = traitLabel(egg?.base_color || egg?.baseColor)
  if (base) rows.push(unknownRow(base, 'Normal', base, rows.length))
  const visuals = (Array.isArray(egg?.visual_mutations) ? egg.visual_mutations : egg?.visualMutations) || []
  visuals.map(traitLabel).filter(Boolean).forEach((name) => {
    rows.push(unknownRow(name, 'Visual', name, rows.length))
  })
  if (!hen) {
    const splits = egg?.split_hidden_genes || egg?.splitHiddenGenes || egg?.split_genes || []
    splits.map(traitLabel).filter(Boolean).forEach((name) => {
      const clean = name.replace(/^split\s+/i, '').trim()
      rows.push(unknownRow(clean, 'Split', `Normal / ${clean}`, rows.length))
    })
  }
  return rows
}

export function buildInheritanceRows(egg, outcomes = []) {
  const hen = isHen(egg)
  const loci = lociOf(egg).filter((locus) => locus && typeof locus === 'object' && locusName(locus))
  if (loci.length) return loci.map((locus, index) => rowFromLocus(locus, index, hen, egg, outcomes))
  return fallbackRows(egg, hen)
}

export function formatInheritancePercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}

export function segmentValue(state) {
  if (state === 'mutant' || state === 'wild' || state === 'z') return 100
  return 0
}

export function segmentText(role, state) {
  if (state === 'mutant') return `${role} passed the mutant allele`
  if (state === 'wild') return `${role} passed the normal allele`
  if (state === 'z') return `${role} passed a Z chromosome`
  if (state === 'w') return `${role} passed the W chromosome`
  return `${role} contribution was not stored`
}
