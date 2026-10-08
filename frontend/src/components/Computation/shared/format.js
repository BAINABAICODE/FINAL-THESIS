function traitNames(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
}

function namedColor(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object') return namedColor(value.name || value.base_color)
  const text = String(value).trim()
  return /^not recorded$/i.test(text) ? '' : text
}

function groundColorName(row) {
  const sources = [
    ...(row?.passed_from_parents || row?.passedFromParents || []),
    ...(row?.loci || []),
  ]
  const ground = sources.find((item) => {
    const label = String(item?.locus || item?.name || '')
    const key = String(item?.locus_key || item?.locusKey || '')
    if (key === 'dark_factor' || /dark factor/i.test(label)) return false
    return item?.category === 'base_color' || key === 'ground_color' || /ground color/i.test(label)
  })
  if (!ground) return ''
  const label = String(ground.locus || ground.name || '').trim()
  const wrapped = label.match(/\(([^)]+)\)\s*$/)
  const series = (wrapped ? wrapped[1] : label).trim()
  if (/^visual/i.test(String(ground.expression || '')) && series && !/^ground color$/i.test(series)) {
    return series
  }
  return namedColor(ground.chick_genotype || ground.genotype)
}

/** Mendelian answer for one chick. An empty list is a result, not a missing calculation. */
export function outcomeBaseColor(row) {
  const named = namedColor(row?.base_color || row?.baseColor)
  if (named) return named
  const ground = groundColorName(row)
  if (ground) return ground
  return 'Wild type'
}

export function outcomeVisual(row) {
  const names = traitNames(row?.visual_mutations || row?.visualMutations)
  return names.length ? names.join(', ') : 'Wild Type'
}

function splitName(name) {
  const text = String(name || '').trim()
  if (!text) return ''
  return /^split\b/i.test(text) ? text : `split ${text}`
}

export function outcomeSplit(row) {
  const names = inheritedSplitNames(row)
  return names.length ? names.map(splitName).join(', ') : ''
}

function sexWord(row) {
  const value = String(row?.sex_label || row?.sexLabel || row?.sex || '').toLowerCase()
  if (value.includes('cock') || value === 'male') return 'cock'
  if (value.includes('hen') || value === 'female') return 'hen'
  return 'chick'
}

/** Hens do not inherit split or hidden genes. Only a cock can carry them. */
export function inheritsSplitGenes(row) {
  return sexWord(row) !== 'hen'
}

function inheritedSplitNames(row) {
  if (!inheritsSplitGenes(row)) return []
  return traitNames(row?.split_hidden_genes || row?.splitHiddenGenes || row?.split_genes)
}

/** Aviary record: look, sex, then the hidden genes. Example: "Dilute Green cock, split Blue2". */
export function breedingOutcome(row) {
  const visuals = traitNames(row?.visual_mutations || row?.visualMutations)
  const look = [visuals.join(' '), outcomeBaseColor(row)].filter(Boolean).join(' ')
  const hidden = outcomeSplit(row)
  const sex = sexWord(row)
  return hidden ? `${look} ${sex}, ${hidden}` : `${look} ${sex}`
}

export function percentText(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return '—'
  const scaled = Number(value) <= 1 ? Number(value) * 100 : Number(value)
  const rounded = Math.round(scaled * 10 ** digits) / 10 ** digits
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(digits)}%`
}

function chanceOf(row) {
  const raw = row?.probability
  const value = typeof raw === 'number' ? raw : Number(raw?.probability)
  if (!Number.isFinite(value) || value <= 0) return 0
  return value > 1 ? value / 100 : value
}

/**
 * Chance of one gene, counted across every chick.
 * A gene on every chick is 100%. A gene on half the chicks is 50%.
 * Hidden genes are counted one name at a time, so a chick that carries several splits
 * adds its chance to each gene instead of becoming another copy of the full outcome.
 */
export function geneInheritanceRows(rows, kind) {
  const buckets = new Map()
  const add = (name, probability) => {
    const label = String(name || '').trim()
    if (!label || probability <= 0) return
    buckets.set(label, (buckets.get(label) || 0) + probability)
  }

  for (const row of rows || []) {
    const probability = chanceOf(row)
    if (kind === 'sex') {
      const sex = sexWord(row)
      add(sex === 'cock' ? 'Cock' : sex === 'hen' ? 'Hen' : 'Chick', probability)
      continue
    }
    if (kind === 'base_color') {
      add(outcomeBaseColor(row), probability)
      continue
    }
    if (kind === 'visual_mutation') {
      add(outcomeVisual(row), probability)
      continue
    }
    if (!inheritsSplitGenes(row)) continue
    inheritedSplitNames(row).forEach((name) => add(splitName(name), probability))
  }

  return [...buckets.entries()]
    .map(([trait, probability]) => ({
      trait,
      category: kind,
      probability,
    }))
    .sort((left, right) => right.probability - left.probability || left.trait.localeCompare(right.trait))
}

const BAR_COLORS = ['#1f7a4d', '#2c6e9b', '#c4a035', '#8a4b9a', '#c46b3a', '#3d8b8b', '#6b7c3a', '#9a3d55']

/** A stable color for one graph label so equal chances still read as different birds. */
export function barColor(name, index = 0) {
  const text = String(name || '').toLowerCase()
  if (text.includes('blue')) return '#2c6e9b'
  if (text.includes('green')) return '#1f7a4d'
  if (text.includes('dilute')) return '#c4a035'
  if (text.includes('normal') || text.includes('not split') || text.includes('wild type')) return '#6b7280'
  if (/\bcock\b/.test(text) || text.includes('male')) return '#1d4e89'
  if (/\bhen\b/.test(text) || text.includes('female')) return '#9a3d55'
  if (text.includes('opaline')) return '#8a4b9a'
  if (text.includes('ino')) return '#c46b3a'
  return BAR_COLORS[Math.abs(index) % BAR_COLORS.length]
}
