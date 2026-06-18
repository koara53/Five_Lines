export type RuleSubsection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export type RuleSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
  subsections?: RuleSubsection[]
}

export const ruleSections: RuleSection[] = [
  {
    title: 'ゲーム概要',
    paragraphs: [
      '「5手の嘘」は、5枚のカードを使って相手のHPとCreditを削り合う、短時間型の心理戦カードゲームです。',
      '勝負は5手で進行します。最初の3手はあらかじめ順番を決めて自動で公開され、残り2手は状況を見ながら手動で選びます。',
      '相手の行動を読み、攻撃を通し、契約を成功させ、最後まで生き残りましょう。',
    ],
  },
  {
    title: '勝利条件',
    paragraphs: ['以下のどちらかを満たすと勝利です。'],
    bullets: ['相手のHPを0にする', '相手のCreditを0にする', '両者が同時にHP0、またはCredit0になった場合はDrawです。'],
    subsections: [
      {
        title: '基本ステータス',
        bullets: ['HP: 5', 'Credit: 10'],
        paragraphs: ['HPは直接的な耐久力です。Creditは契約や賭けに使う資産です。'],
      },
    ],
  },
  {
    title: 'カード一覧',
    subsections: [
      {
        title: 'Attack',
        paragraphs: ['相手に1ダメージを与えます。ただし、相手がGuardを出していた場合は無効化されます。'],
      },
      {
        title: 'Guard',
        paragraphs: ['相手のAttackを無効化します。相手がAttackを出していない場合は効果がありません。'],
      },
      {
        title: 'Scout',
        paragraphs: ['相手の残りカードを一部確認します。終盤の読み合いを有利にできます。'],
      },
      {
        title: 'Disguise',
        paragraphs: ['Attack、Guard、Healのいずれかとして使える偽装カードです。状況に応じて役割を変えられます。'],
      },
      {
        title: 'Heal',
        paragraphs: ['自分のHPを1回復します。ただし最大HPは5です。'],
      },
    ],
  },
  {
    title: '1セットの流れ',
    subsections: [
      {
        title: '1. デッキ選択',
        paragraphs: ['5枚のカードを選びます。同じカードを複数選ぶこともできます。'],
        bullets: [
          'Attack / Attack / Guard / Scout / Heal',
          'Attack / Attack / Attack / Guard / Disguise',
          'Guard / Guard / Attack / Heal / Disguise',
        ],
      },
      {
        title: '2. Opening 3',
        paragraphs: ['選んだ5枚のうち、最初の3手をあらかじめ順番にセットします。この3手は開始後、自動で1枚ずつ公開されます。'],
      },
      {
        title: '3. 1〜3手目',
        paragraphs: ['予約したカードが1枚ずつ公開されます。結果を確認しながら「次のカードへ」で進みます。'],
      },
      {
        title: '4. 4〜5手目',
        paragraphs: ['残った2枚から、その場で出すカードを選びます。ここからは相手のHP、Credit、契約状況を見て判断できます。'],
      },
      {
        title: '5. セット終了',
        paragraphs: ['5手が終わると、契約の成否やCreditの変動が処理されます。まだ勝敗が決まらなければ、次のセットに進みます。'],
      },
    ],
  },
  {
    title: '契約',
    paragraphs: [
      'セット開始時、契約を宣言できます。',
      '契約は「このセットで何を達成するか」を決める賭けです。成功すれば有利になりますが、失敗すると不利になります。',
    ],
    subsections: [
      {
        title: 'Assault',
        paragraphs: ['条件: Attackを2回以上命中させる。攻撃型の契約です。相手がGuardを多く使うと失敗しやすくなります。'],
      },
      {
        title: 'Defense',
        paragraphs: ['条件: Guardで相手のAttackを1回以上防ぐ。防御型の契約です。相手がAttackを出してこない場合、成功できません。'],
      },
      {
        title: 'Deception',
        paragraphs: ['条件: Disguiseを1回以上使用する。偽装型の契約です。比較的成功しやすいですが、相手に読まれると対策されます。'],
      },
    ],
  },
  {
    title: 'Credit',
    paragraphs: [
      'Creditは契約に使う資産です。',
      'Creditが0になると敗北します。HPだけでなく、Creditの残りにも注意する必要があります。',
      '大きく賭ければ大きく奪えますが、失敗すれば大きく失います。',
    ],
  },
  {
    title: 'Call / Fold',
    paragraphs: ['相手が契約にCreditを賭けた場合、受けるか降りるかを選びます。'],
    subsections: [
      {
        title: 'Call',
        paragraphs: ['相手と同じCreditを賭けて契約勝負を受けます。相手の契約が失敗すれば、賭けられたCreditを奪えます。'],
      },
      {
        title: 'Fold',
        paragraphs: ['契約勝負を拒否します。その代わり、少量のCreditを失います。契約は実行されませんが、通常の5手勝負は続きます。'],
      },
    ],
  },
  {
    title: 'コツ',
    subsections: [
      {
        title: 'Attackを完全に捨てない',
        paragraphs: ['勝つには相手のHPを削る必要があります。守りや偽装だけでは勝ち切れません。'],
      },
      {
        title: '相手の契約を見る',
        paragraphs: ['相手がAssaultを選んだなら、Attackを通そうとしている可能性が高いです。Guardを使うか、あえて攻撃を避けて契約失敗を狙いましょう。'],
      },
      {
        title: 'Foldも選択肢',
        paragraphs: ['高額な契約を無理に受ける必要はありません。相手の成功率が高そうなら、Foldして被害を抑えるのも手です。'],
      },
      {
        title: '4〜5手目が勝負',
        paragraphs: ['最初の3手は仕込みです。本当の読み合いは、残った2枚をどう使うかで決まります。'],
      },
      {
        title: 'Credit差を意識する',
        paragraphs: ['HPで勝っていても、Creditが少なければ危険です。逆にHPで不利でも、契約でCreditを奪えば逆転できます。'],
      },
    ],
  },
]
