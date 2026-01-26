// controller/gameController.js

import { GameState } from '../core/gameState.js';
import { createDeck, drawCard, calcHandValue } from '../core/deck.js';
import {
  isBlackjack,
  dealerHasBlackjackChance,
  isDealerBlackjack,
  isBust,
  isSplittable
} from '../core/rules.js';
import { hit, stand, doubleDown, split } from '../core/actions.js';

// 🟦 UI抽象レイヤー（PhaserでもDOMでも対応）
import { renderHands, showGameOver } from '../ui/renderer.js';

// 🟥 DOM専用 UI（メッセージ・ボタン・チップ）
import {
  renderMessage,
  renderChips,
  renderCurrentBet,
  updateButtons,
  renderStats,
  saveGuestStats,
  updateGuestStatDisplay
} from '../ui/dom/ui.js';

/* DoubleDown可能判定（統一ロジック）*/
function computeCanDouble(hand, chips, bet) {
  return hand.length === 2 && chips >= bet;
}

// ✅ 全ハンドがバーストしているか（split/通常両対応）
function allHandsBust() {
  const hands =
    GameState.playerHands && GameState.playerHands.length > 0
      ? GameState.playerHands
      : [GameState.playerHand];

  return hands.every((h) => isBust(h));
}

// ✅ dealerTurn を呼ぶか、全BUSTなら即 endRound する
async function dealerTurnOrEndIfAllBust() {
  if (allHandsBust()) {
    updateButtons({});
    GameState.lastResult = 'LOSE';

    // ✅ dealerTurn をスキップする代わりに、結果の要約だけは出す
    const summary = buildAllBustResultSummary();
    renderMessage(`結果 : ${summary}  ｜ Total: ${GameState.chips}`);
    await wait(900); // 体感：800〜1000msが見やすい

    await endRound();
    return;
  }

  await dealerTurn();
}

function buildAllBustResultSummary() {
  const hands =
    GameState.playerHands && GameState.playerHands.length > 0
      ? GameState.playerHands
      : [GameState.playerHand];

  const bets =
    GameState.bets && GameState.bets.length > 0
      ? GameState.bets
      : [GameState.bet];

  const isSplit = hands.length >= 2;

  const parts = hands.map((_, i) => {
    const label = isSplit ? `Hand${i + 1} ` : '';
    return `💥 ${label}BUST  (-${bets[i]})`;
  });

  return parts.join(' / ');
}

/* ベット処理 */
export function setBet(amount) {
  // ★ GAME_OVER 中は操作不能
  if (GameState.state === 'GAME_OVER') return;

  if (!['INIT', 'RESULT'].includes(GameState.state)) return;

  GameState.bet += amount;

  if (GameState.bet < 0) GameState.bet = 0;
  if (GameState.bet > GameState.chips) GameState.bet = GameState.chips;

  renderCurrentBet(GameState.bet);

  // INIT/RESULT状態のボタン制御（ベット時）
  updateButtons({
    canStart: GameState.bet > 0,
    canBetIncrease: GameState.chips > 0,
    canBetDecrease: GameState.bet > 0,
  });
}

