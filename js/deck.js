// カード生成・シャッフル・共通関数
export function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ suit, value });
    });
  });

  
// シャッフル（Fisher-Yates）
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}


// 共通関数: 手札の合計計算
export function calcHandValue(hand) {
  let total = 0;
  let aces = 0;
  hand.forEach(card => {
    if (['J', 'Q', 'K'].includes(card.value)) total += 10;
    else if (card.value === 'A') {
      total += 11;
      aces++;
    } else total += parseInt(card.value);
  });


  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}
