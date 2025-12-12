// ui/dom/ui.js

import { GameState } from "../../core/gameState.js";

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
 * ボタンの有効／無効制御（描画のみ担当：ロジックはController側）
 */
export function updateButtons({
  canHit = false,
  canStand = false,
  canDouble = false,
  canSplit = false,
  canStart = false,
  canBetIncrease = false,
  canBetDecrease = false,
} = {}) {

  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const doubleBtn = document.getElementById('double-btn');
  const splitBtn = document.getElementById('split-btn');
  const startBtn = document.getElementById('start-btn');
  const betBtns = document.querySelectorAll('.bet-btn');

  // ======== 全操作ボタンを一度無効化 =========
  [hitBtn, standBtn, doubleBtn, splitBtn, startBtn].forEach(btn => {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add('disabled');
  });

  // ======== プレイ操作制御 =========
  if (hitBtn && canHit) {
    hitBtn.disabled = false;
    hitBtn.classList.remove('disabled');
  }

  if (standBtn && canStand) {
    standBtn.disabled = false;
    standBtn.classList.remove('disabled');
  }

  if (doubleBtn && canDouble) {
    doubleBtn.disabled = false;
    doubleBtn.classList.remove('disabled');
  }

  if (splitBtn && canSplit) {
    splitBtn.disabled = false;
    splitBtn.classList.remove('disabled');
  }

  // ======== Start（ゲーム開始可否） =========
  if (startBtn) {
    startBtn.disabled = !canStart;
    startBtn.classList.toggle('disabled', !canStart);
  }

  // ======== ベット増減制御 =========
  betBtns.forEach(btn => {
    const amount = Number(btn.dataset.amount);
    const enable = amount > 0 ? canBetIncrease : canBetDecrease;

    btn.disabled = !enable;
    btn.classList.toggle('disabled', !enable);
  });
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

  const wins   = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const draws  = player.draws ?? 0;
  const maxChips = player.max_chips ?? 100;

  // ★ DB に total_games は存在しないので自前で計算
  const total = wins + losses + draws;

  // ★ 勝率計算
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

  gamesEl.textContent = total;
  winEl.textContent   = wins;
  loseEl.textContent  = losses;
  drawEl.textContent  = draws;
  rateEl.textContent  = rate + '%';
  maxEl.textContent   = maxChips;
}

/**
 * ゲスト戦績描画
 */
export function updateGuestStatDisplay() {
  renderStats({
    guest: true,
    ...GameState.guestStats
  });
}

/**
 * LocalStorageロード（ゲスト）
 */
export function loadGuestStats() {
  const saved = localStorage.getItem("bj_guest_stats");

  if (!saved || saved === "undefined") {
    GameState.guestStats = {
      total_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      max_chips: 100
    };
    saveGuestStats();
    return;
  }

  try {
    GameState.guestStats = JSON.parse(saved);
  } catch (e) {
    console.warn("⚠ ゲストデータ破損 → 初期化します");
    GameState.guestStats = {
      total_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      max_chips: 100
    };
    saveGuestStats();
  }

  updateGuestStatDisplay();
}

/**
 * LocalStorage保存（ゲスト）
 */
export function saveGuestStats() {
  localStorage.setItem("bj_guest_stats", JSON.stringify(GameState.guestStats));
}
