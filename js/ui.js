// ui.js : 画面表示・メッセージ更新制御

import { calcHandValue } from './deck.js';

// 手札を画面に描画する関数

export function renderHands(player, dealer, hideDealer) {
  const p = document.getElementById('player-hand');
  const d = document.getElementById('dealer-hand');

  // プレイヤー側の手札を表示（合計値も計算）
  p.textContent = `Player: ${formatHand(player)} (Total: ${calcHandValue(player)})`;

  // ディーラー側は、伏せカードがある場合と全公開時で出し分け
  d.textContent = hideDealer
    ? `Dealer: ${dealer[0]?.suit}${dealer[0]?.value} 🂠`
    : `Dealer: ${formatHand(dealer)} (Total: ${calcHandValue(dealer)})`;
}

// メッセージ欄に文言を表示

export function renderMessage(msg) {
  document.getElementById('message').textContent = msg;
}

// 手札配列を "♠A ♥10" のような文字列に整形

function formatHand(hand) {
  return hand.map(c => `${c.suit}${c.value}`).join(' ');
}

// 所持チップの表示を更新

export function renderChips(chips) {
  document.getElementById('chips').textContent = `Chips: ${chips}`;
}

// 現在のベット額を表示更新

export function renderCurrentBet(bet) {
  document.getElementById('current-bet').textContent = `Current Bet: ${bet}`;
}