/* ゲーム開始 */
export async function startGame() {
  console.log('[startGame] called', {
    state: GameState.state,
    bet: GameState.bet,
    chips: GameState.chips,
    deck: GameState.deck?.length
  });
  // ★ GAME_OVER 中は開始させない
  if (GameState.state === 'GAME_OVER') {
    updateButtons({});
    return renderMessage('💀 ゲームオーバーです。リセットしてください。');
  }

  if (GameState.bet === 0) return renderMessage('ベットを選択してください');
  if (GameState.chips < GameState.bet) return renderMessage('チップが足りません');

  // ベットボタンを無効化
  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });

  // デッキが無い / 残りが少ないならリシャッフル
  if (!GameState.deck || GameState.deck.length < 50) {
    GameState.deck = createDeck(8);
    renderMessage('山札をリシャッフルしました');
  }

  GameState.state = 'PLAYER_TURN';
  GameState.resetHands();

  // ラウンド開始時のチップを保存する
  GameState.startChips = GameState.chips;

  // ベット分チップを減らす
  GameState.chips -= GameState.bet;
  renderChips(GameState.chips);

  // 初期配布
  GameState.playerHand = [drawCard(GameState.deck), drawCard(GameState.deck)];
  GameState.dealerHand = [drawCard(GameState.deck), drawCard(GameState.deck)];

  console.log('[deal] after initial deal', {
    deck: GameState.deck.length,
    player: GameState.playerHand.map(c => `${c.value}${c.suit}`),
    dealer: GameState.dealerHand.map(c => `${c.value}${c.suit}`)
  });

  console.log(`🃏 残りデッキ枚数: ${GameState.deck.length}`);

  renderHands(GameState.playerHand, GameState.dealerHand, true);
  updateButtons({
    canHit: true,
    canStand: true,
    canDouble:
      GameState.playerHand.length === 2 &&
      GameState.chips >= GameState.bet,
    canSplit:
      !GameState.hasSplit &&
      GameState.playerHand.length === 2 &&
      GameState.chips >= GameState.bet &&
      isSplittable(GameState.playerHand),
  });

  /* ---------- ここからガイドメッセージ（修正版）---------- */

  const canSplit =
    isSplittable(GameState.playerHand) &&
    GameState.chips >= GameState.bet;

  renderMessage(`
    カードが配られました！<br>
    どの行動をするか選びましょう。<br><br>

    <b>Hit：</b> もう1枚カードを引く<br>
    <b>Stand：</b> 現在の手札で勝負する<br>
    <b>Double Down：</b> ベットを倍にして1枚だけ引く（最初の2枚のときのみ）<br>
    <b>Split：</b> 同じ点数のカードなら2手に分けてプレイ（例：10とKなど）<br>
    ${!canSplit
      ? `<br><span style="color:#ffb347;">※ 今回の手札では Split はできません</span>`
      : ''
    }
  `);

  /* ---------- ここまでガイドメッセージ ---------- */

  // ブラックジャック判定
  if (isBlackjack(GameState.playerHand)) {

    // ディーラーがブラックジャックの可能性なし → 即勝利
    if (!dealerHasBlackjackChance(GameState.dealerHand)) {
      const reward = GameState.bet * 2.5;
      GameState.chips += reward;
      renderChips(GameState.chips);
      renderMessage(`🃏 BLACKJACK  +${reward}  / Total: ${GameState.chips}`);

      GameState.lastResult = 'WIN';
      await endRound();
      return;
    }

    // ディーラーのBJ確認フェーズ
    renderMessage('あなたはBJです。ディーラー確認中...');
    GameState.state = 'DEALER_TURN';
    updateButtons({});

    await wait(1500);
    renderHands(GameState.playerHand, GameState.dealerHand, false);

    // 両者ブラックジャック
    if (isDealerBlackjack(GameState.dealerHand)) {
      GameState.chips += GameState.bet;
      renderChips(GameState.chips);
      renderMessage('😐 両者ブラックジャック → 引き分け');

      GameState.lastResult = 'DRAW';
      await endRound();
      return;
    }

    // プレイヤーのみブラックジャック
    const reward = GameState.bet * 2.5;
    GameState.chips += reward;
    renderChips(GameState.chips);
    renderMessage(`🎉 ブラックジャック勝ち！ +${reward}`);

    GameState.lastResult = 'WIN';
    await endRound();
    return;
  }
}

/* HIT */
export async function onHit() {
  if (GameState.state !== 'PLAYER_TURN') return;

  // UI操作を一時停止
  updateButtons({});

  renderMessage('カードを引きます...');
  await wait(800);

  hit();

  console.log(`🃏 残りデッキ枚数: ${GameState.deck.length}`);

  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );

  const currentIndex = GameState.currentHandIndex;
  const currentBet = GameState.bets[currentIndex] ?? GameState.bet;

  // =========================
  // バースト処理
  // =========================
  if (isBust(GameState.playerHand)) {
    const isSplit = GameState.playerHands.length === 2;
    const label = isSplit ? `Hand${currentIndex + 1} ` : 'Hand ';
    renderMessage(`💥 ${label}BUST`);
    await wait(800);

    // Hand1のみバースト → Hand2へ進む
    if (GameState.playerHands.length === 2 && currentIndex === 0) {

      renderMessage('▶ Hand2 に移行します...');
      await wait(800);

      GameState.currentHandIndex = 1;
      GameState.playerHand = GameState.playerHands[1];
      const bet2 = GameState.bets[1] ?? GameState.bet;

      GameState.state = 'PLAYER_TURN';

      renderHands(
        GameState.playerHand,
        GameState.dealerHand,
        true,
        GameState.playerHands
      );

      updateButtons({
        canHit: true,
        canStand: true,
        canDouble: (GameState.playerHand.length === 2 && GameState.chips >= bet2),
        canSplit: false,
      });

      return;
    }

    // 👉 すべて終了 → ディーラーターンへ
    await dealerTurnOrEndIfAllBust();
    return;
  }

  // =========================
  // 続行（次の行動選択）
  // =========================
  renderMessage('次の行動を選んでください');

  updateButtons({
    canHit: true,
    canStand: true,
    canDouble: (GameState.playerHand.length === 2 && GameState.chips >= currentBet),
    canSplit:
      !GameState.hasSplit &&
      GameState.playerHand.length === 2 &&
      GameState.chips >= currentBet &&
      isSplittable(GameState.playerHand),
  });
}

