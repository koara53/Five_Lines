type BattleLogProps = {
  entries: string[]
}

export function BattleLog({ entries }: BattleLogProps) {
  return (
    <section className="battle-log" aria-label="バトルログ">
      <h2>Battle Log</h2>
      <ol>
        {entries.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </section>
  )
}
