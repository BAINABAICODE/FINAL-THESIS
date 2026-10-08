import './BreedingLesson.css'

const LESSON_STEPS = [
  { id: 'overview', n: '00', engine: 'Look', title: 'Overview', detail: 'Parents and chicks' },
  { id: 'final-output', n: '01', engine: 'Answer', title: 'The result', detail: 'Should you breed them?' },
  { id: 'flow', n: '02', engine: 'Path', title: 'The path', detail: 'RBGIA, then GICA' },
  { id: 'compatibility', n: '03', engine: 'Start', title: 'The two birds', detail: 'Only saved records' },
  { id: 'inheritance', n: '04', engine: 'RBGIA', title: 'How genes pass', detail: 'Mendel and Punnett' },
  { id: 'distribution', n: '05', engine: 'RBGIA', title: 'Possible chicks', detail: 'Looks and hidden genes' },
  { id: 'gica', n: '06', engine: 'GICA', title: 'The score', detail: 'Why the points land here' },
  { id: 'forecast', n: '07', engine: 'Nest', title: 'Eggs and hatch', detail: 'An estimate' },
  { id: 'complexity', n: '08', engine: 'Extra', title: 'Work this run did', detail: 'Time and space' },
]

export function LessonCue({ why, how }) {
  return (
    <div className="lesson-cues">
      <article className="lesson-cue lesson-cue--why">
        <h3>Why</h3>
        <p>{why}</p>
      </article>
      <article className="lesson-cue lesson-cue--how">
        <h3>How</h3>
        <p>{how}</p>
      </article>
    </div>
  )
}

export function MendelianPrimer() {
  return (
    <section className="mendel" aria-labelledby="mendel-title">
      <header className="mendel__head">
        <p className="mendel__kicker">Mendelian rules used by RBGIA</p>
        <h3 id="mendel-title">Three ways a gene can show up in a chick</h3>
        <p>
          Every stored gene follows one of these rules. The Punnett square below applies the rule that belongs to that gene.
        </p>
      </header>
      <div className="mendel__modes">
        <article className="mendel__mode is-dominant">
          <p className="mendel__mode-name">Dominant</p>
          <p>One copy is enough. If either parent passes the mutation, the chick can show it.</p>
        </article>
        <article className="mendel__mode is-recessive">
          <p className="mendel__mode-name">Recessive</p>
          <p>Both parents must pass the mutation before you see it. One copy is a split: hidden, but still heritable.</p>
        </article>
        <article className="mendel__mode is-sex">
          <p className="mendel__mode-name">Sex-linked</p>
          <p>The gene rides the Z chromosome. A cock has two Z copies, so he can hide a recessive allele. A hen has one Z and a W, so she shows the allele on her single Z.</p>
        </article>
      </div>
      <ol className="mendel__laws">
        <li>
          <strong>Law of Segregation.</strong>
          A parent has two copies of a gene and passes only one. That is why the square has the cock’s choices down the side and the hen’s across the top.
        </li>
        <li>
          <strong>Independent assortment.</strong>
          Each gene is crossed on its own. A full chick is those genes combined, which is why one gene’s chance and a whole chick’s chance are not the same bar.
        </li>
        <li>
          <strong>The square is fixed.</strong>
          The same parents always fill the same boxes. RBGIA does not roll a random nest and call that the inheritance.
        </li>
      </ol>
    </section>
  )
}

export default function BreedingLesson({
  activeId,
  onJump,
  children,
}) {
  const current = activeId || LESSON_STEPS[0].id

  const handleJump = (id) => {
    onJump?.(id)
  }

  return (
    <div className="lesson">
      <nav className="lesson-nav" aria-label="Breeding lesson">
        {LESSON_STEPS.map((step) => {
          const selected = current === step.id
          return (
            <a
              key={step.id}
              href={`#process-${step.id}`}
              className={`lesson-nav__btn${selected ? ' is-current' : ''}`}
              aria-current={selected ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault()
                handleJump(step.id)
              }}
            >
              <span className="lesson-nav__n">{step.n}</span>
              <span className="lesson-nav__copy">
                <span className="lesson-nav__engine">{step.engine}</span>
                <span className="lesson-nav__title">{step.title}</span>
                <span className="lesson-nav__detail">{step.detail}</span>
              </span>
            </a>
          )
        })}
      </nav>

      <div className="lesson-stack">
        {children}
      </div>
    </div>
  )
}