/* STAND */
export async function onStand() {
  stand();

  // 🔹Split中かつ1つ目の手札なら Hand2へ
  if (
    GameState.playerHands.length === 2 &&
    GameState.currentHandIndex === 0
  ) {
    await goNextHand();
    return;
  }

  // 🔹ディーラーターンへ
  updateButtons({}); // ボタンすべて無効
  await dealerTurnOrEndIfAllBust();

  // 🔹結果表示状態へ
  return;
}

/* DOUBLE DOWN */
export async function onDoubleDown() {
  if (GameState.state !== 'PLAYER_TURN') return;

  // UI一時停止
  updateButtons({});

  renderMessage('ダブルダウン！1枚を引きます...');
  await wait(800);

  const result = doubleDown(); // 内部でベット増, 1枚追加

  const idx = GameState.currentHandIndex;
  const currentBet = GameState.bets[idx] ?? GameState.bet;

  // チップ反映
  renderChips(GameState.chips);
  renderCurrentBet(currentBet);

  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );

  // =============================
  // 🔹 Bust（バースト）
  // =============================
  if (result?.bust) {
    const isSplit = GameState.playerHands.length === 2;
    const label = isSplit ? `Hand${idx + 1} ` : 'Hand ';
    renderMessage(`💥 ${label}BUST`);
    await wait(800);

    // Hand1 → Hand2へ移行
    if (GameState.playerHands.length === 2 && idx === 0) {
      renderMessage('▶ Hand2 に移行します...');
      await wait(800);

      GameState.currentHandIndex = 1;
      GameState.playerHand = GameState.playerHands[1];
      GameState.state = 'PLAYER_TURN';

      const bet2 = GameState.bets[1] ?? GameState.bet;

      renderHands(
        GameState.playerHand,
        GameState.dealerHand,
        true,
        GameState.playerHands
      );

      updateButtons({
        canHit: true,
        canStand: true,
        canDouble: (GameState.playerHand.length === 2 && GameState.chips >= bet2),
        canSplit: false,
      });

      return;
    }

    // 全Hand終了 → Dealerへ
    await dealerTurnOrEndIfAllBust();
    return;
  }

  // =============================
  // 🔹 バーストしてない（成功）
  // =============================
  await wait(800);

  // Hand1終了 → Hand2へ移行
  if (GameState.playerHands.length === 2 && idx === 0) {
    renderMessage('▶ Hand2 に移行します...');
    await wait(800);

    GameState.currentHandIndex = 1;
    GameState.playerHand = GameState.playerHands[1];
    GameState.state = 'PLAYER_TURN';

    const bet2 = GameState.bets[1] ?? GameState.bet;

    renderHands(
      GameState.playerHand,
      GameState.dealerHand,
      true,
      GameState.playerHands
    );

    renderMessage(`▶ Hand2 をプレイ中`);

    updateButtons({
      canHit: true,
      canStand: true,
      canDouble: (GameState.playerHand.length === 2 && GameState.chips >= bet2),
      canSplit: false,
    });

    return;
  }

  // Hand2 or 通常 → Dealer
  await dealerTurnOrEndIfAllBust();
  return;
}

