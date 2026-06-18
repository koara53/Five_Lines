import {
  chooseCpuContract,
  chooseCpuContractResponse,
  chooseCpuManualMove,
  chooseCpuPersonality,
  chooseCpuRaiseStake,
  createCpuDeck,
  createCpuOpeningPlan,
  getCpuPersonalityHint,
  getCpuSetIntentHint,
  randomDisguiseEffect,
} from './cpu'
import { CARD_TYPES, CONTRACT_TYPES } from './types'
import type {
  CardInstance,
  CardType,
  ContractProgress,
  ContractResponse,
  ContractType,
  DisguiseEffect,
  GameState,
  MatchStats,
  Phase,
  PlannedMove,
  PlayedMove,
  ResolvedEffect,
  TurnRecord,
  Wager,
} from './types'

const MAX_HP = 5
const INITIAL_CREDIT = 10

const EMPTY_CONTRACT_PROGRESS: ContractProgress = {
  attackHits: 0,
  guardBlocks: 0,
  disguiseUses: 0,
}

const CONTRACT_DESCRIPTIONS: Record<ContractType, string> = {
  Assault: 'Attackを2回以上命中させる',
  Defense: 'GuardでAttackを1回以上無効化する',
  Deception: 'Disguiseを1回以上使用する',
}

function createEmptyMatchStats(): MatchStats {
  return {
    setsPlayed: 0,
    playerCardUses: createEmptyCardUsageStats(),
    cpuCardUses: createEmptyCardUsageStats(),
    playerContracts: { success: 0, failure: 0 },
    cpuContracts: { success: 0, failure: 0 },
    cpuContractChoices: createEmptyContractChoiceStats(),
  }
}

function createEmptyCardUsageStats() {
  return Object.fromEntries(CARD_TYPES.map((type) => [type, 0])) as MatchStats['playerCardUses']
}

function createEmptyContractChoiceStats() {
  return Object.fromEntries(CONTRACT_TYPES.map((contract) => [contract, 0])) as MatchStats['cpuContractChoices']
}

function getContractDeclarer(setNumber: number) {
  return setNumber % 2 === 1 ? 'Player' : 'CPU'
}

function getMaxWager(state: GameState, declarer: 'Player' | 'CPU') {
  const declarerCredit = declarer === 'Player' ? state.playerCredit : state.cpuCredit
  const responderCredit = declarer === 'Player' ? state.cpuCredit : state.playerCredit

  return Math.max(1, Math.min(3, declarerCredit, responderCredit))
}

function clampWager(wager: Wager, maxWager: number): Wager {
  return Math.min(wager, maxWager) as Wager
}

export function createInitialGame(): GameState {
  return {
    phase: 'deck-building',
    setNumber: 1,
    turn: 0,
    playerHp: MAX_HP,
    cpuHp: MAX_HP,
    playerCredit: INITIAL_CREDIT,
    cpuCredit: INITIAL_CREDIT,
    cpuPersonality: chooseCpuPersonality(),
    contractActive: false,
    pot: 0,
    playerContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    cpuContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    contractsResolved: false,
    playerCards: [],
    cpuCards: [],
    playerOpeningPlan: [],
    cpuOpeningPlan: [],
    playerUsedIds: [],
    cpuUsedIds: [],
    revealedCpuIds: [],
    stats: createEmptyMatchStats(),
    lastContractMessages: undefined,
    log: ['ゲーム開始。5枚のカード構成を選んでください。'],
  }
}

export function createPlayerDeck(types: CardType[], setNumber: number): CardInstance[] {
  return types.map((type, index) => ({
    id: `player-${setNumber}-${index}-${type}`,
    type,
  }))
}

