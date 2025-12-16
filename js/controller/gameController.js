// controller/gameController.js

import { GameState } from '../core/gameState.js';
import { createDeck, drawCard, calcHandValue } from '../core/deck.js';
import { isBlackjack, dealerHasBlackjackChance, isDealerBlackjack, isBust, isSplittable } from '../core/rules.js';
import { hit, stand, doubleDown, split } from '../core/actions.js';

// 🟦 UI抽象レイヤー（PhaserでもDOMでも対応）
import { renderHands } from '../ui/renderer.js';

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

/* ベット処理 */
export function setBet(amount) {
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
  if (GameState.bet === 0) return renderMessage('ベットを選択してください');
  if (GameState.chips < GameState.bet) return renderMessage('チップが足りません');

  // ベットボタンを無効化
  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });

  // デッキ確認（少なければ再作成）
  if (!window.deck || window.deck.length < 50) {
    window.deck = createDeck(8);
    renderMessage('山札をリシャッフルしました');
  }

  GameState.state = 'PLAYER_TURN';
  GameState.resetHands();

  //ラウンド開始時のチップを保存する
  GameState.startChips = GameState.chips;

  // ベット分チップを減らす
  GameState.chips -= GameState.bet;
  renderChips(GameState.chips);

  // 初期配布
  GameState.playerHand = [drawCard(), drawCard()];
  GameState.dealerHand = [drawCard(), drawCard()];

  console.log(`🃏 残りデッキ枚数: ${window.deck.length}`);

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
    ${
      !canSplit
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
      endRound();
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
      endRound();
      return;
    }

    // プレイヤーのみブラックジャック
    const reward = GameState.bet * 2.5;
    GameState.chips += reward;
    renderChips(GameState.chips);
    renderMessage(`🎉 ブラックジャック勝ち！ +${reward}`);

    GameState.lastResult = 'WIN';
    endRound();
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

  console.log(`🃏 残りデッキ枚数: ${window.deck.length}`);

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
    renderMessage(`💥 Hand${currentIndex + 1} BUST`);
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
        false,
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
    await dealerTurn();
    GameState.state = 'RESULT';
    updateButtons({});
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
  await dealerTurn();

  // 🔹結果表示状態へ
  GameState.state = 'RESULT';
  updateButtons({}); // 結果表示中は全無効
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

    renderMessage(`💥 Hand${idx + 1} BUST`);
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
        false,
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
    await dealerTurn();
    GameState.state = 'RESULT';
    updateButtons({});
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
      false,
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
  await dealerTurn();
  GameState.state = 'RESULT';
  updateButtons({});
}

/* SPLIT */
export function onSplit() {
  const res = split();

  if (res?.error === 'NOT_SAME_VALUE') {
    return renderMessage('同じ数字のみスプリット可');
  }

  if (res?.error === 'NOT_ENOUGH_CHIPS') {
    return renderMessage('チップが足りません');
  }

  // チップ更新
  renderChips(GameState.chips);

  // 手札UI更新
  renderHands(
    GameState.playerHand,
    GameState.dealerHand,
    true,
    GameState.playerHands
  );

  renderMessage(`スプリット！ Hand1 をプレイ中`);

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
    GameState.dealerHand.push(drawCard());

    console.log(`🃏 残りデッキ枚数: ${window.deck.length}`);

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

    let text = '';

    if (playerValue > 21) {
      text = `💥 Hand${i + 1} BUST  (-${bet})`;
    } else if (dealerValue > 21 || playerValue > dealerValue) {
      const gain = bet * 2;
      GameState.chips += gain;
      text = `🎉 Hand${i + 1} WIN  (+${gain})`;
    } else if (playerValue < dealerValue) {
      text = `💀 Hand${i + 1} LOSE  (-${bet})`;
    } else {
      GameState.chips += bet;
      text = `😐 Hand${i + 1} PUSH (+${bet})`;
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

  endRound();
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
    false,
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

    /* ② ★ 対局履歴テーブルに INSERT（←追加） */
    await fetch('/api/game-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: window.USER_ID,
        result: GameState.lastResult,
        bet: GameState.bet,
        payout: GameState.chips - GameState.startChips,
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

  GameState.bet = 0;
  GameState.lastResult = null;
  renderCurrentBet(0);
  createNextRoundButton();
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
