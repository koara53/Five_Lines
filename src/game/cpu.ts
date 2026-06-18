import {
  CARD_TYPES,
  CONTRACT_TYPES,
  type CardInstance,
  type CardType,
  type ContractType,
  type ContractResponse,
  type CpuPersonality,
  type DisguiseEffect,
  type PlannedMove,
  type Wager,
} from './types'

const DISGUISE_EFFECTS: DisguiseEffect[] = ['Attack', 'Guard', 'Heal']
const CPU_PERSONALITIES: CpuPersonality[] = ['Aggressive', 'Defensive', 'Trickster']

const CARD_WEIGHTS: Record<CpuPersonality, Record<CardType, number>> = {
  Aggressive: {
    Attack: 7,
    Guard: 1,
    Scout: 2,
    Disguise: 2,
    Heal: 1,
  },
  Defensive: {
    Attack: 1,
    Guard: 5,
    Scout: 1,
    Disguise: 2,
    Heal: 5,
  },
  Trickster: {
    Attack: 1,
    Guard: 1,
    Scout: 5,
    Disguise: 5,
    Heal: 1,
  },
}

const DISGUISE_WEIGHTS: Record<CpuPersonality, Record<DisguiseEffect, number>> = {
  Aggressive: {
    Attack: 5,
    Guard: 1,
    Heal: 1,
  },
  Defensive: {
    Attack: 1,
    Guard: 4,
    Heal: 4,
  },
  Trickster: {
    Attack: 3,
    Guard: 3,
    Heal: 3,
  },
}

const PERSONALITY_HINTS: Record<CpuPersonality, string> = {
  Aggressive: 'CPUは強気な構えを見せている。',
  Defensive: 'CPUは守りを固めているように見える。',
  Trickster: 'CPUは何を考えているか読みにくい。',
}

export function chooseCpuPersonality(random = Math.random): CpuPersonality {
  return CPU_PERSONALITIES[Math.floor(random() * CPU_PERSONALITIES.length)]
}

export function chooseCpuContract(
  cards: CardInstance[],
  cpuHp: number,
  playerHp: number,
  random = Math.random,
): ContractType {
  const profile = getDeckProfile(cards)
  const desperatePush = shouldDesperatePush(cpuHp, playerHp)
  const candidates = CONTRACT_TYPES.filter((contract) => canChooseContract(contract, profile))

  if (cpuHp <= 1 && playerHp > 2) {
    const saferCandidates = candidates.filter((contract) => contractSuccessLooksPlausible(contract, profile))

    if (saferCandidates.length > 0) {
      return pickWeighted(saferCandidates, (contract) => getContractWeight(contract, profile, playerHp), random)
    }
  }

  if (desperatePush && profile.attackMethods >= 3) {
    return 'Assault'
  }

  if (candidates.length === 0) {
    return profile.attackMethods >= 3 ? 'Assault' : 'Defense'
  }

  return pickWeighted(candidates, (contract) => getContractWeight(contract, profile, playerHp), random)
}

export function chooseCpuWager(cpuHp: number, playerHp: number, cpuCredit: number, playerCredit: number, random = Math.random): Wager {
  const options: Wager[] = cpuCredit <= 1 ? [1] : cpuCredit <= 2 ? [1, 2] : [1, 2, 3]
  const lowStability = cpuHp <= 2 || cpuCredit <= 3
  const strongLead = cpuHp >= playerHp + 2 && cpuCredit >= playerCredit
  const needsSwing = (cpuHp < playerHp && cpuCredit <= playerCredit) || cpuCredit <= playerCredit - 3

  if (lowStability || strongLead) {
    return pickWeighted(options, (wager) => (wager === 1 ? 8 : wager === 2 ? 2 : 1), random)
  }

  if (needsSwing) {
    return pickWeighted(options, (wager) => (wager === 1 ? 2 : wager === 2 ? 5 : 4), random)
  }

  return pickWeighted(options, (wager) => (wager === 1 ? 5 : wager === 2 ? 3 : 1), random)
}

