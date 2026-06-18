import { ruleSections } from '../content/rules'

type RulesModalProps = {
  onClose: () => void
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div className="rules-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rules-modal-header">
          <div>
            <p className="eyebrow">Rulebook</p>
            <h2 id="rules-modal-title">5手の嘘 ルールブック</h2>
          </div>
          <button type="button" className="ghost-button rules-close-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="rules-modal-body">
          {ruleSections.map((section, sectionIndex) => (
            <article key={section.title} className="rule-section">
              <h3>
                {sectionIndex + 1}. {section.title}
              </h3>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {section.subsections?.map((subsection) => (
                <div key={subsection.title} className="rule-subsection">
                  <h4>{subsection.title}</h4>
                  {subsection.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {subsection.bullets && (
                    <ul>
                      {subsection.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
