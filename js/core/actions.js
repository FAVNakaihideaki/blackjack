// core/actions.js

import { GameState } from './gameState.js';
import { drawCard, calcHandValue } from './deck.js';
import { isBust } from './rules.js';

/**
 * HIT
 */
export function hit() {
  if (GameState.state !== 'PLAYER_TURN') return;

  GameState.playerHand.push(drawCard());

  if (isBust(GameState.playerHand)) {
    GameState.state = 'RESULT';
    return { bust: true };
  }

  return { bust: false };
}

/**
 * STAND
 */
export function stand() {
  if (GameState.state !== 'PLAYER_TURN') return;
  GameState.state = 'DEALER_TURN';
}

/**
 * DOUBLE DOWN
 */
export function doubleDown() {
  if (GameState.state !== 'PLAYER_TURN') return;

  const handIndex = GameState.currentHandIndex;
  const currentBet = GameState.bets[handIndex] ?? GameState.bet;

  if (GameState.chips < currentBet) {
    return { error: 'NOT_ENOUGH_CHIPS' };
  }

  GameState.chips -= currentBet;
  GameState.bets[handIndex] = currentBet * 2;

  GameState.playerHand.push(drawCard());

  if (isBust(GameState.playerHand)) {
    GameState.state = 'RESULT';
    return { bust: true };
  }

  GameState.state = 'DEALER_TURN';
  return { bust: false };
}

/**
 * SPLIT
 */
export function split() {
  if (GameState.state !== 'PLAYER_TURN') return { error: 'INVALID' };
  if (GameState.playerHand.length !== 2) return { error: 'NOT_TWO_CARDS' };

  const getValue = (card) => {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value, 10);
  };

  const v1 = getValue(GameState.playerHand[0]);
  const v2 = getValue(GameState.playerHand[1]);

  if (v1 !== v2) return { error: 'NOT_SAME_VALUE' };
  if (GameState.chips < GameState.bet) return { error: 'NOT_ENOUGH_CHIPS' };

  GameState.chips -= GameState.bet;

  const first = [GameState.playerHand[0], drawCard()];
  const second = [GameState.playerHand[1], drawCard()];

  GameState.playerHands = [first, second];

  GameState.dealerHands = [
    [drawCard(), drawCard()],
    [drawCard(), drawCard()]
  ];

  GameState.bets = [GameState.bet, GameState.bet];

  GameState.currentHandIndex = 0;
  GameState.playerHand = GameState.playerHands[0];
  GameState.dealerHand = GameState.dealerHands[0];
  GameState.hasSplit = true;

  return { success: true };
}