export function startSet(
  state: GameState,
  playerCards: CardInstance[],
  playerOpeningPlan: PlannedMove[],
  playerContract: ContractType,
  playerWager: Wager,
  random = Math.random,
): GameState {
  const cpuCards = createCpuDeck(state.setNumber, state.cpuPersonality, state.playerHp, state.cpuHp, random)
  const declarer = getContractDeclarer(state.setNumber)
  const cpuContract = chooseCpuContract(cpuCards, state.cpuHp, state.playerHp, random)
  const cpuWager = chooseCpuRaiseStake(state.cpuHp, state.playerHp, state.cpuCredit, state.playerCredit, random)
  const declaredContract = declarer === 'Player' ? playerContract : cpuContract
  const declaredWager = clampWager(declarer === 'Player' ? playerWager : cpuWager, getMaxWager(state, declarer))
  const stats: MatchStats = {
    ...state.stats,
    setsPlayed: state.stats.setsPlayed + 1,
    cpuContractChoices:
      declarer === 'CPU'
        ? {
            ...state.stats.cpuContractChoices,
            [cpuContract]: state.stats.cpuContractChoices[cpuContract] + 1,
          }
        : state.stats.cpuContractChoices,
  }
  const nextState: GameState = {
    ...state,
    phase: declarer === 'CPU' ? 'contract-response' : 'manual',
    turn: 0,
    contractDeclarer: declarer,
    declaredContract,
    declaredWager,
    contractResponse: undefined,
    contractActive: false,
    pot: 0,
    playerContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    cpuContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    contractsResolved: false,
    playerCards,
    cpuCards,
    playerOpeningPlan,
    cpuOpeningPlan: createCpuOpeningPlan(cpuCards, state.cpuPersonality, state.playerHp, random),
    playerUsedIds: [],
    cpuUsedIds: [],
    revealedCpuIds: [],
    stats,
    lastTurn: undefined,
    lastContractMessages: undefined,
    log: [
      getCpuSetIntentHint(cpuCards, state.cpuHp, state.playerHp),
      getCpuPersonalityHint(state.cpuPersonality),
      `契約宣言: ${declarer}が${declaredContract}(${CONTRACT_DESCRIPTIONS[declaredContract]})に${declaredWager} Creditを提示。`,
      ...state.log,
    ],
  }

  if (declarer === 'Player') {
    const response = chooseCpuContractResponse(declaredContract, declaredWager, cpuCards, state.cpuHp, state.cpuCredit, random)
    return answerContract(nextState, response, random)
  }

  return nextState
}

export function answerContract(state: GameState, response: ContractResponse, random = Math.random): GameState {
  if (state.phase !== 'contract-response' && state.phase !== 'manual') {
    return state
  }

  if (!state.contractDeclarer || !state.declaredContract || !state.declaredWager) {
    return state
  }

  const declarer = state.contractDeclarer
  const responder = declarer === 'Player' ? 'CPU' : 'Player'
  let playerCredit = state.playerCredit
  let cpuCredit = state.cpuCredit
  const messages: string[] = []

  if (response === 'Fold') {
    if (responder === 'Player') {
      playerCredit = Math.max(0, playerCredit - 1)
      cpuCredit += state.playerCredit > 0 ? 1 : 0
    } else {
      cpuCredit = Math.max(0, cpuCredit - 1)
      playerCredit += state.cpuCredit > 0 ? 1 : 0
    }

    messages.push(`${responder} Fold。${declarer}へ1 Creditを支払い、契約は実行されません。`)
  } else {
    messages.push(`${responder} Call。Pot ${state.declaredWager * 2}で契約勝負を開始。`)
  }

  const next: GameState = {
    ...state,
    phase: 'manual',
    playerCredit,
    cpuCredit,
    contractResponse: response,
    contractActive: response === 'Call',
    pot: response === 'Call' ? state.declaredWager * 2 : 0,
    log: [`セット${state.setNumber}開始。最初の3手は予約カードを1手ずつ解決します。`, ...messages, ...state.log],
  }

  if (next.playerCredit <= 0 || next.cpuCredit <= 0) {
    return withPhaseAfterTurn(next)
  }

  return resolveNextOpeningTurn(next, random)
}

export function prepareNextSet(state: GameState): GameState {
  if (state.playerCredit <= 0 || state.cpuCredit <= 0) {
    return { ...state, phase: 'game-over' }
  }

  return {
    ...state,
    phase: 'deck-building',
    setNumber: state.setNumber + 1,
    turn: 0,
    contractDeclarer: undefined,
    declaredContract: undefined,
    declaredWager: undefined,
    contractResponse: undefined,
    contractActive: false,
    pot: 0,
    playerContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    cpuContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    contractsResolved: false,
    playerCards: [],
    cpuCards: [],
    playerOpeningPlan: [],
    cpuOpeningPlan: [],
    playerUsedIds: [],
    cpuUsedIds: [],
    revealedCpuIds: [],
    lastTurn: undefined,
    lastContractMessages: undefined,
    log: [`次のセットへ。5枚のカード構成を選んでください。`, ...state.log],
  }
}

