import { buildPhenotypeRegions } from '../../../services/genetics/phenotypeRegions'
import { GenotypeBadge, SexBadge } from '../shared/primitives'

const MEANING = {
  non_carrier: 'Wild type',
  carrier_split: 'Hidden. One copy only.',
  visual: 'Shows this gene',
  visual_homozygous: 'Shows this gene. Two copies.',
  visual_heterozygous: 'Shows this gene. One copy.',
  visual_hemizygous: 'Shows this gene',
  hemizygous_wild: 'Wild type',
  visual_single_factor: 'Shows once',
  visual_double: 'Shows stronger',
  visual_double_factor: 'Shows stronger',
  visual_compound: 'Shows a mix of two alleles',
}

function chickLook(phenotype) {
  if (phenotype.baseColor) return plainColor(phenotype.baseColor)
  if (phenotype.visualMutations?.length) return phenotype.visualMutations.join(' · ')
  if (phenotype.splitHidden?.length) return `Carries ${phenotype.splitHidden.join(' · ')}`
  if (phenotype.visual) return 'Visible change'
  return 'No extra color from this gene'
}

function plainColor(value) {
  let text = String(value || '').trim()
  text = text.replace(/\s+expression$/i, '')
  const wrapped = text.match(/ground color \(([^)]+)\)/i)
  return wrapped ? wrapped[1] : text
}

function extraParts(phenotype, look) {
  const regions = buildPhenotypeRegions({
    phenotype: phenotype.phenotype,
    baseColor: phenotype.baseColor,
    visualMutations: phenotype.visualMutations,
  })
  return regions.filter((region) => region.specified && !look.toLowerCase().includes(String(region.value).toLowerCase()))
}

export default function PhenotypeMapping({ locus }) {
  if (!locus.outcomes.length) return <p className="gx-muted">No genotypes to map.</p>
  return (
    <ol className="gx-mapping">
      {locus.outcomes.map((outcome) => {
        const p = outcome.phenotype
        const look = chickLook(p)
        const extras = extraParts(p, look)
        return (
          <li key={`${outcome.sex}-${outcome.genotype}`} className="gx-mapping__row">
            <div className="gx-mapping__geno">
              <GenotypeBadge genotype={outcome.genotype} />
              {outcome.sex !== 'both' ? <SexBadge sex={outcome.sex} label={outcome.sex === 'cock' ? 'Son' : 'Daughter'} /> : null}
            </div>
            <p className="gx-mapping__mean">{MEANING[p.expression] || p.expressionLabel || 'Result'}</p>
            <p className="gx-mapping__look">{look}</p>
            {extras.length ? (
              <p className="gx-mapping__parts">{extras.map((part) => `${part.label}: ${part.value}`).join(' · ')}</p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
