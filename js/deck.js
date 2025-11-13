// deck.js : カード生成・計算ロジック

// 山札（8デック分を生成してシャッフル）
export function createDeck(numDecks = 8) {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  // 🔹 8デック分のカードを生成
  for (let n = 0; n < numDecks; n++) {
    suits.forEach(suit => {
      values.forEach(value => {
        deck.push({ suit, value });
      });
    });
  }

  // 🔹 Fisher-Yatesシャッフル
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
