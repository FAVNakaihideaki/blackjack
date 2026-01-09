// ui/phaser/phaserRenderer.js
import { GameState } from '../../core/gameState.js';
import { calcHandValue } from '../../core/deck.js';

let scene = null;

export function bindScene(phaserScene) {
  scene = phaserScene;
}

// Game Over 演出（Scene側のオーバーレイを呼ぶ）
export function showGameOver() {
  scene?.showGameOverOverlay?.();
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
 * - Scene常駐Textの参照ズレ問題を避ける
 */
function drawPhaserTotals(dealerTotal, playerTotal, hideDealerSecond) {
  if (!scene) return;

  // Dealerは伏せカード中は出さない
  if (!hideDealerSecond) {
    const dealerText = scene.add
      .text(scene.centerX, 165, `TOTAL: ${dealerTotal}`, {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(1000);

    scene.cardObjects.push(dealerText);
  }

  const playerText = scene.add
    .text(scene.centerX, 330, `TOTAL: ${playerTotal}`, {
      fontSize: '14px',
      color: '#ffffff',
    })
    .setOrigin(0.5)
    .setDepth(1000);

  scene.cardObjects.push(playerText);
}

/**
 * Split時でも「ディーラーTOTALだけ」は表示したい（Hand別TOTALは別で出してるため）
 */
function drawDealerTotalOnly(dealerTotal) {
  if (!scene) return;

  const dealerText = scene.add
    .text(scene.centerX, 165, `TOTAL: ${dealerTotal}`, {
      fontSize: '14px',
      color: '#ffffff',
    })
    .setOrigin(0.5)
    .setDepth(1000);

  scene.cardObjects.push(dealerText);
}

/**
 * DOM版と「同じ引数」を受け取る
 */
export function renderHands(playerHand, dealerHand, hideDealerSecond = false, allPlayerHands = null) {
  if (!scene) return;

  scene.clearHands();

  // ★ Split中のHand1/Hand2プレイ中は「ディーラーは絶対に伏せ扱い」にする
  //   （gameController側で false が渡っても、ここで強制ガード）
  const effectiveHideDealerSecond =
    hideDealerSecond || GameState.state === 'PLAYER_TURN';

  // ★ 中央基準
  const centerX = scene.centerX;
  const gap = 60;

  // Dealer の開始X（手札枚数に応じて中央寄せ）
  const dealerStartX = centerX - ((dealerHand.length - 1) * gap) / 2;

  // ===== Dealer =====
  dealerHand.forEach((card, index) => {
    const x = dealerStartX + index * gap;
    const y = 110;

    if (effectiveHideDealerSecond && index === 1) {
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
    const splitOffset = 150; // 左右の間隔（好みで調整OK）
    const centers = [centerX - splitOffset, centerX + splitOffset];

    hands.slice(0, 2).forEach((hand, hIdx) => {
      const handCenterX = centers[hIdx];
      const startX = handCenterX - ((hand.length - 1) * gap) / 2;

      hand.forEach((card, i) => {
        const x = startX + i * gap;
        const y = baseY;

        // active=true にしない（緑フチ回避で常に白背景）
        scene.drawCard(card, x, y, false);
      });

      // ✅ HandごとのTOTAL（真下に出す）
      const total = hand?.length ? calcHandValue(hand) : 0;
      const t = scene.add
        .text(handCenterX, baseY + 55, `TOTAL: ${total}`, {
          fontSize: '14px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setDepth(1000);

      scene.cardObjects.push(t);
    });
  } else {
    // ✅ 通常：中央寄せ（カードだけ描画）
    const hand = hands[0] ?? [];
    const playerStartX = centerX - ((hand.length - 1) * gap) / 2;

    hand.forEach((card, i) => {
      const x = playerStartX + i * gap;
      const y = 270;

      // active=true にしない（緑フチ回避で常に白背景）
      scene.drawCard(card, x, y, false);
    });

    // ★ TOTALテキストはここで描かない（drawPhaserTotalsに一本化）
    //    → 「TOTALが二重」問題を根本解決
  }

  // ===== 合計（ロジック） =====
  // ※伏せカード中のDealerは「0」扱いにしてHTML表示方針と揃える
  const dealerTotal =
    !effectiveHideDealerSecond && dealerHand?.length
      ? calcHandValue(dealerHand)
      : 0;

  // PlayerはSplit時は active hand
  const activeHand =
    allPlayerHands?.length
      ? allPlayerHands[GameState.currentHandIndex] ?? playerHand
      : playerHand;

  const playerTotal = activeHand?.length ? calcHandValue(activeHand) : 0;

  // ① HTML側（Dealer/Player 合計）を更新
  updateDomTotals(dealerTotal, playerTotal);

  // ② Phaser側の合計表示
  if (hands.length >= 2) {
    // Split中：中央Player TOTALは出さない（Hand別TOTALがあるため）
    // ただし、ディーラーがオープン済みなら dealer TOTAL は出す
    if (!effectiveHideDealerSecond) {
      drawDealerTotalOnly(dealerTotal);
    }
  } else {
    // 通常時：中央TOTALを出す
    drawPhaserTotals(dealerTotal, playerTotal, effectiveHideDealerSecond);
  }

  // ラベルがカードに埋もれないように前面維持（保険）
  scene.dealerLabel?.setDepth?.(1000);
  scene.playerLabel?.setDepth?.(1000);
}
