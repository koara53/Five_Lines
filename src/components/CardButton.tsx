import type { CardInstance, CardType } from '../game/types'

type CardButtonProps = {
  card?: CardInstance
  type?: CardType
  label?: string
  detail?: string
  selected?: boolean
  disabled?: boolean
  revealed?: boolean
  onClick?: () => void
}

const CARD_DETAILS: Record<CardType, string> = {
  Attack: '1ダメージ',
  Guard: '攻撃無効',
  Scout: '残りを公開',
  Disguise: '偽装',
  Heal: '1回復',
}

export function CardButton({
  card,
  type,
  label,
  detail,
  selected = false,
  disabled = false,
  revealed = true,
  onClick,
}: CardButtonProps) {
  const cardType = card?.type ?? type
  const title = revealed ? (label ?? cardType) : 'Unknown'
  const description = revealed ? (detail ?? (cardType ? CARD_DETAILS[cardType] : '')) : '未公開'

  return (
    <button
      type="button"
      className={`card-button ${cardType ? `card-${cardType.toLowerCase()}` : 'card-unknown'}${
        selected ? ' selected' : ''
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <span>{title}</span>
      <small>{description}</small>
    </button>
  )
}
