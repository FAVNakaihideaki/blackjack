// deck.js : カード生成・計算ロジック

// 山札（トランプ52枚）を生成し、シャッフルする関数

export function createDeck() {
  // 各スート（♠, ♥, ♦, ♣）とカードの値（A〜K）を定義
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  // スート×値の全組み合わせでカードを生成（52枚）
  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ suit, value });
    });
  });

  // Fisher-Yatesアルゴリズムでランダムにシャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// 手札の合計値を計算する関数

export function calcHandValue(hand) {
  let total = 0; // 合計値
  let aces = 0;  // A（エース）の枚数をカウント

  // 各カードを順に評価
  hand.forEach(card => {
    if (['J', 'Q', 'K'].includes(card.value)) {
      total += 10;         // 絵札は10点
    } else if (card.value === 'A') {
      total += 11;         // Aはとりあえず11点として加算
      aces++;
    } else {
      total += parseInt(card.value); // 数字カードはそのまま
    }
  });

  // 合計が21を超える場合、Aを1点扱いに調整（バースト回避）
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}
