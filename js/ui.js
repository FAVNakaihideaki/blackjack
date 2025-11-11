// ui.js : 画面表示・メッセージ更新制御
import { calcHandValue } from './deck.js';

// 手札を画面に描画する関数（スプリット対応版）
export function renderHands(player, dealer, hideDealer, playerHands = []) {
  const p = document.getElementById('player-hand');
  const d = document.getElementById('dealer-hand');

  // --- ディーラー表示 ---
  d.textContent = hideDealer
    ? `Dealer: ${dealer[0]?.suit}${dealer[0]?.value} 🂠`
    : `Dealer: ${formatHand(dealer)} (Total: ${calcHandValue(dealer)})`;

  // --- プレイヤー表示 ---
  if (playerHands.length > 1) {
    // スプリット時：2つの手をそれぞれ表示
    const handsText = playerHands
      .map((hand, i) => {
        const total = calcHandValue(hand);
        return `Hand${i + 1}: ${formatHand(hand)} (Total: ${total})`;
      })
      .join(' | ');
    p.textContent = `Player → ${handsText}`;
  } else {
    // 通常時
    const total = calcHandValue(player);
    p.textContent = `Player: ${formatHand(player)} (Total: ${total})`;
  }
}

// メッセージ欄に文言を表示
export function renderMessage(msg) {
  const messageElem = document.getElementById('message');
  messageElem.innerHTML = msg; // ← textContent を innerHTML に変更！
}

// 手札配列を "♠A ♥10" のような文字列に整形
function formatHand(hand) {
  return hand.map(c => `${c.suit}${c.value}`).join(' ');
}

// 所持チップの表示を更新
export function renderChips(chips) {
  document.getElementById('chips').textContent = `Chips: ${chips}`;
}

// 現在のベット額を表示更新
export function renderCurrentBet(bet) {
  document.getElementById('current-bet').textContent = `Current Bet: ${bet}`;
}

// ===========================================
// ボタン活性制御
// ===========================================
// ・INIT          ：ベットとスタートだけ有効
// ・PLAYER_TURN   ：Hit / Stand / Double / Split が有効
// ・DEALER_TURN   ：全て無効
// ・RESULT        ：次ラウンド（Next）ボタンのみ有効
export function updateButtons(state, playerHand, chips, bet) {
  const isPlayerTurn = state === 'PLAYER_TURN';

  const getCardNumericValue = (card) => {
    if (!card) return 0;
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
  };

  // --- ダブルダウン可否 ---
  const canDouble =
    isPlayerTurn &&
    playerHand.length === 2 &&
    chips >= bet;

  // --- スプリット可否（絵札・10同値対応） ---
  const canSplit =
    isPlayerTurn &&
    playerHand.length === 2 &&
    chips >= bet &&
    getCardNumericValue(playerHand[0]) === getCardNumericValue(playerHand[1]);

  // --- ボタン要素を取得 ---
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const doubleBtn = document.getElementById('double-btn');
  const splitBtn = document.getElementById('split-btn');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // --- チップボタン制御 ---
  const chipBtns = document.querySelectorAll('.chip-btn, .bet-btn');
  chipBtns.forEach(btn => {
    btn.disabled = state !== 'INIT';
  });

  // --- 各状態での活性制御 ---
  if (hitBtn) hitBtn.disabled = !isPlayerTurn;
  if (standBtn) standBtn.disabled = !isPlayerTurn;
  if (doubleBtn) doubleBtn.disabled = !canDouble;
  if (splitBtn) splitBtn.disabled = !canSplit;

  // --- Startボタン ---
  if (startBtn)
    startBtn.disabled = !(
      state === 'INIT' &&
      bet > 0 &&
      chips >= bet
    );

  // --- Restartボタン（今はない） ---
  if (restartBtn) restartBtn.disabled = !(state === 'RESULT');
}