export function prepareNextDuel(state: GameState): GameState {
  if (state.playerCredit <= 0 || state.cpuCredit <= 0) {
    return { ...state, phase: 'game-over' }
  }

  return {
    ...state,
    phase: 'deck-building',
    setNumber: 1,
    turn: 0,
    playerHp: MAX_HP,
    cpuHp: MAX_HP,
    cpuPersonality: chooseCpuPersonality(),
    contractDeclarer: undefined,
    declaredContract: undefined,
    declaredWager: undefined,
    contractResponse: undefined,
    contractActive: false,
    pot: 0,
    playerContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    cpuContractProgress: { ...EMPTY_CONTRACT_PROGRESS },
    contractsResolved: false,
    playerCards: [],
    cpuCards: [],
    playerOpeningPlan: [],
    cpuOpeningPlan: [],
    playerUsedIds: [],
    cpuUsedIds: [],
    revealedCpuIds: [],
    lastTurn: undefined,
    lastContractMessages: undefined,
    log: [`次のデュエルへ。HPを5に戻し、Creditは持ち越します。`, ...state.log],
  }
}

export function resolveNextOpeningTurn(state: GameState, random = Math.random): GameState {
  if (state.phase !== 'manual' || state.turn >= 3) {
    return state
  }

  const next = resolveTurn(state, state.playerOpeningPlan[state.turn], state.cpuOpeningPlan[state.turn], random)
  return withPhaseAfterTurn(next)
}

export function resolveManualTurn(
  state: GameState,
  playerMove: PlayedMove,
  random = Math.random,
): GameState {
  if (state.phase !== 'manual' || state.turn < 3 || state.turn >= 5) {
    return state
  }

  const cpuMove = chooseCpuManualMove(state.cpuCards, state.cpuUsedIds, state.cpuPersonality, state.playerHp, random)
  const next = resolveTurn(state, playerMove, cpuMove, random)
  return withPhaseAfterTurn(next)
}

