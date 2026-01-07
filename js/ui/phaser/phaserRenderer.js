// ui/phaser/phaserRenderer.js
import { GameState } from '../../core/gameState.js';
import { calcHandValue } from '../../core/deck.js';

let scene = null;

export function bindScene(phaserScene) {
  scene = phaserScene;
}

/**
 * HTML側の「Dealer（合計:X）」「Player（合計:Y）」を更新
 * - idが不明でも動くように、テキスト置換で拾う
 */
function updateDomTotals(dealerTotal, playerTotal) {
  const trySetByIds = (ids, value) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = String(value);
        return true;
      }
    }
    return false;
  };

  const dealerIdHit = trySetByIds(
    ['dealer-total', 'dealer-sum', 'dealerTotal', 'dealerValue'],
    dealerTotal
  );
  const playerIdHit = trySetByIds(
    ['player-total', 'player-sum', 'playerTotal', 'playerValue'],
    playerTotal
  );

  const replaceLine = (label, value) => {
    const nodes = document.querySelectorAll('p, div, span, li, h1, h2, h3, h4');
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (!t) continue;

      if (t.includes(label) && t.includes('合計:')) {
        el.textContent = t.replace(/合計:\s*\d+/g, `合計:${value}`);
        return true;
      }
    }
    return false;
  };

  if (!dealerIdHit) replaceLine('Dealer', dealerTotal);
  if (!playerIdHit) replaceLine('Player', playerTotal);
}

/**
 * Phaser側に合計を表示（毎回生成して cardObjects に入れる）
 */
function drawPhaserTotals(dealerTotal, playerTotal, hideDealerSecond) {
  if (!scene) return;

  if (!hideDealerSecond) {
    const dealerText = scene.add.text(scene.centerX, 165, `TOTAL: ${dealerTotal}`, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);

    scene.cardObjects.push(dealerText);
  }

  const playerText = scene.add.text(scene.centerX, 330, `TOTAL: ${playerTotal}`, {
    fontSize: '14px',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(1000);

  scene.cardObjects.push(playerText);
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

  // ===== Player =====
  const hands = allPlayerHands?.length ? allPlayerHands : [playerHand];

  if (hands.length >= 2) {
    // ✅ Split時：横並び + Hand別TOTALのみ（中央TOTALは出さない）
    const baseY = 270;
    const splitOffset = 150;
    const centers = [centerX - splitOffset, centerX + splitOffset];

    hands.slice(0, 2).forEach((hand, hIdx) => {
      const handCenterX = centers[hIdx];
      const startX = handCenterX - ((hand.length - 1) * gap) / 2;

      hand.forEach((card, i) => {
        const x = startX + i * gap;
        const y = baseY;
        scene.drawCard(card, x, y);
      });

      // ✅ HandごとのTOTAL（真下）
      const total = hand?.length ? calcHandValue(hand) : 0;
      const t = scene.add.text(handCenterX, baseY + 55, `TOTAL: ${total}`, {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(1000);

      scene.cardObjects.push(t);
    });

  } else {
    // ✅ 通常：中央寄せ（カードだけ描画）
    const hand = hands[0] ?? [];
    const playerStartX = centerX - ((hand.length - 1) * gap) / 2;

    hand.forEach((card, i) => {
      const x = playerStartX + i * gap;
      const y = 270;
      scene.drawCard(card, x, y);
    });
    // ⭐ ここでTOTALは描かない（drawPhaserTotalsに統一）
  }

  // ===== 合計（ロジック） =====
  const dealerTotal = (!hideDealerSecond && dealerHand?.length)
    ? calcHandValue(dealerHand)
    : 0;

  const activeHand =
    allPlayerHands?.length
      ? (allPlayerHands[GameState.currentHandIndex] ?? playerHand)
      : playerHand;

  const playerTotal = (activeHand?.length)
    ? calcHandValue(activeHand)
    : 0;

  // ① HTML側（Dealer/Player 合計）を更新
  updateDomTotals(dealerTotal, playerTotal);

  // ② Phaser側の合計表示（通常時のみ中央TOTALを出す）
  if (hands.length < 2) {
    drawPhaserTotals(dealerTotal, playerTotal, hideDealerSecond);
  }

  scene.dealerLabel?.setDepth?.(1000);
  scene.playerLabel?.setDepth?.(1000);
}
