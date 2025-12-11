// main.js

let auth0 = null;

// Auth0初期化
async function initAuth() {
  auth0 = await window.createAuth0Client({
    domain: "dev-n5rykvdin2zla61p.us.auth0.com",
    clientId: "TLSpVDVgBNzGn4U9P6oEISi7lZTfvjOD",
    authorizationParams: {
      redirect_uri: "https://blackjack-lime-ten.vercel.app/",
      prompt: "select_account",
    }
  });

  // リダイレクト処理
  if (window.location.search.includes("code=")) {
    await auth0.handleRedirectCallback();
    window.history.replaceState({}, document.title, "/");
  }

  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    const user = await auth0.getUser();
    window.USER_ID = user.sub;

    document.getElementById("login-btn").style.display = "none";
    document.getElementById("logout-btn").style.display = "inline-block";
  } else {
    window.USER_ID = null;
    document.getElementById("login-btn").style.display = "inline-block";
    document.getElementById("logout-btn").style.display = "none";
  }
}

// ログイン
document.getElementById("login-btn").onclick = () =>
  auth0.loginWithRedirect();

// ログアウト
document.getElementById("logout-btn").onclick = async () => {
  await auth0.logout({
    logoutParams: { returnTo: window.location.origin }
  });

  window.USER_ID = null;
  GameState.chips = 100;
  renderChips(GameState.chips);

  loadGuestStats();
  renderStats({ guest: true });

  if (document.getElementById('player-name'))
    document.getElementById('player-name').textContent = "Guest";

  renderMessage("ゲストモードになりました");
};

// Imports
import {
  startGame,
  setBet,
  onHit,
  onStand,
  onDoubleDown,
  onSplit,
} from './controller/gameController.js';

import {
  renderChips,
  renderMessage,
  renderCurrentBet,
  updateButtons,
  renderStats,
  loadGuestStats,
} from './ui/dom/ui.js';

import { GameState } from './core/gameState.js';
import { renderHands } from './ui/renderer.js';

// プレイヤー名表示
async function updateUserNameInUI() {
  const user = await auth0.getUser();
  const nameEl = document.getElementById('player-name');
  if (!user || !nameEl) return;

  nameEl.textContent =
    user.name || user.nickname || user.email || "Player";
}

// UIボタン参照
const startBtn = document.getElementById('start-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const splitBtn = document.getElementById('split-btn');
const betBtns = document.querySelectorAll('.bet-btn');
const resetBtn = document.getElementById('reset-chips-btn');

// イベント設定
startBtn?.addEventListener('click', startGame);
hitBtn?.addEventListener('click', onHit);
standBtn?.addEventListener('click', onStand);
doubleBtn?.addEventListener('click', onDoubleDown);
splitBtn?.addEventListener('click', onSplit);
betBtns.forEach(btn =>
  btn.addEventListener('click', () => setBet(Number(btn.dataset.amount)))
);

// リセットボタン
resetBtn?.addEventListener('click', async () => {
  GameState.resetForNextRound?.();
  GameState.bet = 0;

  renderHands([], []);
  renderCurrentBet(0);
  renderChips(GameState.chips);
  renderMessage("ベットを選択してください");

  updateButtons({
    canStart: false,
    canBetIncrease: GameState.chips > 0,
    canBetDecrease: false,
  });

  if (!window.USER_ID) {
    GameState.guestStats = {
      total_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      max_chips: 100,
    };
    localStorage.removeItem("bj_guest_stats");
    GameState.chips = 100;
    renderChips(GameState.chips);
    renderStats({ guest: true });
    renderMessage("ゲストデータを初期化しました");
    return;
  }

  try {
    const res = await fetch('/api/player/resetAll', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: window.USER_ID }),
    });

    const data = await res.json();
    GameState.chips = data.chips;
    renderChips(data.chips);
    renderStats(data);
    renderMessage("データを初期化しました");
  } catch (err) {
    console.error("DB更新エラー:", err);
  }
});

// プレイヤーデータ読み込み
async function loadPlayer() {

  if (!window.USER_ID) {
    GameState.chips = 100;
    renderChips(GameState.chips);
    loadGuestStats();
    renderStats({ guest: true });
    const nameEl = document.getElementById('player-name');
    if (nameEl) nameEl.textContent = "Guest";
    renderMessage("ゲストモードです");
    return;
  }

  const res = await fetch(`/api/player?uid=${window.USER_ID}`);
  let data = await res.json();

  if (!data) {
    const res2 = await fetch("/api/player/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: window.USER_ID }),
    });
    data = await res2.json();
  }

  GameState.chips = data.chips;
  renderChips(data.chips);
  renderStats(data);

  await updateUserNameInUI();
  renderMessage("データを同期しました");
}

// ===== アプリ初期処理 =====
window.addEventListener("load", async () => {
  await initAuth();
  await loadPlayer();
  renderCurrentBet(GameState.bet || 0);
  renderMessage("ベットを選択してください");

  // 🔥 UI初期状態フラグ
  updateButtons({
    canStart: GameState.bet > 0,
    canBetIncrease: GameState.chips > 0,
    canBetDecrease: GameState.bet > 0,
  });
});