function resolveTurn(
  state: GameState,
  playerMove: PlayedMove,
  cpuMove: PlayedMove,
  random = Math.random,
): GameState {
  const playerCard = findCard(state.playerCards, playerMove.cardId)
  const cpuCard = findCard(state.cpuCards, cpuMove.cardId)
  const playerEffect = resolveEffect(playerCard.type, playerMove.disguiseAs, random)
  const cpuEffect = resolveEffect(cpuCard.type, cpuMove.disguiseAs, random)

  let playerHp = state.playerHp
  let cpuHp = state.cpuHp
  let revealedCpuIds = [...state.revealedCpuIds]
  const playerContractProgress = { ...state.playerContractProgress }
  const cpuContractProgress = { ...state.cpuContractProgress }
  const turnNumber = state.turn + 1
  const messages: string[] = [
    `${turnNumber}手目: あなたは${describePlay(playerCard.type, playerEffect)}、CPUは${describePlay(
      cpuCard.type,
      cpuEffect,
    )}。`,
  ]

  if (playerEffect === 'Attack') {
    if (cpuEffect === 'Guard') {
      cpuContractProgress.guardBlocks += 1
      messages.push('CPUのGuardであなたのAttackは無効。')
    } else {
      cpuHp = Math.max(0, cpuHp - 1)
      playerContractProgress.attackHits += 1
      messages.push('あなたのAttackが命中。CPUに1ダメージ。')
    }
  }

  if (cpuEffect === 'Attack') {
    if (playerEffect === 'Guard') {
      playerContractProgress.guardBlocks += 1
      messages.push('あなたのGuardでCPUのAttackは無効。')
    } else {
      playerHp = Math.max(0, playerHp - 1)
      cpuContractProgress.attackHits += 1
      messages.push('CPUのAttackが命中。あなたに1ダメージ。')
    }
  }

  if (playerCard.type === 'Disguise') {
    playerContractProgress.disguiseUses += 1
  }

  if (cpuCard.type === 'Disguise') {
    cpuContractProgress.disguiseUses += 1
  }

  if (playerEffect === 'Heal') {
    const before = playerHp
    playerHp = Math.min(MAX_HP, playerHp + 1)
    messages.push(before === playerHp ? 'あなたのHeal。HPはすでに最大。' : 'あなたのHealでHPを1回復。')
  }

  if (cpuEffect === 'Heal') {
    const before = cpuHp
    cpuHp = Math.min(MAX_HP, cpuHp + 1)
    messages.push(before === cpuHp ? 'CPUのHeal。HPはすでに最大。' : 'CPUのHealでHPを1回復。')
  }

  if (playerEffect === 'Scout') {
    const target = pickUnrevealedRemaining(state.cpuCards, [...state.cpuUsedIds, cpuCard.id], revealedCpuIds, random)
    if (target) {
      revealedCpuIds = [...revealedCpuIds, target.id]
      messages.push(`Scout成功。CPUの残りカード1枚は${target.type}。`)
    } else {
      messages.push('Scoutしたが、公開できるCPUの残りカードはない。')
    }
  }

  if (cpuEffect === 'Scout') {
    messages.push('CPUがScoutを使用。あなたの残りカードを探った。')
  }

  const record: TurnRecord = {
    turn: turnNumber,
    playerCardId: playerCard.id,
    cpuCardId: cpuCard.id,
    playerCard: playerCard.type,
    cpuCard: cpuCard.type,
    playerEffect,
    cpuEffect,
    messages,
  }

  return {
    ...state,
    turn: turnNumber,
    playerHp,
    cpuHp,
    playerContractProgress,
    cpuContractProgress,
    playerUsedIds: [...state.playerUsedIds, playerCard.id],
    cpuUsedIds: [...state.cpuUsedIds, cpuCard.id],
    revealedCpuIds,
    stats: {
      ...state.stats,
      playerCardUses: {
        ...state.stats.playerCardUses,
        [playerCard.type]: state.stats.playerCardUses[playerCard.type] + 1,
      },
      cpuCardUses: {
        ...state.stats.cpuCardUses,
        [cpuCard.type]: state.stats.cpuCardUses[cpuCard.type] + 1,
      },
    },
    log: [...messages.slice().reverse(), ...state.log],
    lastTurn: record,
    lastContractMessages: undefined,
  }
}

function withPhaseAfterTurn(state: GameState): GameState {
  const judgedState = state.turn >= 5 && !state.contractsResolved ? resolveContracts(state) : state
  let phase: Phase = 'manual'
  const creditEnded = judgedState.playerCredit <= 0 || judgedState.cpuCredit <= 0
  const hpEnded = judgedState.playerHp <= 0 || judgedState.cpuHp <= 0
  const setEnded = judgedState.turn >= 5

  if (creditEnded) {
    phase = 'game-over'
  } else if (hpEnded) {
    phase = 'duel-ended'
  } else if (setEnded) {
    phase = 'set-ended'
  }

  if (phase === judgedState.phase) {
    return judgedState
  }

  const message =
    phase === 'game-over'
      ? judgedState.playerCredit <= 0 && judgedState.cpuCredit <= 0
        ? '完全決着。両者のCreditが尽き、Drawです。'
        : judgedState.playerCredit <= 0
          ? '完全決着。あなたのCreditが尽きました。'
          : '完全決着。CPUのCreditが尽きました。'
      : phase === 'duel-ended'
        ? judgedState.playerHp <= 0 && judgedState.cpuHp <= 0
          ? 'デュエル決着。相打ちです。Creditを持ち越して次のデュエルへ進めます。'
          : judgedState.playerHp <= 0
          ? '決着。CPUの勝利です。'
          : '決着。あなたの勝利です。'
        : `セット${judgedState.setNumber}終了。次の5枚を選んで続行します。`

  return {
    ...judgedState,
    phase,
    log: [message, ...judgedState.log],
  }
}

