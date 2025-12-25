// js/ui/phaser/phaserRenderer.js
import { calcHandValue } from '../../core/deck.js';
import { GameState } from '../../core/gameState.js';

let scene = null;

export function bindScene(phaserScene) {
  scene = phaserScene;
}

/**
 * DOM版と「同じ引数」を受け取る
 */
export function renderHands(
  playerHand,
  dealerHand,
  hideDealerSecond = false,
  allPlayerHands = null
) {
  if (!scene) return;

  scene.clearHands();

  // ===== Dealer =====
  dealerHand.forEach((card, index) => {
    if (hideDealerSecond && index === 1) {
      scene.drawHiddenCard(600 + index * 60, 120);
    } else {
      scene.drawCard(card, 600 + index * 60, 120);
    }
  });

  // ===== Player =====
  const hands = allPlayerHands?.length ? allPlayerHands : [playerHand];

  hands.forEach((hand, hIdx) => {
    hand.forEach((card, i) => {
      scene.drawCard(
        card,
        450 + i * 60,
        300 + hIdx * 120,
        hIdx === GameState.currentHandIndex
      );
    });
  });
}
