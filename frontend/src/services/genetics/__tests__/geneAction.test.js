import { describe, expect, it } from 'vitest'
import { describeGeneAction, geneActionsForLoci } from '../geneAction'

describe('gene action', () => {
  it('treats green as dominant to the blue series and dark factor as a darkening dosage', () => {
    const green = describeGeneAction({ name: 'Green', category: 'base_color', inheritance_type: 'Wild type' })
    const dark = describeGeneAction({ name: 'Dark factor (D)', category: 'base_color', inheritance_type: 'Incomplete dominant' })
    const aqua = describeGeneAction({ name: 'Aqua', category: 'base_color', inheritance_type: 'Autosomal recessive' })

    expect(green.dominance).toMatch(/dominant to blue, aqua, and turquoise/i)
    expect(green.weaken).toMatch(/does not dissolve/i)
    expect(dark.dominance).toMatch(/cannot be a split/i)
    expect(dark.weaken).toMatch(/darkens/i)
    expect(aqua.dominance).toMatch(/recessive to wild-type green/i)
    expect(aqua.weaken).toMatch(/about half/i)
  })

  it('marks ino as dissolving pigment and dilute as only weakening when visual', () => {
    const ino = describeGeneAction({ name: 'SL Ino', category: 'visual_mutation', inheritance_type: 'Sex-linked recessive' })
    const dilute = describeGeneAction({ name: 'Dilute', category: 'split_gene', inheritance_type: 'Autosomal recessive' })

    expect(ino.dominance).toMatch(/cock hides one copy/i)
    expect(ino.weaken).toMatch(/dissolves eumelanin/i)
    expect(dilute.group).toBe('Split gene')
    expect(dilute.dominance).toMatch(/does not change the base color/i)
    expect(dilute.weaken).toMatch(/one hidden copy does not weaken/i)
  })

  it('skips sex and repeats of the same gene', () => {
    const rows = geneActionsForLoci([
      { name: 'Sex', category: 'chromosomal_sex', inheritance_type: 'Chromosomal sex' },
      { name: 'Violet', category: 'visual_mutation', inheritance_type: 'Incomplete dominant' },
      { name: 'Violet', category: 'visual_mutation', inheritance_type: 'Incomplete dominant' },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].weaken).toMatch(/ino covers/i)
    expect(rows[0].dominance).toMatch(/cannot be a split/i)
  })
})