function resolveContracts(state: GameState): GameState {
  if (!state.contractActive) {
    const messages = ['契約判定なし: Fold済みのため、Pot移動と契約ダメージは発生しません。']

    return {
      ...state,
      contractsResolved: true,
      lastContractMessages: messages,
      log: [...messages, ...state.log],
    }
  }

  if (!state.contractDeclarer || !state.declaredContract || !state.declaredWager) {
    return { ...state, contractsResolved: true }
  }

  const declarerProgress =
    state.contractDeclarer === 'Player' ? state.playerContractProgress : state.cpuContractProgress
  const succeeded = isContractComplete(state.declaredContract, declarerProgress)
  let playerHp = state.playerHp
  let cpuHp = state.cpuHp
  let playerCredit = state.playerCredit
  let cpuCredit = state.cpuCredit
  const messages: string[] = []

  if (succeeded && state.contractDeclarer === 'Player') {
    cpuHp = Math.max(0, cpuHp - 1)
    playerCredit += state.declaredWager
    cpuCredit = Math.max(0, cpuCredit - state.declaredWager)
    messages.push(
      `契約成功: Playerの${state.declaredContract}。PlayerがPot ${state.pot}を獲得し、CPUに契約ダメージ+1。`,
    )
  } else if (succeeded) {
    playerHp = Math.max(0, playerHp - 1)
    cpuCredit += state.declaredWager
    playerCredit = Math.max(0, playerCredit - state.declaredWager)
    messages.push(
      `契約成功: CPUの${state.declaredContract}。CPUがPot ${state.pot}を獲得し、Playerに契約ダメージ+1。`,
    )
  } else if (state.contractDeclarer === 'Player') {
    playerHp = Math.max(0, playerHp - 1)
    cpuCredit += state.declaredWager
    playerCredit = Math.max(0, playerCredit - state.declaredWager)
    messages.push(
      `契約失敗: Playerの${state.declaredContract}。CPUがPot ${state.pot}を獲得し、Playerに契約失敗ダメージ1。`,
    )
  } else {
    cpuHp = Math.max(0, cpuHp - 1)
    playerCredit += state.declaredWager
    cpuCredit = Math.max(0, cpuCredit - state.declaredWager)
    messages.push(
      `契約失敗: CPUの${state.declaredContract}。PlayerがPot ${state.pot}を獲得し、CPUに契約失敗ダメージ1。`,
    )
  }

  return {
    ...state,
    playerHp,
    cpuHp,
    playerCredit,
    cpuCredit,
    contractsResolved: true,
    pot: 0,
    stats: {
      ...state.stats,
      playerContracts: {
        success: state.stats.playerContracts.success + (state.contractDeclarer === 'Player' && succeeded ? 1 : 0),
        failure: state.stats.playerContracts.failure + (state.contractDeclarer === 'Player' && !succeeded ? 1 : 0),
      },
      cpuContracts: {
        success: state.stats.cpuContracts.success + (state.contractDeclarer === 'CPU' && succeeded ? 1 : 0),
        failure: state.stats.cpuContracts.failure + (state.contractDeclarer === 'CPU' && !succeeded ? 1 : 0),
      },
    },
    lastContractMessages: messages,
    log: [...messages.slice().reverse(), ...state.log],
  }
}

function isContractComplete(contract: ContractType, progress: ContractProgress): boolean {
  switch (contract) {
    case 'Assault':
      return progress.attackHits >= 2
    case 'Defense':
      return progress.guardBlocks >= 1
    case 'Deception':
      return progress.disguiseUses >= 1
  }
}

function findCard(cards: CardInstance[], cardId: string): CardInstance {
  const card = cards.find((item) => item.id === cardId)

  if (!card) {
    throw new Error(`Card not found: ${cardId}`)
  }

  return card
}

function resolveEffect(
  cardType: CardType,
  disguiseAs: DisguiseEffect | undefined,
  random = Math.random,
): ResolvedEffect {
  if (cardType === 'Disguise') {
    return disguiseAs ?? randomDisguiseEffect(random)
  }

  return cardType
}

function describePlay(cardType: CardType, effect: ResolvedEffect) {
  if (cardType === 'Disguise') {
    return `Disguise(${effect})`
  }

  return cardType
}

function pickUnrevealedRemaining(
  cards: CardInstance[],
  usedIds: string[],
  revealedIds: string[],
  random = Math.random,
) {
  const candidates = cards.filter((card) => !usedIds.includes(card.id) && !revealedIds.includes(card.id))

  if (candidates.length === 0) {
    return undefined
  }

  return candidates[Math.floor(random() * candidates.length)]
}