/* SPLIT */
export async function onSplit() {
  console.log('[onSplit] called', {
    state: GameState.state,
    hasSplit: GameState.hasSplit,
    deck: GameState.deck?.length
  });

  // 1. ロジック上の分割実行（カード配布はしない）
  const res = split();

  if (res?.error === 'ALREADY_SPLIT') {
    return renderMessage('すでにスプリット済みです');
  }
  if (res?.error === 'NOT_SAME_VALUE') {
    return renderMessage('同じ数字のみスプリット可');
  }
  if (res?.error === 'NOT_ENOUGH_CHIPS') {
    return renderMessage('チップが足りません');
  }

  // UI操作を一時停止
  updateButtons({});

  // 2. まず分割された状態（各1枚）を描画
  renderChips(GameState.chips);
  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );
  renderMessage('スプリットしました！');
  await wait(800);

  // 3. Hand1 にカードを配る
  renderMessage('Hand1 にカードを配ります...');
  await wait(600);

  // Hand1 は index 0
  GameState.playerHands[0].push(drawCard(GameState.deck));

  // 描画更新
  renderHands(
    GameState.playerHand, // 内部で currentHandIndex=0 なので Hand1 が渡るはずだが念のため
    GameState.dealerHand,
    true,
    GameState.playerHands
  );
  await wait(800);

  // 4. Hand2 にカードを配る
  renderMessage('Hand2 にカードを配ります...');
  await wait(600);

  // Hand2 は index 1
  GameState.playerHands[1].push(drawCard(GameState.deck));

  // 描画更新
  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );
  await wait(800);

  // 5. プレイ開始（Hand1）
  renderMessage(`Hand1 をプレイ中`);

  console.log('[onSplit] hands ready', {
    h1: GameState.playerHands[0].length,
    h2: GameState.playerHands[1].length
  });

  // 🔹UI更新（状態に応じてフラグ設定）
  updateButtons({
    canHit: true,
    canStand: true,
    canDouble:
      GameState.playerHand.length === 2 &&
      GameState.chips >= GameState.bet,
    canSplit: false, // スプリット後は不可
  });
}

/* ディーラーターン */
async function dealerTurn() {
  GameState.state = 'DEALER_TURN';

  updateButtons({}); // 🔹プレイヤー操作完全停止

  renderMessage('ディーラーのターン…');
  await wait(1000);

  // 伏せカードオープン（まだ合計は隠す）
  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );
  renderMessage('ディーラーのカードがオープン…');
  await wait(800);

  // 合計表示
  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    false,
    GameState.playerHands
  );
  await wait(800);

  // 17未満なら連続で HIT
  while (calcHandValue(GameState.dealerHand) < 17) {
    GameState.dealerHand.push(drawCard(GameState.deck));

    console.log(`🃏 残りデッキ枚数: ${GameState.deck.length}`);

    renderHands(
      GameState.playerHand,
      GameState.dealerHand,
      true,
      GameState.playerHands
    );
    renderMessage('ディーラーがカードを引きました…');
    await wait(800);

    renderHands(
      GameState.playerHand,
      GameState.dealerHand,
      false,
      GameState.playerHands
    );
    await wait(800);
  }

  // ==============================
  // 🔹ここから勝敗判定（SPILT対応）
  // ==============================
  const dealerValue = calcHandValue(GameState.dealerHand);
  const hands = GameState.playerHands.length > 0
    ? GameState.playerHands
    : [GameState.playerHand];
  const bets = GameState.bets.length > 0
    ? GameState.bets
    : [GameState.bet];

  let summary = [];

  for (let i = 0; i < hands.length; i++) {
    const hand = hands[i];
    const playerValue = calcHandValue(hand);
    const bet = bets[i];
    const isSplit = hands.length >= 2;
    const label = isSplit ? `Hand${i + 1} ` : 'Hand ';

    let text = '';

    if (playerValue > 21) {
      text = `💥 ${label}BUST  (-${bet})`;
    } else if (dealerValue > 21 || playerValue > dealerValue) {
      const gain = bet * 2;
      GameState.chips += gain;
      text = `🎉 ${label}WIN  (+${gain})`;
    } else if (playerValue < dealerValue) {
      text = `💀 ${label}LOSE  (-${bet})`;
    } else {
      GameState.chips += bet;
      text = `😐 ${label}PUSH (+${bet})`;
    }

    renderMessage(text);
    await wait(1000);

    summary.push(text);
  }

  renderChips(GameState.chips);

  const diff = GameState.chips - GameState.startChips;
  if (diff > 0) GameState.lastResult = 'WIN';
  else if (diff < 0) GameState.lastResult = 'LOSE';
  else GameState.lastResult = 'DRAW';

  renderMessage(
    `結果 : ${summary.join(' / ')}  ｜ Total: ${GameState.chips}`
  );

  updateButtons({}); // 🔹結果画面でも全無効のまま

  await endRound();
}

/* スプリット次の手へ */
async function goNextHand() {
  renderMessage('▶ Hand2 に移行します...');
  await wait(800);

  GameState.currentHandIndex = 1;
  GameState.playerHand = GameState.playerHands[1];

  const bet2 = GameState.bets[1] ?? GameState.bet;
  GameState.state = 'PLAYER_TURN';

  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );

  renderMessage('Hand2 をプレイ中');

  updateButtons({
    canHit: true,
    canStand: true,
    canDouble: (GameState.playerHand.length === 2 && GameState.chips >= bet2),
    canSplit: false
  });
}