export function chooseCpuRaiseStake(
  cpuHp: number,
  playerHp: number,
  cpuCredit: number,
  playerCredit: number,
  random = Math.random,
): Wager {
  const maxStake = Math.min(3, cpuCredit, playerCredit) as Wager
  const wager = chooseCpuWager(cpuHp, playerHp, cpuCredit, playerCredit, random)

  return Math.min(wager, maxStake) as Wager
}

export function chooseCpuContractResponse(
  playerContract: ContractType,
  stake: Wager,
  cpuCards: CardInstance[],
  cpuHp: number,
  cpuCredit: number,
  random = Math.random,
): ContractResponse {
  if (stake === 1) {
    return random() < 0.88 ? 'Call' : 'Fold'
  }

  const canBlock = canInterfereWithContract(playerContract, cpuCards)
  const underPressure = cpuHp <= 2 || cpuCredit <= 3
  const expensive = stake >= 3

  if (canBlock) {
    return random() < (underPressure && expensive ? 0.58 : 0.82) ? 'Call' : 'Fold'
  }

  if (underPressure && expensive) {
    return random() < 0.24 ? 'Call' : 'Fold'
  }

  if (expensive) {
    return random() < 0.42 ? 'Call' : 'Fold'
  }

  return random() < 0.64 ? 'Call' : 'Fold'
}

export function getCpuPersonalityHint(personality: CpuPersonality): string {
  return PERSONALITY_HINTS[personality]
}

export function getCpuSetIntentHint(cards: CardInstance[], cpuHp: number, playerHp: number): string {
  const profile = getDeckProfile(cards)

  if (shouldDesperatePush(cpuHp, playerHp)) {
    return 'CPUは勝負を決める手を探している。'
  }

  if (profile.attackMethods >= 4) {
    return 'CPUは攻め筋を厚く構えている。'
  }

  return 'CPUは攻撃の機会をうかがっている。'
}

export function randomCardType(random = Math.random) {
  return CARD_TYPES[Math.floor(random() * CARD_TYPES.length)]
}

export function randomDisguiseEffect(random = Math.random): DisguiseEffect {
  return DISGUISE_EFFECTS[Math.floor(random() * DISGUISE_EFFECTS.length)]
}

export function chooseCpuDisguiseEffect(personality: CpuPersonality, random = Math.random): DisguiseEffect {
  return pickWeighted(DISGUISE_EFFECTS, (effect) => DISGUISE_WEIGHTS[personality][effect], random)
}

export function createCpuDeck(
  setNumber: number,
  personality: CpuPersonality,
  playerHp: number,
  cpuHp: number,
  random = Math.random,
): CardInstance[] {
  const types = createCpuDeckTypes(personality, playerHp, cpuHp, random)

  return types.map((type, index) => ({
    id: `cpu-${setNumber}-${index}-${Math.floor(random() * 100000)}`,
    type,
  }))
}

export function createCpuOpeningPlan(
  cards: CardInstance[],
  personality: CpuPersonality,
  playerHp: number,
  random = Math.random,
): PlannedMove[] {
  const pickedCards = pickWeightedWithoutReplacement(
    cards,
    3,
    (card) => getMoveWeight(card.type, personality, playerHp),
    random,
  )

  return pickedCards.map((card) => createCpuMove(card, personality, playerHp, random))
}

export function chooseCpuManualMove(
  cards: CardInstance[],
  usedIds: string[],
  personality: CpuPersonality,
  playerHp: number,
  random = Math.random,
): PlannedMove {
  const remaining = cards.filter((card) => !usedIds.includes(card.id))
  const card = pickWeighted(remaining, (item) => getMoveWeight(item.type, personality, playerHp), random)

  return createCpuMove(card, personality, playerHp, random)
}

function chooseCpuCardType(personality: CpuPersonality, random = Math.random): CardType {
  return pickWeighted(CARD_TYPES, (type) => CARD_WEIGHTS[personality][type], random)
}

