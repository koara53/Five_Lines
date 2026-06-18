type StatusPanelProps = {
  playerHp: number
  cpuHp: number
  setNumber: number
  turn: number
}

function Hearts({ value }: { value: number }) {
  return (
    <span className="hearts" aria-label={`${value} HP`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < value ? 'filled' : ''}>
          {index < value ? '■' : '□'}
        </span>
      ))}
    </span>
  )
}

export function StatusPanel({ playerHp, cpuHp, setNumber, turn }: StatusPanelProps) {
  return (
    <section className="status-panel">
      <div>
        <span className="label">Player</span>
        <Hearts value={playerHp} />
      </div>
      <div className="round-indicator">
        <strong>Set {setNumber}</strong>
        <span>{Math.min(turn + 1, 5)} / 5</span>
      </div>
      <div>
        <span className="label">CPU</span>
        <Hearts value={cpuHp} />
      </div>
    </section>
  )
}
