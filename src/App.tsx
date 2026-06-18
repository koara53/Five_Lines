import { useMemo, useState } from 'react'
import './App.css'
import { BattleLog } from './components/BattleLog'
import { CardButton } from './components/CardButton'
import { RulesModal } from './components/RulesModal'
import {
  answerContract,
  createInitialGame,
  createPlayerDeck,
  prepareNextDuel,
  prepareNextSet,
  resolveManualTurn,
  resolveNextOpeningTurn,
  startSet,
} from './game/rules'
import {
  CARD_TYPES,
  CONTRACT_TYPES,
  type CardInstance,
  type CardType,
  type ContractType,
  type DisguiseEffect,
  type PlannedMove,
  type ResolvedEffect,
  type Wager,
} from './game/types'

const DISGUISE_EFFECTS: DisguiseEffect[] = ['Attack', 'Guard', 'Heal']
const WAGER_OPTIONS: Wager[] = [1, 2, 3]
const CONTRACT_DETAILS: Record<ContractType, string> = {
  Assault: 'Attackを2回以上命中',
  Defense: 'GuardでAttackを1回以上無効化',
  Deception: 'Disguiseを1回以上使用',
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

function CombatantPanel({
  side,
  hp,
  credit,
  contract,
  wager,
}: {
  side: 'CPU' | 'Player'
  hp: number
  credit: number
  contract?: ContractType
  wager?: Wager
}) {
  return (
    <section className={`combatant-panel ${side === 'CPU' ? 'cpu-panel' : 'player-panel'}`}>
      <div>
        <span className="label">{side}</span>
        <div className="resource-line">
          <Hearts value={hp} />
          <strong>Credit {credit}</strong>
        </div>
      </div>
      <div className="contract-pill">
        <span>Contract</span>
        <strong>{contract ?? '未選択'}</strong>
        {contract && <small>{CONTRACT_DETAILS[contract]} / Stake {wager}</small>}
      </div>
    </section>
  )
}

function BattleCard({
  owner,
  card,
  effect,
}: {
  owner: 'CPU' | 'Player'
  card?: CardInstance
  effect?: ResolvedEffect
}) {
  return (
    <div className={`battle-card ${card ? `card-${card.type.toLowerCase()}` : 'card-unknown'}`}>
      <span className="battle-card-owner">{owner}</span>
      <strong>{card?.type ?? 'Waiting'}</strong>
      <small>{card?.type === 'Disguise' && effect ? `as ${effect}` : effect ? `Effect: ${effect}` : 'カード待機中'}</small>
    </div>
  )
}

function StatTable({
  title,
  values,
}: {
  title: string
  values: Array<{ label: string; value: number | string }>
}) {
  return (
    <div className="stat-table">
      <h3>{title}</h3>
      <dl>
        {values.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function App() {
  const [game, setGame] = useState(createInitialGame)
  const [selectedTypes, setSelectedTypes] = useState<CardType[]>([])
  const [openingPlan, setOpeningPlan] = useState<PlannedMove[]>([])
  const [selectedContract, setSelectedContract] = useState<ContractType>('Assault')
  const [manualCardId, setManualCardId] = useState<string>()
  const [manualDisguiseAs, setManualDisguiseAs] = useState<DisguiseEffect>('Attack')
  const [openingAdvanced, setOpeningAdvanced] = useState(false)
  const [manualResultPending, setManualResultPending] = useState(false)
  const [selectedWager, setSelectedWager] = useState<Wager>(1)
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const plannedCards = useMemo(
    () => createPlayerDeck(selectedTypes, game.setNumber),
    [game.setNumber, selectedTypes],
  )

  const remainingManualCards = game.playerCards.filter((card) => !game.playerUsedIds.includes(card.id))
  const selectedManualCard = remainingManualCards.find((card) => card.id === manualCardId)
  const playerIsDeclarer = game.setNumber % 2 === 1
  const maxPlayerWager = Math.min(3, game.playerCredit, game.cpuCredit)
  const lastPlayerCard = game.lastTurn ? game.playerCards.find((card) => card.id === game.lastTurn?.playerCardId) : undefined
  const lastCpuCard = game.lastTurn ? game.cpuCards.find((card) => card.id === game.lastTurn?.cpuCardId) : undefined
  const showingOpeningResult = game.phase === 'manual' && game.turn > 0 && game.turn <= 3 && !openingAdvanced
  const showingManualResult = game.phase === 'manual' && manualResultPending && game.turn < 5
  const canSelectManualCard = game.phase === 'manual' && game.turn >= 3 && openingAdvanced && !manualResultPending

  function addCard(type: CardType) {
    if (selectedTypes.length >= 5) {
      return
    }

    setSelectedTypes((current) => [...current, type])
    setOpeningPlan([])
  }

  function removeCard(index: number) {
    setSelectedTypes((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setOpeningPlan([])
  }

  function addOpeningCard(card: CardInstance) {
    if (openingPlan.length >= 3 || openingPlan.some((move) => move.cardId === card.id)) {
      return
    }

    setOpeningPlan((current) => [
      ...current,
      {
        cardId: card.id,
        disguiseAs: card.type === 'Disguise' ? 'Attack' : undefined,
      },
    ])
  }

  function updateOpeningDisguise(cardId: string, disguiseAs: DisguiseEffect) {
    setOpeningPlan((current) => current.map((move) => (move.cardId === cardId ? { ...move, disguiseAs } : move)))
  }

  function removeOpeningCard(cardId: string) {
    setOpeningPlan((current) => current.filter((move) => move.cardId !== cardId))
  }

  function beginSet() {
    if (plannedCards.length !== 5 || openingPlan.length !== 3) {
      return
    }

    setGame((current) => startSet(current, plannedCards, openingPlan, selectedContract, selectedWager))
    setOpeningAdvanced(false)
    setManualResultPending(false)
    setManualCardId(undefined)
    setManualDisguiseAs('Attack')
  }

  function showNextCard() {
    if (game.phase !== 'manual') {
      return
    }

    if (game.turn < 3) {
      setGame((current) => resolveNextOpeningTurn(current))
      return
    }

    if (game.turn === 3 && !openingAdvanced) {
      setOpeningAdvanced(true)
      return
    }

    setManualResultPending(false)
  }

  function respondToContract(response: 'Call' | 'Fold') {
    setGame((current) => answerContract(current, response))
    setOpeningAdvanced(false)
    setManualResultPending(false)
    setManualCardId(undefined)
    setManualDisguiseAs('Attack')
  }

  function playManualTurn() {
    if (!selectedManualCard) {
      return
    }

    setGame((current) =>
      resolveManualTurn(current, {
        cardId: selectedManualCard.id,
        disguiseAs: selectedManualCard.type === 'Disguise' ? manualDisguiseAs : undefined,
      }),
    )
    setManualResultPending(true)
    setManualCardId(undefined)
    setManualDisguiseAs('Attack')
  }

  function nextSet() {
    setSelectedTypes([])
    setOpeningPlan([])
    setSelectedContract('Assault')
    setSelectedWager(1)
    setManualCardId(undefined)
    setManualDisguiseAs('Attack')
    setOpeningAdvanced(false)
    setManualResultPending(false)
    setGame((current) => prepareNextSet(current))
  }

  function nextDuel() {
    setSelectedTypes([])
    setOpeningPlan([])
    setSelectedContract('Assault')
    setSelectedWager(1)
    setManualCardId(undefined)
    setManualDisguiseAs('Attack')
    setOpeningAdvanced(false)
    setManualResultPending(false)
    setGame((current) => prepareNextDuel(current))
  }

  function resetGame() {
    setSelectedTypes([])
    setOpeningPlan([])
    setSelectedContract('Assault')
    setSelectedWager(1)
    setManualCardId(undefined)
    setManualDisguiseAs('Attack')
    setOpeningAdvanced(false)
    setManualResultPending(false)
    setGame(createInitialGame())
  }

  function renderBattleStage() {
    const resultMessages =
      game.phase === 'set-ended' || game.phase === 'duel-ended' || game.phase === 'game-over'
        ? (game.lastContractMessages ?? game.lastTurn?.messages ?? [])
        : (game.lastTurn?.messages ?? [])
    const resultTitle =
      game.phase === 'set-ended' || ((game.phase === 'duel-ended' || game.phase === 'game-over') && game.contractsResolved)
        ? '契約判定'
        : game.lastTurn
          ? `${game.lastTurn.turn}手目の結果`
          : 'セット開始待ち'
    const showNextButton =
      game.phase === 'manual' &&
      ((showingOpeningResult && game.turn <= 3) || showingManualResult)

    return (
      <section className="battle-stage">
        <div className="round-indicator">
          <strong>Set {game.setNumber}</strong>
          <span>{game.phase === 'deck-building' ? '準備中' : `${Math.min(Math.max(game.turn, 1), 5)} / 5`}</span>
        </div>
        <div className="pot-strip">
          <span>Declarer: {game.contractDeclarer ?? 'None'}</span>
          <strong>Pot {game.pot}</strong>
          <span>{game.declaredContract ? `${game.declaredContract} / Stake ${game.declaredWager}` : 'No contract'}</span>
        </div>
        <div className="duel-cards">
          <BattleCard owner="CPU" card={lastCpuCard} effect={game.lastTurn?.cpuEffect} />
          <div className="vs-mark">VS</div>
          <BattleCard owner="Player" card={lastPlayerCard} effect={game.lastTurn?.playerEffect} />
        </div>
        <div className="turn-result">
          <span className="label">{resultTitle}</span>
          {resultMessages.length > 0 ? (
            resultMessages.map((message) => <p key={message}>{message}</p>)
          ) : (
            <p>5枚のデッキと最初の3手を決めてください。</p>
          )}
        </div>
        {showNextButton && (
          <button type="button" className="primary-button next-card-button" onClick={showNextCard}>
            次のカードへ
          </button>
        )}
      </section>
    )
  }

  function renderGameResult() {
    const outcome =
      game.playerCredit <= 0 && game.cpuCredit <= 0 ? 'Draw' : game.playerCredit <= 0 ? 'CPU Wins' : 'You Win'
    const totalSets = game.stats.setsPlayed

    return (
      <section className="result-panel match-result">
        <div className="result-summary">
          <span className="label">Match Result</span>
          <h2>{outcome}</h2>
          <p>
            最終HP Player {game.playerHp} / CPU {game.cpuHp}
          </p>
          <p>
            最終Credit Player {game.playerCredit} / CPU {game.cpuCredit}
          </p>
          <p>セット数 {totalSets}</p>
        </div>

        <div className="stats-grid">
          <StatTable
            title="Player 使用カード"
            values={CARD_TYPES.map((type) => ({
              label: type,
              value: game.stats.playerCardUses[type],
            }))}
          />
          <StatTable
            title="CPU 使用カード"
            values={CARD_TYPES.map((type) => ({
              label: type,
              value: game.stats.cpuCardUses[type],
            }))}
          />
          <StatTable
            title="Player 契約"
            values={[
              { label: '成功', value: game.stats.playerContracts.success },
              { label: '失敗', value: game.stats.playerContracts.failure },
            ]}
          />
          <StatTable
            title="CPU 契約"
            values={[
              { label: '成功', value: game.stats.cpuContracts.success },
              { label: '失敗', value: game.stats.cpuContracts.failure },
            ]}
          />
          <StatTable
            title="CPU 契約内訳"
            values={CONTRACT_TYPES.map((contract) => ({
              label: contract,
              value: game.stats.cpuContractChoices[contract],
            }))}
          />
        </div>

        <button type="button" className="primary-button" onClick={resetGame}>
          New Game
        </button>
      </section>
    )
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">Card mind game MVP</p>
          <h1>5手の嘘</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-button" onClick={() => setIsRulesOpen(true)}>
            Rules
          </button>
          <button type="button" className="ghost-button" onClick={resetGame}>
            Reset
          </button>
        </div>
      </header>

      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}

      <CombatantPanel
        side="CPU"
        hp={game.cpuHp}
        credit={game.cpuCredit}
        contract={game.contractDeclarer === 'CPU' ? game.declaredContract : undefined}
        wager={game.contractDeclarer === 'CPU' ? game.declaredWager : undefined}
      />

      {game.phase !== 'deck-building' && renderBattleStage()}

      {game.phase === 'deck-building' && (
        <section className="play-area">
          <div className="panel">
            <div className="panel-heading">
              <h2>Deck</h2>
              <span>{selectedTypes.length} / 5</span>
            </div>
            <div className="card-palette">
              {CARD_TYPES.map((type) => (
                <CardButton key={type} type={type} disabled={selectedTypes.length >= 5} onClick={() => addCard(type)} />
              ))}
            </div>
            <div className="slot-row">
              {Array.from({ length: 5 }, (_, index) => {
                const type = selectedTypes[index]
                return type ? (
                  <CardButton key={`${type}-${index}`} type={type} detail="クリックで外す" onClick={() => removeCard(index)} />
                ) : (
                  <div key={index} className="empty-slot">
                    Empty
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Opening 3</h2>
              <span>{openingPlan.length} / 3</span>
            </div>
            <div className="slot-row">
              {plannedCards.map((card) => (
                <CardButton
                  key={card.id}
                  card={card}
                  selected={openingPlan.some((move) => move.cardId === card.id)}
                  disabled={selectedTypes.length !== 5 || openingPlan.some((move) => move.cardId === card.id)}
                  onClick={() => addOpeningCard(card)}
                />
              ))}
            </div>
            <div className="plan-list">
              {openingPlan.map((move, index) => {
                const card = plannedCards.find((item) => item.id === move.cardId)

                if (!card) {
                  return null
                }

                return (
                  <div key={move.cardId} className="plan-item">
                    <button type="button" onClick={() => removeOpeningCard(move.cardId)}>
                      {index + 1}. {card.type}
                    </button>
                    {card.type === 'Disguise' && (
                      <div className="segmented">
                        {DISGUISE_EFFECTS.map((effect) => (
                          <button
                            type="button"
                            key={effect}
                            className={move.disguiseAs === effect ? 'active' : ''}
                            onClick={() => updateOpeningDisguise(move.cardId, effect)}
                          >
                            {effect}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="primary-button" disabled={plannedCards.length !== 5 || openingPlan.length !== 3} onClick={beginSet}>
              Start Set
            </button>
          </div>

          <div className="panel contract-panel">
            <div className="panel-heading">
              <h2>Contract</h2>
              <span>{playerIsDeclarer ? 'Player declares' : 'CPU declares'}</span>
            </div>
            {playerIsDeclarer ? (
              <>
                <div className="contract-list">
                  {CONTRACT_TYPES.map((contract) => (
                    <button
                      type="button"
                      key={contract}
                      className={selectedContract === contract ? 'active' : ''}
                      onClick={() => setSelectedContract(contract)}
                    >
                      <strong>{contract}</strong>
                      <span>{CONTRACT_DETAILS[contract]}</span>
                    </button>
                  ))}
                </div>
                <div className="wager-picker">
                  <span className="label">Stake Credit</span>
                  <div className="segmented wide">
                    {WAGER_OPTIONS.map((wager) => (
                      <button
                        type="button"
                        key={wager}
                        className={selectedWager === wager ? 'active' : ''}
                        disabled={wager > maxPlayerWager}
                        onClick={() => setSelectedWager(wager)}
                      >
                        {wager}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="contract-note">
                <strong>CPUが契約を宣言します。</strong>
                <span>デッキとOpening 3を確定すると、CPUの契約とStakeが公開されます。</span>
              </div>
            )}
          </div>
        </section>
      )}

      {game.phase === 'contract-response' && (
        <section className="result-panel raise-panel">
          <span className="label">Contract Raise</span>
          <h2>Call or Fold</h2>
          <p>
            CPU declared {game.declaredContract} with Stake {game.declaredWager}. Call Pot:{' '}
            {(game.declaredWager ?? 0) * 2}
          </p>
          <div className="raise-actions">
            <button type="button" className="primary-button" onClick={() => respondToContract('Call')}>
              Call
            </button>
            <button type="button" className="ghost-button danger-button" onClick={() => respondToContract('Fold')}>
              Fold
            </button>
          </div>
        </section>
      )}

      <CombatantPanel
        side="Player"
        hp={game.playerHp}
        credit={game.playerCredit}
        contract={game.contractDeclarer === 'Player' ? game.declaredContract : undefined}
        wager={game.contractDeclarer === 'Player' ? game.declaredWager : undefined}
      />

      {canSelectManualCard && (
        <section className="play-area">
          <div className="panel">
            <div className="panel-heading">
              <h2>Player Cards</h2>
              <span>{game.turn + 1}手目</span>
            </div>
            <div className="slot-row">
              {remainingManualCards.map((card) => (
                <CardButton
                  key={card.id}
                  card={card}
                  selected={manualCardId === card.id}
                  onClick={() => setManualCardId(card.id)}
                />
              ))}
            </div>
            {selectedManualCard?.type === 'Disguise' && (
              <div className="segmented wide">
                {DISGUISE_EFFECTS.map((effect) => (
                  <button
                    type="button"
                    key={effect}
                    className={manualDisguiseAs === effect ? 'active' : ''}
                    onClick={() => setManualDisguiseAs(effect)}
                  >
                    {effect}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="primary-button" disabled={!selectedManualCard} onClick={playManualTurn}>
              Play
            </button>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>CPU Cards</h2>
              <span>Scoutで公開</span>
            </div>
            <div className="slot-row">
              {game.cpuCards.map((card) => {
                const used = game.cpuUsedIds.includes(card.id)
                const revealed = used || game.revealedCpuIds.includes(card.id)

                return (
                  <CardButton
                    key={card.id}
                    card={card}
                    label={used ? `${card.type} Used` : undefined}
                    detail={used ? '使用済み' : undefined}
                    disabled
                    revealed={revealed}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {game.phase === 'set-ended' && (
        <section className="result-panel">
          <h2>Set Complete</h2>
          <p>HPとCreditを引き継いで次のセットへ進みます。</p>
          <button type="button" className="primary-button" onClick={nextSet}>
            Next Set
          </button>
        </section>
      )}

      {game.phase === 'duel-ended' && (
        <section className="result-panel">
          <h2>Duel Complete</h2>
          <p>
            HP決着です。Credit Player {game.playerCredit} / CPU {game.cpuCredit} を持ち越して次のデュエルへ進みます。
          </p>
          <button type="button" className="primary-button" onClick={nextDuel}>
            Next Duel
          </button>
        </section>
      )}

      {game.phase === 'game-over' && renderGameResult()}

      <BattleLog entries={game.log} />
    </main>
  )
}

export default App
