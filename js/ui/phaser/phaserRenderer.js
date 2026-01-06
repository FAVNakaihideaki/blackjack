// ui/phaser/phaserRenderer.js
import { GameState } from '../../core/gameState.js';
import { calcHandValue } from '../../core/deck.js';

let scene = null;

export function bindScene(phaserScene) {
  scene = phaserScene;
}

export function renderHands(
  playerHand,
  dealerHand,
  hideDealerSecond = false,
  allPlayerHands = null
) {
  if (!scene) return;

  scene.clearHands();

  const centerX = scene.centerX;
  const gap = 60;

  // ===== Dealer =====
  const dealerStartX = centerX - ((dealerHand.length - 1) * gap) / 2;

  dealerHand.forEach((card, index) => {
    const x = dealerStartX + index * gap;
    const y = 110;

    if (hideDealerSecond && index === 1) {
      scene.drawHiddenCard(x, y);
    } else {
      scene.drawCard(card, x, y);
    }
  });

  // Dealer 合計
  if (!hideDealerSecond && dealerHand.length) {
    const total = calcHandValue(dealerHand);
    const t = scene.add.text(centerX, 85, `TOTAL: ${total}`, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);

    scene.cardObjects.push(t);
  }

  // ===== Player =====
  const hands = allPlayerHands?.length ? allPlayerHands : [playerHand];
  const activeHand =
    allPlayerHands?.length
      ? allPlayerHands[GameState.currentHandIndex]
      : playerHand;

  hands.forEach((hand, hIdx) => {
    const startX = centerX - ((hand.length - 1) * gap) / 2;

    hand.forEach((card, i) => {
      scene.drawCard(
        card,
        startX + i * gap,
        270 + hIdx * 90,
        hIdx === GameState.currentHandIndex
      );
    });
  });

  // Player 合計
  if (activeHand?.length) {
    const total = calcHandValue(activeHand);
    const t = scene.add.text(centerX, 245, `TOTAL: ${total}`, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);

    scene.cardObjects.push(t);
  }

  scene.dealerLabel?.setDepth?.(1000);
  scene.playerLabel?.setDepth?.(1000);
}
