//ゲームロジック
import { createDeck, calcHandValue } from './deck.js';
import { renderHands, renderMessage, updateChips } from './ui.js';

let deck = [];
let playerHand = [];
let dealerHand = [];
let chips = 100;
let bet = 0;
let state = 'INIT';

export function setBet(amount) {
  if (state !== 'INIT') return;
  if (chips < amount) {
    renderMessage('Not enough chips!');
    return;
  }
  bet = amount;
  document.getElementById('current-bet').textContent = `Current Bet: ${bet}`;
  renderMessage(`You bet ${bet} chips.`);
}

export function startGame() {
  if (state !== 'INIT') return;
  if (bet === 0) {
    renderMessage('Please place your bet first.');
    return;
  }

  if (deck.length < 15) deck = createDeck();
  state = 'DEALT';

  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];

  renderHands(playerHand, dealerHand, true);
  renderMessage('Cards Dealt. Your Turn!');
  state = 'PLAYER_TURN';
}

export function hitCard() {
  if (state !== 'PLAYER_TURN') return;
  playerHand.push(deck.pop());
  renderHands(playerHand, dealerHand, true);

  const total = calcHandValue(playerHand);
  if (total > 21) {
    renderMessage('Bust! You Lose');
    chips -= bet;
    updateChips(chips);
    bet = 0;
    document.getElementById('current-bet').textContent = `Current Bet: 0`;
    state = 'RESULT';
  } else if (total === 21) {
    standGame();
  }
}

export function standGame() {
  if (state !== 'PLAYER_TURN') return;
  state = 'DEALER_TURN';

  while (calcHandValue(dealerHand) < 17) {
    dealerHand.push(deck.pop());
  }

  const playerTotal = calcHandValue(playerHand);
  const dealerTotal = calcHandValue(dealerHand);

  let message = '';
  if (dealerTotal > 21 || playerTotal > dealerTotal) {
    message = 'You Win!';
    chips += bet * 2;
  } else if (playerTotal < dealerTotal) {
    message = 'You Lose!';
    chips -= bet;
  } else {
    message = 'Draw!';
    chips += bet;
  }

  updateChips(chips);
  bet = 0;
  document.getElementById('current-bet').textContent = `Current Bet: 0`;

  renderHands(playerHand, dealerHand, false);
  renderMessage(message);
  state = 'RESULT';
}

export function restartGame() {
  playerHand = [];
  dealerHand = [];
  renderHands([], [], true);
  renderMessage('Place Your Bet');
  state = 'INIT';
}