/* ラウンド終了 */
async function endRound() {
  GameState.state = 'RESULT';
  renderChips(GameState.chips);
  updateButtons({});

  /*============================
    🟦 ゲスト（DB保存なし）
  ============================*/
  if (!window.USER_ID) {
    const g = GameState.guestStats;

    g.total_games++;
    if (GameState.lastResult === "WIN") g.wins++;
    if (GameState.lastResult === "LOSE") g.losses++;
    if (GameState.lastResult === "DRAW") g.draws++;

    g.max_chips = Math.max(g.max_chips, GameState.chips);

    saveGuestStats();
    updateGuestStatDisplay(g);

    // ★ ここで GAME OVER 判定（ゲスト）
    if (GameState.chips <= 0) {
      GameState.bet = 0;
      GameState.lastResult = null;
      renderCurrentBet(0);

      GameState.state = 'GAME_OVER';
      renderMessage(`
      <div class="gameover">
        <div>💀 ゲームオーバー</div>
        <div>チップがなくなりました。</div>
        <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
          <button id="refill-chips-btn">資金補充</button>
          <button id="full-reset-btn">全リセット</button>
        </div>
      </div>
    `);
      updateButtons({});
      showGameOver();
      return;
    }

    GameState.bet = 0;
    GameState.lastResult = null;
    renderCurrentBet(0);
    createNextRoundButton();
    return;
  }

  /*============================
    🟩 ログイン済み（DB更新）
  ============================*/
  try {
    /* ① 集計テーブル更新 */
    await fetch('/api/player/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: window.USER_ID,
        chips: GameState.chips,
        result: GameState.lastResult
      })
    });

    /* ② 対局履歴テーブルに INSERT */
    await fetch('/api/game-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: window.USER_ID,
        result: GameState.lastResult,
        bet: GameState.bet,
        payout: GameState.chips - GameState.startChips,

        start_chips: GameState.startChips,
        end_chips: GameState.chips,

        is_blackjack: GameState.isBlackjackRound || false,
        is_double: GameState.usedDouble || false,
        is_split: GameState.hasSplit || false
      })
    });

    /* ③ 再取得して同期 */
    const res = await fetch(`/api/player?uid=${window.USER_ID}`);
    const data = await res.json();

    GameState.chips = data.chips;
    renderChips(data.chips);
    renderStats(data);

  } catch (err) {
    console.error("DB更新エラー:", err);
  }

  window.loadGameHistory?.(10);

  // ★ ここで GAME OVER 判定（ログイン）
  if (GameState.chips <= 0) {
    GameState.bet = 0;
    GameState.lastResult = null;
    renderCurrentBet(0);

    GameState.state = 'GAME_OVER';
    renderMessage(`
      <div class="gameover">
        <div>💀 ゲームオーバー</div>
        <div>チップがなくなりました。</div>
        <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
          <button id="refill-chips-btn">資金補充</button>
          <button id="full-reset-btn">全リセット</button>
        </div>
      </div>
    `);
    updateButtons({});
    showGameOver();
    return;
  }

  GameState.bet = 0;
  GameState.lastResult = null;
  renderCurrentBet(0);
  createNextRoundButton();

  if (window.USER_ID) {
    await loadGameStats();
  }
}

/* 次ラウンドボタン生成 */
function createNextRoundButton() {
  const existing = document.getElementById('next-round-btn');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.id = 'next-round-btn';
  btn.textContent = '▶ 次のラウンドへ';
  btn.classList.add('next-round-btn');

  const container = document.getElementById('next-round-container');
  if (container) {
    container.innerHTML = '';
    container.appendChild(btn);
  }

  btn.addEventListener('click', () => {
    // ★ GAME_OVER なら次ラウンド禁止（保険）
    if (GameState.state === 'GAME_OVER' || GameState.chips <= 0) {
      renderMessage('💀 ゲームオーバーです。リセットしてください。');
      updateButtons({});
      if (container) container.innerHTML = '';
      return;
    }

    GameState.resetForNextRound();
    renderHands([], [], false);
    renderCurrentBet(0);
    renderMessage('ベットを選択してください');

    updateButtons({
      canStart: false,
      canBetIncrease: GameState.chips > 0,
      canBetDecrease: false,
    });

    if (container) container.innerHTML = '';
  });
}

/* 共通 wait */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
