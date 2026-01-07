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
  // 1) ありがちなIDで拾う（もしあれば最優先で更新）
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

  // 2) idで取れない場合：スクショ形式の文言を置換して更新
  // 例: "Dealer（合計:0）" → "Dealer（合計:12）"
  const replaceLine = (label, value) => {
    const nodes = document.querySelectorAll('p, div, span, li, h1, h2, h3, h4');
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (!t) continue;

      // "Dealer（合計:0）" / "Player（合計:0）" を想定
      if (t.includes(label) && t.includes('合計:')) {
        // "合計:" の後ろの数字だけ差し替え
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
 * - Scene常駐Textの参照ズレ問題を避ける
 */
function drawPhaserTotals(dealerTotal, playerTotal, hideDealerSecond) {
  if (!scene) return;

  // Dealerは伏せカード中は出さない（方針に合わせる）
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

  // ★ 中央基準
  const centerX = scene.centerX;
  const gap = 60;

  // Dealer の開始X（手札枚数に応じて中央寄せ）
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

  if (hands.length >= 2) {
    // ✅ Split時：横並び
    const baseY = 270;
    const splitOffset = 150; // 左右の間隔（好みで 130〜180）
    const centers = [centerX - splitOffset, centerX + splitOffset];

    hands.slice(0, 2).forEach((hand, hIdx) => {
      const handCenterX = centers[hIdx];
      const startX = handCenterX - ((hand.length - 1) * gap) / 2;

      hand.forEach((card, i) => {
        const x = startX + i * gap;
        const y = baseY;
        scene.drawCard(card, x, y /* activeは見た目変えないなら渡さなくてOK */);
      });

      // ✅ HandごとのTOTAL（真下に出す）
      const total = hand?.length ? calcHandValue(hand) : 0;
      const t = scene.add.text(handCenterX, baseY + 55, `TOTAL: ${total}`, {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(1000);

      scene.cardObjects.push(t);
    });

  } else {
    // ✅ 通常：中央寄せ（従来通り）
    const hand = hands[0] ?? [];
    const playerStartX = centerX - ((hand.length - 1) * gap) / 2;

    hand.forEach((card, i) => {
      const x = playerStartX + i * gap;
      const y = 270;
      scene.drawCard(card, x, y);
    });

    const total = hand?.length ? calcHandValue(hand) : 0;
    const t = scene.add.text(centerX, 325, `TOTAL: ${total}`, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);

    scene.cardObjects.push(t);
  }

  // ===== 合計（ロジック） =====
  // ※伏せカード中のDealerは「0」扱いにして、HTMLの表示方針と揃える
  const dealerTotal = (!hideDealerSecond && dealerHand?.length)
    ? calcHandValue(dealerHand)
    : 0;

  // PlayerはSplit時は active hand
  const activeHand =
    allPlayerHands?.length
      ? (allPlayerHands[GameState.currentHandIndex] ?? playerHand)
      : playerHand;

  const playerTotal = (activeHand?.length)
    ? calcHandValue(activeHand)
    : 0;

  // ① HTML側（Dealer/Player 合計）を更新
  updateDomTotals(dealerTotal, playerTotal);

  // ② Phaser側にも合計を表示（カードと同じクリア対象にする）
  drawPhaserTotals(dealerTotal, playerTotal, hideDealerSecond);

  // ラベルがカードに埋もれないように前面維持（保険）
  scene.dealerLabel?.setDepth?.(1000);
  scene.playerLabel?.setDepth?.(1000);
}
