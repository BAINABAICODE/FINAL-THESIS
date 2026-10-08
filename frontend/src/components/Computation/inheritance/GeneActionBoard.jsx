import { DOMINANCE_RULES, geneActionsForLoci } from '../../../services/genetics/geneAction'

export default function GeneActionBoard({ loci }) {
  const rows = geneActionsForLoci(loci)
  return (
    <div className="compute-gene-action">
      <h3>What is dominant, and what can weaken the color</h3>
      <p className="compute-result__empty">
        Dominance is read against the base color, the visual mutation, and the split. A gene weakens or dissolves color only when that effect is already documented for it.
      </p>
      <ul className="compute-result__list">
        {DOMINANCE_RULES.map((rule) => (
          <li key={rule.group}><strong>{rule.group}.</strong> {rule.text}</li>
        ))}
      </ul>
      {rows.length ? (
        <div className="gx-table-wrap">
          <table className="gx-table">
            <caption className="gx-visually-hidden">Dominance and pigment action for the genes in this pair</caption>
            <thead>
              <tr>
                <th scope="col">Gene</th>
                <th scope="col">Group</th>
                <th scope="col">Inheritance</th>
                <th scope="col">Dominant to</th>
                <th scope="col">Dissolve or weaken</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.group}-${row.name}`}>
                  <th scope="row">{row.name}</th>
                  <td>{row.group}</td>
                  <td>{row.inheritance}</td>
                  <td>{row.dominance}</td>
                  <td>{row.weaken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="compute-result__empty">This pair has no calculated base color, visual mutation, or split gene to classify.</p>
      )}
    </div>
  )
}
