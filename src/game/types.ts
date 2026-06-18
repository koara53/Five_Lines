export const CARD_TYPES = ['Attack', 'Guard', 'Scout', 'Disguise', 'Heal'] as const
export const CONTRACT_TYPES = ['Assault', 'Defense', 'Deception'] as const

export type CardType = (typeof CARD_TYPES)[number]
export type ContractType = (typeof CONTRACT_TYPES)[number]
export type CpuPersonality = 'Aggressive' | 'Defensive' | 'Trickster'
export type DisguiseEffect = 'Attack' | 'Guard' | 'Heal'
export type ResolvedEffect = Exclude<CardType, 'Disguise'> | DisguiseEffect
export type Wager = 1 | 2 | 3
export type ContractDeclarer = 'Player' | 'CPU'
export type ContractResponse = 'Call' | 'Fold'
export type Phase = 'deck-building' | 'contract-response' | 'manual' | 'set-ended' | 'duel-ended' | 'game-over'

export type CardInstance = {
  id: string
  type: CardType
}

export type PlannedMove = {
  cardId: string
  disguiseAs?: DisguiseEffect
}

export type PlayedMove = PlannedMove

export type ContractProgress = {
  attackHits: number
  guardBlocks: number
  disguiseUses: number
}

export type CardUsageStats = Record<CardType, number>

export type ContractResultStats = {
  success: number
  failure: number
}

export type MatchStats = {
  setsPlayed: number
  playerCardUses: CardUsageStats
  cpuCardUses: CardUsageStats
  playerContracts: ContractResultStats
  cpuContracts: ContractResultStats
  cpuContractChoices: Record<ContractType, number>
}

export type TurnRecord = {
  turn: number
  playerCardId: string
  cpuCardId: string
  playerCard: CardType
  cpuCard: CardType
  playerEffect: ResolvedEffect
  cpuEffect: ResolvedEffect
  messages: string[]
}

export type GameState = {
  phase: Phase
  setNumber: number
  turn: number
  playerHp: number
  cpuHp: number
  playerCredit: number
  cpuCredit: number
  cpuPersonality: CpuPersonality
  contractDeclarer?: ContractDeclarer
  declaredContract?: ContractType
  declaredWager?: Wager
  contractResponse?: ContractResponse
  contractActive: boolean
  pot: number
  playerContractProgress: ContractProgress
  cpuContractProgress: ContractProgress
  contractsResolved: boolean
  playerCards: CardInstance[]
  cpuCards: CardInstance[]
  playerOpeningPlan: PlannedMove[]
  cpuOpeningPlan: PlannedMove[]
  playerUsedIds: string[]
  cpuUsedIds: string[]
  revealedCpuIds: string[]
  stats: MatchStats
  log: string[]
  lastTurn?: TurnRecord
  lastContractMessages?: string[]
}
