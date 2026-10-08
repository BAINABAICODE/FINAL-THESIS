function plainSex(value) {
  const text = String(value || '').toLowerCase()
  if (text.includes('female') || text.includes('hen')) return 'Female'
  if (text.includes('male') || text.includes('cock')) return 'Male'
  return 'Sex not saved'
}

function chromosomes(sex) {
  const text = String(sex || '').toLowerCase()
  if (text === 'cock' || text === 'male') return 'ZZ'
  if (text === 'hen' || text === 'female') return 'ZW'
  return null
}

function geneLines(list) {
  return (list || [])
    .map((item) => {
      if (typeof item === 'string') return { name: item.replace(/\bSplit\s+/gi, ''), code: null }
      const name = String(item?.name || '').replace(/\bSplit\s+/gi, '').trim()
      if (!name) return null
      return { name, code: item?.genetic_code || null }
    })
    .filter(Boolean)
}

function doseMeaning(code, none, one, two) {
  if (!code) return null
  const changed = String(code).split(/[/|]/).filter((allele) => allele && !allele.endsWith('+') && allele.toUpperCase() !== 'W')
  if (changed.length === 0) return none
  if (changed.length === 1) return one
  return two
}

function Fact({ title, detail, empty = 'Not saved' }) {
  return (
    <div className="pair-fact">
      <p className="pair-fact__title">{title || empty}</p>
      {detail ? <p className="pair-fact__detail">{detail}</p> : null}
    </div>
  )
}

function GeneList({ list, empty }) {
  const lines = geneLines(list)
  if (!lines.length) return <Fact title={empty} />
  return (
    <ul className="pair-genes">
      {lines.map((line) => (
        <li key={`${line.name}-${line.code || ''}`}>
          <strong>{line.name}</strong>
          {line.code ? <span>{line.code}</span> : null}
        </li>
      ))}
    </ul>
  )
}

function parentFacts(parent, speciesSide) {
  const colorCode = parent.base_color?.genetic_code?.split('|')[0] || null
  const darkCode = parent.base_color?.genetic_code?.includes('|')
    ? parent.base_color.genetic_code.split('|')[1]
    : null
  const sex = plainSex(parent.sex_label || parent.sex)
  const chromo = chromosomes(parent.sex)

  return {
    id: parent.bird_id || '—',
    sex,
    sexClass: sex === 'Female' ? 'hen' : sex === 'Male' ? 'cock' : 'both',
    species: parent.species?.common_name || speciesSide?.species || 'Not saved',
    scientific: parent.species?.scientific_name || speciesSide?.scientific_name || null,
    age: parent.age_months != null ? `${parent.age_months} months` : 'Age not saved',
    chromo,
    color: parent.base_color?.name || 'Not saved',
    colorDetail: colorCode
      ? `${doseMeaning(colorCode, 'Usual color', 'One changed copy', 'Both copies changed')} · ${colorCode}`
      : null,
    dark: doseMeaning(darkCode, 'No dark factor', 'One dark factor', 'Two dark factors') || 'Not saved',
    darkDetail: darkCode || null,
    visuals: parent.visual_mutations,
    hidden: parent.split_genes,
    grandparents: parent.grandparents_recorded ? `${parent.grandparents_recorded} saved` : 'Not saved',
  }
}

function CompareRow({ label, left, right }) {
  return (
    <div className="pair-row">
      <p className="pair-row__label">{label}</p>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

export default function ParentGeneticProfile({ snapshot, species }) {
  const left = parentFacts(snapshot?.parent_1 || {}, species?.parent1)
  const right = parentFacts(snapshot?.parent_2 || {}, species?.parent2)

  return (
    <div className="pair-sheet">
      <div className="pair-sheet__head">
        <span className="pair-sheet__corner">Compared</span>
        {[left, right].map((parent, index) => (
          <p key={parent.id} className={`pair-sheet__who is-${parent.sexClass}`}>
            <span>{`Parent ${index + 1}`}</span>
            <strong>{parent.id}</strong>
            <small>{parent.sex}{parent.chromo ? ` · ${parent.chromo}` : ''}</small>
          </p>
        ))}
      </div>

      <section className="pair-group">
        <h4>Who</h4>
        <CompareRow
          label="Species"
          left={<Fact title={left.species} detail={left.scientific} />}
          right={<Fact title={right.species} detail={right.scientific} />}
        />
        <CompareRow
          label="Age"
          left={<Fact title={left.age} />}
          right={<Fact title={right.age} />}
        />
      </section>

      <section className="pair-group">
        <h4>Color</h4>
        <CompareRow
          label="Look"
          left={<Fact title={left.color} detail={left.colorDetail} />}
          right={<Fact title={right.color} detail={right.colorDetail} />}
        />
        <CompareRow
          label="Dark"
          left={<Fact title={left.dark} detail={left.darkDetail} />}
          right={<Fact title={right.dark} detail={right.darkDetail} />}
        />
      </section>

      <section className="pair-group">
        <h4>What you can see</h4>
        <CompareRow
          label="Mutations"
          left={<GeneList list={left.visuals} empty="None" />}
          right={<GeneList list={right.visuals} empty="None" />}
        />
      </section>

      <section className="pair-group">
        <h4>Hidden</h4>
        <CompareRow
          label="Genes"
          left={<GeneList list={left.hidden} empty="None" />}
          right={<GeneList list={right.hidden} empty="None" />}
        />
        <CompareRow
          label="Grandparents"
          left={<Fact title={left.grandparents} />}
          right={<Fact title={right.grandparents} />}
        />
      </section>

      <p className="gx-note">Saved on each bird when this pair was checked. A blank field stays blank.</p>
    </div>
  )
}
