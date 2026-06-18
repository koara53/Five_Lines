import { useState } from 'react'

type BattleLogProps = {
  entries: string[]
}

export function BattleLog({ entries }: BattleLogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section className={`battle-log ${isOpen ? 'is-open' : ''}`} aria-label="バトルログ">
      <div className="battle-log-header">
        <h2>Battle Log</h2>
        <button
          type="button"
          className="ghost-button battle-log-toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? 'ログを閉じる' : 'ログを見る'}
        </button>
      </div>
      <div className="battle-log-body">
        <ol>
          {entries.map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
