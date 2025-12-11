// core/rules.js

import { calcHandValue } from './deck.js';

/**
 * 通常バースト判定
 */
export function isBust(hand) {
  return calcHandValue(hand) > 21;
}

/**
 * ブラックジャック判定（A + 10点札）
 */
export function isBlackjack(hand) {
  if (hand.length !== 2) return false;
  const vals = hand.map(c => c.value);
  return vals.includes('A') && ['10','J','Q','K'].some(v => vals.includes(v));
}

/**
 * ディーラーがBJになる可能性あるか
 */
export function dealerHasBlackjackChance(dealerHand) {
  const upCard = dealerHand[0];
  return ['A','10','J','Q','K'].includes(upCard.value);
}

/**
 * ディーラーがブラックジャックか
 */
export function isDealerBlackjack(dealerHand) {
  return calcHandValue(dealerHand) === 21 && dealerHand.length === 2;
}

/**
 * 勝敗判定
 */
export function judge(playerValue, dealerValue) {
  if (playerValue > 21) return 'LOSE';
  if (dealerValue > 21) return 'WIN';
  if (playerValue > dealerValue) return 'WIN';
  if (playerValue < dealerValue) return 'LOSE';
  return 'DRAW';
}

/**
 * スプリット可能かどうか（最初の2枚が同じ値か）
 */
export const isSplittable = (hand) => {
  if (hand.length !== 2) return false;

  const convert = (v) => {
    if (['J', 'Q', 'K'].includes(v)) return 10;
    if (v === 'A') return 11;
    return parseInt(v, 10);
  };

  return convert(hand[0].value) === convert(hand[1].value);
};