function createCpuDeckTypes(
  personality: CpuPersonality,
  playerHp: number,
  cpuHp: number,
  random = Math.random,
): CardType[] {
  const desperatePush = shouldDesperatePush(cpuHp, playerHp)
  const types = desperatePush
    ? createDesperateDeckTypes(personality, random)
    : createPersonalityDeckTypes(personality, playerHp, random)

  return enforceOffenseRules(types, personality, playerHp, random)
}

function createPersonalityDeckTypes(
  personality: CpuPersonality,
  playerHp: number,
  random = Math.random,
): CardType[] {
  if (playerHp <= 2) {
    return createFinisherDeckTypes(personality, random)
  }

  switch (personality) {
    case 'Aggressive':
      return random() < 0.65
        ? ['Attack', 'Attack', 'Attack', 'Disguise', pickWeighted(['Guard', 'Heal'], () => 1, random)]
        : ['Attack', 'Attack', 'Attack', 'Attack', pickWeighted(['Guard', 'Heal', 'Disguise'], () => 1, random)]
    case 'Defensive':
      return ['Attack', 'Attack', 'Guard', 'Guard', pickWeighted(['Heal', 'Disguise'], () => 1, random)]
    case 'Trickster':
      return ['Scout', 'Disguise', 'Attack', 'Attack', pickWeighted(['Guard', 'Disguise', 'Heal'], () => 1, random)]
  }
}

function createFinisherDeckTypes(personality: CpuPersonality, random = Math.random): CardType[] {
  switch (personality) {
    case 'Aggressive':
      return ['Attack', 'Attack', 'Attack', 'Disguise', pickWeighted(['Guard', 'Heal'], () => 1, random)]
    case 'Defensive':
      return ['Attack', 'Attack', 'Disguise', 'Guard', pickWeighted(['Guard', 'Heal'], () => 1, random)]
    case 'Trickster':
      return ['Attack', 'Attack', 'Disguise', 'Scout', pickWeighted(['Guard', 'Disguise'], () => 1, random)]
  }
}

function createDesperateDeckTypes(personality: CpuPersonality, random = Math.random): CardType[] {
  switch (personality) {
    case 'Aggressive':
      return ['Attack', 'Attack', 'Attack', 'Attack', 'Disguise']
    case 'Defensive':
      return ['Attack', 'Attack', 'Attack', 'Guard', pickWeighted(['Heal', 'Disguise'], () => 1, random)]
    case 'Trickster':
      return ['Attack', 'Attack', 'Disguise', 'Disguise', 'Scout']
  }
}

function enforceOffenseRules(
  types: CardType[],
  personality: CpuPersonality,
  playerHp: number,
  random = Math.random,
): CardType[] {
  const next = types.slice(0, 5)

  while (next.length < 5) {
    next.push(chooseCpuCardType(personality, random))
  }

  ensureMinimumCount(next, 'Attack', personality === 'Aggressive' ? 3 : personality === 'Defensive' ? 2 : 1)

  if (playerHp <= 2 || personality === 'Trickster') {
    ensureMinimumCount(next, 'Attack', personality === 'Trickster' ? 2 : 3)
  }

  while (countAttackMethods(next) < 2) {
    replaceLowestOffenseCard(next, 'Disguise')
  }

  if (countAttackMethods(next) < 3) {
    replaceLowestOffenseCard(next, personality === 'Trickster' ? 'Disguise' : 'Attack')
  }

  return next
}

function ensureMinimumCount(types: CardType[], cardType: CardType, minimum: number) {
  while (countCard(types, cardType) < minimum) {
    replaceLowestOffenseCard(types, cardType)
  }
}

function replaceLowestOffenseCard(types: CardType[], replacement: CardType) {
  const index = types.findIndex((type) => type !== 'Attack' && type !== 'Disguise')

  if (index >= 0) {
    types[index] = replacement
    return
  }

  types[types.length - 1] = replacement
}

