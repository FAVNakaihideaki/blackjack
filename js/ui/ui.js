// ui/ui.js
import { isSplittable } from '../core/rules.js';
import { GameState } from '../core/gameState.js';

/**
 * メッセージ表示
 */
export function renderMessage(message) {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;

  messageEl.innerHTML = message;
}

/**
 * チップ表示
 */
export function renderChips(chips) {
  const chipsEl = document.getElementById('chips');
  if (!chipsEl) return;

  chipsEl.textContent = chips;
}

/**
 * 現在のベット表示
 */
export function renderCurrentBet(bet) {
  const betEl = document.getElementById('current-bet');
  if (!betEl) return;

  betEl.textContent = bet;
}

/**
 * ボタンの有効／無効制御
 */
export function updateButtons(state, playerHand = [], chips = 0, bet = 0) {
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const doubleBtn = document.getElementById('double-btn');
  const splitBtn = document.getElementById('split-btn');
  const startBtn = document.getElementById('start-btn');

  const buttons = [hitBtn, standBtn, doubleBtn, splitBtn, startBtn];

  // いったん全ボタンを無効化
  buttons.forEach((btn) => {
    if (btn) {
      btn.disabled = true;
      btn.classList.add('disabled');
    }
  });

  switch (state) {
    case 'INIT': {
      // ベットは chips がある限り可能
      document.querySelectorAll('.bet-btn').forEach((btn) => {
        const amount = Number(btn.dataset.amount);

        if (amount > 0) {
          // 増加ボタン → 常に有効（chipsがあれば）
          btn.disabled = (chips <= 0);
        } else {
          // 減少ボタン → betが足りないと無効
          btn.disabled = (bet + amount < 0);
        }

        if (!btn.disabled) btn.classList.remove('disabled');
      });

      // bet > 0 のときだけ Start 可能
      if (startBtn) {
        startBtn.disabled = !(bet > 0);
        if (!startBtn.disabled) startBtn.classList.remove('disabled');
      }

      // Hit / Stand / Double / Splitは無効
      if (hitBtn) hitBtn.disabled = true;
      if (standBtn) standBtn.disabled = true;
      if (doubleBtn) doubleBtn.disabled = true;
      if (splitBtn) splitBtn.disabled = true;

      break;
    }

    case 'PLAYER_TURN': {
      // Hit / Stand は常に使用可能
      if (hitBtn) {
        hitBtn.disabled = false;
        hitBtn.classList.remove('disabled');
      }

      if (standBtn) {
        standBtn.disabled = false;
        standBtn.classList.remove('disabled');
      }

      // Double：カード2枚、かつチップが足りる場合のみ
      if (doubleBtn && playerHand.length === 2 && chips >= bet) {
        doubleBtn.disabled = false;
        doubleBtn.classList.remove('disabled');
      }

      // Split：未スプリット ＆ 2枚 ＆ チップが足りる ＆ 同じ数字
      if (
        splitBtn &&
        !GameState.hasSplit &&
        playerHand.length === 2 &&
        chips >= bet &&
        isSplittable(playerHand)
      ) {
        splitBtn.disabled = false;
        splitBtn.classList.remove('disabled');
      }
      break;
    }

    case 'DEALER_TURN':
    case 'RESULT': {
      // 何もしない（全て無効のまま）
      // 次ラウンド開始ボタンは controller 側で制御
      break;
    }
  }
}

/**
 * プレイヤー統計情報の表示（名前はここで変更しない）
 */
export function renderStats(player) {
  const gamesEl = document.getElementById('total-games');
  const winEl   = document.getElementById('wins');
  const loseEl  = document.getElementById('losses');
  const drawEl  = document.getElementById('draws');
  const rateEl  = document.getElementById('win-rate');
  const maxEl   = document.getElementById('max-chips');

  if (!gamesEl) return;

  const total = player.total_games ?? 0;
  const wins  = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const draws = player.draws ?? 0;
  const maxChips = player.max_chips ?? 100;

  const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

  gamesEl.textContent = total;
  winEl.textContent   = wins;
  loseEl.textContent  = losses;
  drawEl.textContent  = draws;
  rateEl.textContent  = rate + '%';
  maxEl.textContent   = maxChips;
}

/* LocalStorageロード（ゲスト） */
export function loadGuestStats() {
  const saved = localStorage.getItem("bj_guest_stats");
  if (saved) {
    GameState.guestStats = JSON.parse(saved);
  }
  updateGuestStatDisplay();
}

/* LocalStorage保存（ゲスト） */
export function saveGuestStats() {
  localStorage.setItem("bj_guest_stats", JSON.stringify(GameState.guestStats));
}

/* ゲスト戦績更新描画 */
export function updateGuestStatDisplay() {
  renderStats({
    guest: true,
    ...GameState.guestStats
  });
}
