import { describe, expect, it } from 'vitest'
import { FISCHER_IMAGES, FISCHER_MUTATIONS_WITHOUT_IMAGES, FISCHER_UNMATCHED_MUTATION_IMAGES } from '../../../assets/mutations/fischers.images'
import { MUTATION_IMAGES, MUTATIONS_WITHOUT_IMAGES, UNMATCHED_MUTATION_IMAGES, WILD_TYPE_KEY } from '../../../assets/mutations/mutations.images'
import { baseColorSeries, buildInheritanceRows, resolveMutationVisual } from './eggCardModel'

describe('mutation photos', () => {
  it('maps one visual mutation to its reference photo', () => {
    const visual = resolveMutationVisual(['Cinnamon'])
    expect(visual.key).toBe('cinnamon')
    expect(visual.usedFallback).toBe(false)
    expect(visual.chip).toBe('Cinnamon')
    expect(visual.image).toBe(MUTATION_IMAGES.cinnamon.image)
    expect(visual.extras).toEqual([])
  })

  it('keeps a combination on the main photo plus extra chips', () => {
    const visual = resolveMutationVisual(['Opaline', 'Violet'])
    expect(visual.key).toBe('opaline')
    expect(visual.extras).toEqual(['Violet'])
  })

  it('uses the wild-type photo when that mutation has no image', () => {
    expect(UNMATCHED_MUTATION_IMAGES).toEqual([])
    expect(MUTATIONS_WITHOUT_IMAGES).toContain('pallid')
    expect(MUTATION_IMAGES.pallid).toBeUndefined()
    const visual = resolveMutationVisual(['Pallid'])
    expect(visual.usedFallback).toBe(true)
    expect(visual.chip).toBe('Pallid')
    expect(visual.key).toBe(WILD_TYPE_KEY)
    expect(visual.image).toBe(MUTATION_IMAGES[WILD_TYPE_KEY].image)
  })

  it('uses wild type when the chick shows no visual mutation', () => {
    const visual = resolveMutationVisual([])
    expect(visual.key).toBe('wild-type')
    expect(visual.usedFallback).toBe(false)
    expect(visual.chip).toBe('Wild Type')
  })

  it('uses the green Fischer photo when the base color is in the green series', () => {
    const visual = resolveMutationVisual(['Dilute'], {
      species: "Fischer's lovebird",
      baseColor: 'Dark Green',
    })
    expect(baseColorSeries('Dark Green')).toBe('green')
    expect(visual.usedFallback).toBe(false)
    expect(visual.image).toBe(FISCHER_IMAGES.dilute.default.image)
    expect(visual.image).not.toBe(MUTATION_IMAGES.dilute.image)
  })

  it('uses the blue Fischer photo when the base color is in the blue series', () => {
    const visual = resolveMutationVisual(['Dilute'], {
      species: { id: 2, common_name: "Fischer's lovebird" },
      baseColor: 'Cobalt Blue2',
    })
    expect(baseColorSeries('Cobalt Blue2')).toBe('blue')
    expect(visual.image).toBe(FISCHER_IMAGES.dilute.blue.image)
    expect(visual.alt).toMatch(/blue-series/)
  })

  it('shows the mutation photo on aqua when that photo exists', () => {
    const dilute = resolveMutationVisual(['Dilute'], {
      species: "Fischer's lovebird",
      baseColor: 'Aqua',
    })
    const cinnamon = resolveMutationVisual(['Cinnamon'], {
      species: "Fischer's lovebird",
      baseColor: 'Aqua',
    })
    const paleFallow = resolveMutationVisual(['Pale Fallow'], {
      species: "Fischer's lovebird",
      baseColor: 'Aqua',
    })
    expect(baseColorSeries('Aqua')).toBe('other')
    expect(dilute.usedFallback).toBe(false)
    expect(dilute.image).toBe(FISCHER_IMAGES.dilute.default.image)
    expect(cinnamon.image).toBe(FISCHER_IMAGES.cinnamon.default.image)
    expect(paleFallow.image).toBe(FISCHER_IMAGES['pale-fallow'].green.image)
  })

  it('shows the mutation photo when the base color is not the blue or green file', () => {
    const cinnamonOnBlue = resolveMutationVisual(['Cinnamon'], {
      species: "Fischer's lovebird",
      baseColor: 'Blue2',
    })
    const euwingOnBlue = resolveMutationVisual(['Euwing'], {
      species: "Fischer's lovebird",
      baseColor: 'Cobalt Blue1',
    })
    const piedOnAquaBlue = resolveMutationVisual(['Recessive Pied'], {
      species: "Fischer's lovebird",
      baseColor: 'AquaBlue1',
    })
    expect(cinnamonOnBlue.usedFallback).toBe(false)
    expect(cinnamonOnBlue.image).toBe(FISCHER_IMAGES.cinnamon.default.image)
    expect(euwingOnBlue.image).toBe(FISCHER_IMAGES.euwing.default.image)
    expect(piedOnAquaBlue.image).toBe(FISCHER_IMAGES['recessive-pied'].green.image)
    expect(piedOnAquaBlue.image).not.toBe(FISCHER_IMAGES['wild-type'].default.image)
  })

  it('picks the labeled green or blue file for a mutation that has both', () => {
    const green = resolveMutationVisual(['Pale Fallow'], {
      species: "Fischer's lovebird",
      baseColor: 'Olive',
    })
    const blue = resolveMutationVisual(['Recessive Pied'], {
      species: "Fischer's lovebird",
      baseColor: 'Blue1',
    })
    expect(green.image).toBe(FISCHER_IMAGES['pale-fallow'].green.image)
    expect(blue.image).toBe(FISCHER_IMAGES['recessive-pied'].blue.image)
  })

  it('shows the Dun Fallow photo on any base color, including aqua', () => {
    expect(FISCHER_UNMATCHED_MUTATION_IMAGES).toEqual([])
    expect(FISCHER_MUTATIONS_WITHOUT_IMAGES).toEqual([])
    const green = resolveMutationVisual(['Dun Fallow'], {
      species: "Fischer's lovebird",
      baseColor: 'Green',
    })
    const aqua = resolveMutationVisual(['Dun Fallow'], {
      species: "Fischer's lovebird",
      baseColor: 'Aqua',
    })
    expect(green.usedFallback).toBe(false)
    expect(green.chip).toBe('Dun Fallow')
    expect(green.image).toBe(FISCHER_IMAGES['dun-fallow'].default.image)
    expect(aqua.image).toBe(FISCHER_IMAGES['dun-fallow'].default.image)
    expect(aqua.image).not.toBe(FISCHER_IMAGES['wild-type'].default.image)
  })
})

