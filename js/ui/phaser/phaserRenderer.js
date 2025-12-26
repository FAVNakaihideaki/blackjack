// js/ui/phaser/phaserRenderer.js
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

  console.log('PHASER renderHands');
  scene.clearHands();

  // ★ 中央基準
  const centerX = scene.centerX;
  const gap = 60;

  // Dealer の開始X（手札枚数に応じて中央寄せ）
  const dealerStartX =
    centerX - ((dealerHand.length - 1) * gap) / 2;

  // ===== Dealer =====
  dealerHand.forEach((card, index) => {
    const x = dealerStartX + index * gap;
    const y = 100;

    if (hideDealerSecond && index === 1) {
      scene.drawHiddenCard(x, y);
    } else {
      scene.drawCard(card, x, y);
    }
  });

  // ===== Player =====
  const hands = allPlayerHands?.length ? allPlayerHands : [playerHand];

  hands.forEach((hand, hIdx) => {
    const playerStartX =
      centerX - ((hand.length - 1) * gap) / 2;

    hand.forEach((card, i) => {
      const x = playerStartX + i * gap;
      const y = 270 + hIdx * 90;

      scene.drawCard(
        card,
        x,
        y,
        hIdx === GameState.currentHandIndex
      );
    });
  });
}