function createCpuMove(
  card: CardInstance,
  personality: CpuPersonality,
  playerHp: number,
  random = Math.random,
): PlannedMove {
  return {
    cardId: card.id,
    disguiseAs: card.type === 'Disguise' ? chooseCpuDisguiseForMove(personality, playerHp, random) : undefined,
  }
}

function chooseCpuDisguiseForMove(
  personality: CpuPersonality,
  playerHp: number,
  random = Math.random,
): DisguiseEffect {
  if (playerHp <= 2) {
    return pickWeighted(DISGUISE_EFFECTS, (effect) => (effect === 'Attack' ? 8 : 1), random)
  }

  return chooseCpuDisguiseEffect(personality, random)
}

function getMoveWeight(cardType: CardType, personality: CpuPersonality, playerHp: number): number {
  if (playerHp <= 2) {
    if (cardType === 'Attack') {
      return 12
    }

    if (cardType === 'Disguise') {
      return 8
    }
  }

  return CARD_WEIGHTS[personality][cardType]
}

function shouldDesperatePush(cpuHp: number, playerHp: number): boolean {
  return playerHp <= 2 || (cpuHp <= 1 && playerHp <= 3)
}

function canChooseContract(contract: ContractType, profile: DeckProfile): boolean {
  switch (contract) {
    case 'Assault':
      return profile.attackMethods >= 3
    case 'Defense':
      return profile.attackMethods >= 2
    case 'Deception':
      return profile.attackCount > 0 && profile.disguiseCount > 0
  }
}

function contractSuccessLooksPlausible(contract: ContractType, profile: DeckProfile): boolean {
  switch (contract) {
    case 'Assault':
      return profile.attackMethods >= 3
    case 'Defense':
      return profile.guardCount >= 1 && profile.attackMethods >= 2
    case 'Deception':
      return profile.disguiseCount >= 1 && profile.attackCount >= 1
  }
}

function canInterfereWithContract(contract: ContractType, cards: CardInstance[]): boolean {
  const profile = getDeckProfile(cards)

  switch (contract) {
    case 'Assault':
      return profile.guardCount >= 1 || profile.attackMethods >= 3
    case 'Defense':
      return profile.attackMethods <= 2
    case 'Deception':
      return profile.attackMethods >= 3
  }
}

function getContractWeight(contract: ContractType, profile: DeckProfile, playerHp: number): number {
  const finishingBonus = playerHp <= 2 ? 3 : 0

  switch (contract) {
    case 'Assault':
      return profile.attackMethods + finishingBonus
    case 'Defense':
      return profile.guardCount + 1
    case 'Deception':
      return profile.disguiseCount + 1
  }
}

type DeckProfile = {
  attackCount: number
  disguiseCount: number
  guardCount: number
  attackMethods: number
}

function getDeckProfile(cards: CardInstance[]): DeckProfile {
  const attackCount = cards.filter((card) => card.type === 'Attack').length
  const disguiseCount = cards.filter((card) => card.type === 'Disguise').length

  return {
    attackCount,
    disguiseCount,
    guardCount: cards.filter((card) => card.type === 'Guard').length,
    attackMethods: attackCount + disguiseCount,
  }
}

function countAttackMethods(types: CardType[]): number {
  return types.filter((type) => type === 'Attack' || type === 'Disguise').length
}

function countCard(types: CardType[], cardType: CardType): number {
  return types.filter((type) => type === cardType).length
}

function pickWeighted<T>(items: readonly T[], getWeight: (item: T) => number, random = Math.random): T {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0)
  let target = random() * totalWeight

  for (const item of items) {
    target -= getWeight(item)

    if (target <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

function pickWeightedWithoutReplacement<T>(
  items: readonly T[],
  count: number,
  getWeight: (item: T) => number,
  random = Math.random,
): T[] {
  const remaining = [...items]
  const picked: T[] = []

  while (picked.length < count && remaining.length > 0) {
    const item = pickWeighted(remaining, getWeight, random)
    picked.push(item)
    remaining.splice(remaining.indexOf(item), 1)
  }

  return picked
}
