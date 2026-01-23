// core/deck.js

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

/**
 * デッキを生成（multiDeck: デッキの枚数）
 */
export function createDeck(multiDeck = 1) {
  const deck = [];

  for (let d = 0; d < multiDeck; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({
          suit,
          value,
          rank: value,
          numericValue: getCardValue(value)
        });
      }
    }
  }

  return shuffle(deck);
}

/**
 * カードの数値化（Aは1扱い、11判定は別で行う）
 */
function getCardValue(value) {
  if (value === 'A') return 1;
  if (['J','Q','K'].includes(value)) return 10;
  return parseInt(value, 10);
}

/**
 * Fisher-Yates シャッフル
 */
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * 1枚引く（グローバル deck を使用）
 */
export function drawCard(deck) {
  if (!deck || deck.length === 0) return null;
  return deck.pop();
}

/**
 * 手札の合計値計算
 */
export function calcHandValue(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += card.numericValue;
    if (card.value === 'A') aces++;
  }

  // A を 11 として扱えるなら +10
  while (aces > 0 && total + 10 <= 21) {
    total += 10;
    aces--;
  }

  return total;
}