describe('inheritance rows', () => {
  it('reads a visual mutation passed by both parents', () => {
    const [row] = buildInheritanceRows({
      sex: 'cock',
      loci: [{
        name: 'Dilute',
        category: 'visual_mutation',
        inheritance_type: 'Autosomal recessive',
        expression: 'visual',
        from_cock: 'dil',
        from_hen: 'dil',
        probability: 0.25,
      }],
    })
    expect(row.badge).toBe('Visual')
    expect(row.notation).toBe('Dilute')
    expect(row.source).toBe('Both')
    expect(row.percent).toBe(25)
    expect(row.father).toBe('mutant')
    expect(row.mother).toBe('mutant')
  })

  it('writes a split as Normal / mutation from the parent who passed it', () => {
    const [row] = buildInheritanceRows({
      sex: 'cock',
      loci: [{
        name: 'Dilute',
        category: 'visual_mutation',
        inheritance_type: 'Autosomal recessive',
        expression: 'carrier_split',
        from_cock: 'dil+',
        from_hen: 'dil',
        probability: 0.5,
      }],
    })
    expect(row.badge).toBe('Split')
    expect(row.notation).toBe('Normal / Dilute')
    expect(row.source).toBe('Mother')
    expect(row.percent).toBe(50)
    expect(row.father).toBe('wild')
    expect(row.mother).toBe('mutant')
  })

  it('gives a sex-linked hen one allele from the father', () => {
    const [row] = buildInheritanceRows({
      sex: 'hen',
      sex_label: 'Female / Hen',
      loci: [{
        name: 'SL Ino',
        category: 'visual_mutation',
        inheritance_type: 'Sex-linked recessive',
        expression: 'visual_hemizygous',
        from_cock: 'ino',
        from_hen: 'W',
        probability: 0.5,
      }],
    })
    expect(row.badge).toBe('Visual')
    expect(row.notation).toBe('SL Ino')
    expect(row.source).toBe('Father')
    expect(row.father).toBe('mutant')
    expect(row.mother).toBe('w')
    expect(row.hint).toMatch(/one Z allele/)
  })

  it('reads a stored Punnett chance when the egg only kept the alleles', () => {
    const [row] = buildInheritanceRows({
      sex: 'cock',
      passed_from_parents: [{
        locus: 'Ground color (Aqua)',
        category: 'base_color',
        from_cock: 'blaq',
        from_hen: 'bl+',
        chick_genotype: 'bl+/blaq',
        expression: 'carrier_split',
        basis: 'mendelian',
      }],
    }, [{
      name: 'Ground color (Aqua)',
      results: [{ genotype: 'bl+/blaq', sex: 'both', probability: 1, expression: 'carrier_split' }],
    }])
    expect(row.notation).toBe('Normal / Aqua')
    expect(row.badge).toBe('Split')
    expect(row.source).toBe('Father')
    expect(row.percent).toBe(100)
  })

  it('matches a sex-linked cock when the egg sex is a display label', () => {
    const [row] = buildInheritanceRows({
      sex: 'Male / Cock',
      passed_from_parents: [{
        locus: 'Cinnamon',
        category: 'split_gene',
        from_cock: 'cin',
        from_hen: 'cin+',
        chick_genotype: 'cin+/cin',
        expression: 'carrier_split',
        basis: 'chromosomal',
      }],
    }, [{
      name: 'Cinnamon',
      inheritance_type: 'Sex-linked recessive',
      results: [
        { genotype: 'cin+/cin+', sex: 'cock', probability: 0.25, expression: 'non_carrier' },
        { genotype: 'cin+/cin', sex: 'cock', probability: 0.25, expression: 'carrier_split' },
      ],
    }])
    expect(row.badge).toBe('Carrier')
    expect(row.notation).toBe('Normal / Cinnamon')
    expect(row.percent).toBe(25)
  })

  it('marks a sex-linked cock as a carrier with both Z alleles', () => {
    const [row] = buildInheritanceRows({
      sex: 'cock',
      sex_label: 'Male / Cock',
      loci: [{
        name: 'Cinnamon',
        category: 'visual_mutation',
        inheritance_type: 'Sex-linked recessive',
        expression: 'carrier_split',
        from_cock: 'cin+',
        from_hen: 'cin',
        probability: 0.25,
      }],
    })
    expect(row.badge).toBe('Carrier')
    expect(row.notation).toBe('Normal / Cinnamon')
    expect(row.source).toBe('Mother')
    expect(row.father).toBe('wild')
    expect(row.mother).toBe('mutant')
    expect(row.hint).toMatch(/two Z alleles/)
  })
})
