//表示制御
import { calcHandValue } from './deck.js';

export function renderHands(player, dealer, hideDealerCard) {
  const playerEl = document.getElementById('player-hand');
  const dealerEl = document.getElementById('dealer-hand');
  playerEl.textContent = `Player: ${handToString(player)} (Total: ${calcHandValue(player)})`;

  if (hideDealerCard) {
    dealerEl.textContent = `Dealer: ${dealer[0]?.suit}${dealer[0]?.value} [Hidden]`;
  } else {
    dealerEl.textContent = `Dealer: ${handToString(dealer)} (Total: ${calcHandValue(dealer)})`;
  }
}

export function renderMessage(msg) {
  document.getElementById('message').textContent = msg;
}

function handToString(hand) {
  return hand.map(c => `${c.suit}${c.value}`).join(' ');
}

export function updateChips(amount) {
  document.getElementById('chips').textContent = `Chips: ${amount}`;
}
