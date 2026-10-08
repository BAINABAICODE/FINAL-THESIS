import { resolveInheritanceMode } from './inheritanceResolver'

/**
 * Dominance and pigment action for one calculated locus.
 * Statements follow published lovebird inheritance: green dominates the blue
 * series, dark factor and other dominant genes cannot hide as splits, and
 * only named pigment mutations weaken or remove color.
 */

export const DOMINANCE_RULES = [
  {
    group: 'Base color',
    text: 'Wild-type green is dominant to blue, aqua, and turquoise. Dark factor is incomplete dominant on every base color and cannot be hidden as a split.',
  },
  {
    group: 'Visual mutation',
    text: 'A dominant visual mutation shows over the base color with one copy. A recessive visual mutation stays a split until both copies are mutant, or until a hen carries a sex-linked copy.',
  },
  {
    group: 'Split genes',
    text: 'A split is a recessive allele hidden by the dominant wild-type copy. Dominant and incomplete-dominant genes cannot be stored as splits. Only a cock inherits a hidden split.',
  },
]

export function geneGroup(category) {
  const key = String(category || '').toLowerCase()
  if (key === 'chromosomal_sex') return null
  if (key === 'base_color' || key === 'ground_color' || key === 'dark_factor') return 'Base color'
  if (key === 'visual_mutation') return 'Visual mutation'
  if (key === 'split_gene') return 'Split gene'
  return null
}

export function describeGeneAction(locus) {
  const name = String(locus?.name || '').trim()
  const category = locus?.category
  const group = geneGroup(category)
  if (!group || !name) return null

  const mode = locus?.mode || resolveInheritanceMode(locus?.inheritanceType || locus?.inheritance_type, category)
  return {
    name,
    group,
    inheritance: mode.label || locus?.inheritanceType || locus?.inheritance_type || 'Stored rule',
    dominance: dominanceLine(group, mode, name),
    weaken: pigmentEffect(name, category) || 'Does not dissolve or weaken pigment.',
  }
}

export function geneActionsForLoci(loci) {
  const seen = new Set()
  const rows = []
  for (const locus of loci || []) {
    const row = describeGeneAction(locus)
    if (!row) continue
    const key = `${row.group}|${row.name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  return rows
}

function norm(name) {
  return String(name || '').trim().toLowerCase()
}

function isDarkFactor(name) {
  return /dark factor/.test(norm(name))
}

function isIno(name) {
  const text = norm(name)
  if (/pallid|\bpale\b/.test(text)) return false
  return /\bino\b|lutino|albino/.test(text)
}

function weakensEumelanin(name) {
  const text = norm(name)
  if (/pale headed|pale-headed|orange face/.test(text)) return false
  return /dilute|pastel|marbled|edged|cinnamon|fallow|pallid|\bpale\b|greywing|graywing|\bjade\b|misty/.test(text)
}

export function pigmentEffect(name, category) {
  const text = norm(name)
  const group = geneGroup(category)
  if (isDarkFactor(text)) {
    return 'Darkens the base color. It does not dissolve pigment. One copy is darker than none, and two copies are darker still.'
  }
  if (isIno(text)) {
    return 'Dissolves eumelanin. A green bird becomes yellow, and a blue bird becomes white. Ino covers a violet wash.'
  }
  if (/pale headed|pale-headed/.test(text)) {
    return 'Weakens the red mask. On a blue bird the mask pigment is already gone, so pale headed cannot show.'
  }
  if (/orange face/.test(text)) {
    return 'Changes facial psittacin. On a blue bird that facial pigment is already gone, so orange face cannot show.'
  }
  if (weakensEumelanin(text)) {
    return 'Weakens eumelanin, so the base color looks lighter. One hidden copy does not weaken the bird.'
  }
  if (/violet/.test(text)) {
    return 'Adds a violet wash on the base color. Ino covers that wash.'
  }
  if (/pied/.test(text)) {
    return 'Removes pigment in patches. The rest of the bird keeps its base color.'
  }
  if (group === 'Base color') {
    if (/\baqua\b/.test(text) && !/turquoise/.test(text)) {
      return 'Weakens yellow psittacin by about half, so green moves toward blue. One copy stays hidden and the bird stays green.'
    }
    if (/turquoise/.test(text)) {
      return 'Weakens most of the yellow on the body. Some green remains on the wings. One copy stays hidden and the bird stays green.'
    }
    if (/\bblue|teal|seagreen/.test(text)) {
      return 'Removes or strongly reduces yellow psittacin, so green dissolves toward blue. One wild-type copy keeps the bird green.'
    }
  }
  return null
}

function dominanceLine(group, mode, name) {
  const text = norm(name)
  if (group === 'Base color' && isDarkFactor(text)) {
    return 'Incomplete dominant over every base color. It shows on green, blue, aqua, and turquoise. It cannot be a split.'
  }
  if (group === 'Base color' && (mode?.recessive || /aqua|turquoise|\bblue|teal|seagreen/.test(text))) {
    return 'Recessive to wild-type green. Green is dominant, so one mutant copy is a split and the base color stays green.'
  }
  if (group === 'Base color') {
    return 'Wild-type green is dominant to blue, aqua, and turquoise.'
  }
  if (mode?.incomplete) {
    return 'Incomplete dominant over the base color. One copy shows. Two copies show more. It cannot be a split.'
  }
  if (mode?.dominant) {
    return 'Dominant over the base color. One copy shows on the bird. It cannot be a split.'
  }
  if (mode?.sexLinked && mode?.recessive) {
    return 'Recessive on the Z chromosome. A cock hides one copy as a split. A hen shows it. It does not replace the base color while it is hidden.'
  }
  if (mode?.recessive || group === 'Split gene') {
    return 'Recessive to the wild-type allele. While it is a split it does not change the base color or a visual mutation that is already showing.'
  }
  return 'Follows its stored inheritance type. It does not replace the base color.'
}
