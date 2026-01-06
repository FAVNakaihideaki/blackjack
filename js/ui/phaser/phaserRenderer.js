// js/ui/phaser/phaserRenderer.js
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

  console.log('PHASER renderHands');
  scene.clearHands();

  const centerX = scene.centerX;
  const gap = 60;

  // Dealer の開始X（中央寄せ）
  const dealerStartX = centerX - ((dealerHand.length - 1) * gap) / 2;

  // ===== Dealer =====
  dealerHand.forEach((card, index) => {
    const x = dealerStartX + index * gap;
    const y = 110;

    if (hideDealerSecond && index === 1) {
      scene.drawHiddenCard(x, y);
    } else {
      scene.drawCard(card, x, y);
    }
  });

  // ===== Player =====
  const hands = allPlayerHands?.length ? allPlayerHands : [playerHand];

  hands.forEach((hand, hIdx) => {
    const playerStartX = centerX - ((hand.length - 1) * gap) / 2;

    hand.forEach((card, i) => {
      const x = playerStartX + i * gap;
      const y = 270 + hIdx * 90;

      scene.drawCard(card, x, y, hIdx === GameState.currentHandIndex);
    });
  });

  // ===== Totals =====
  // ※カード生成の後に setText してOK（Depthで前面維持）
  if (scene.dealerTotalText) {
    if (!hideDealerSecond && dealerHand?.length) {
      scene.dealerTotalText.setText(`TOTAL: ${calcHandValue(dealerHand)}`);
      scene.dealerTotalText.setDepth(1000);
    } else {
      scene.dealerTotalText.setText('');
      scene.dealerTotalText.setDepth(1000);
    }
  }

  if (scene.playerTotalText) {
    const activeHand =
      allPlayerHands?.length
        ? (allPlayerHands[GameState.currentHandIndex] ?? playerHand)
        : playerHand;

    if (activeHand?.length) {
      scene.playerTotalText.setText(`TOTAL: ${calcHandValue(activeHand)}`);
      scene.playerTotalText.setDepth(1000);
    } else {
      scene.playerTotalText.setText('');
      scene.playerTotalText.setDepth(1000);
    }
  }

  // ラベルも前面に維持（保険）
  scene.dealerLabel?.setDepth?.(1000);
  scene.playerLabel?.setDepth?.(1000);
}
