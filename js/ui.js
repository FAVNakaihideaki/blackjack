// ui.js : 画面表示・メッセージ更新制御
import { calcHandValue } from './deck.js';

// 手札を画面に描画する関数
export function renderHands(player, dealer, hideDealer) {
  const p = document.getElementById('player-hand');
  const d = document.getElementById('dealer-hand');

  // プレイヤー側の手札を表示（合計値も計算）
  p.textContent = `Player: ${formatHand(player)} (Total: ${calcHandValue(player)})`;

  // ディーラー側は、伏せカードがある場合と全公開時で出し分け
  d.textContent = hideDealer
    ? `Dealer: ${dealer[0]?.suit}${dealer[0]?.value} 🂠`
    : `Dealer: ${formatHand(dealer)} (Total: ${calcHandValue(dealer)})`;
}

// メッセージ欄に文言を表示
export function renderMessage(msg) {
  document.getElementById('message').textContent = msg;
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

// ボタン活性制御
// 各ボタンの有効・無効をゲームの状態に合わせて自動制御します。
//
// ・INIT          ：ベットとスタートだけ有効
// ・PLAYER_TURN   ：Hit / Stand / Double / Split が有効
// ・DEALER_TURN   ：全て無効
// ・RESULT        ：Restart と Start（次ラウンド）を有効
export function updateButtons(state, playerHand, chips, bet) {
  const isPlayerTurn = state === 'PLAYER_TURN';

  // Double Down 条件：プレイヤーターン中・手札2枚・チップ充分
  const canDouble =
    isPlayerTurn &&
    playerHand.length === 2 &&
    chips >= bet;

  // Split 条件：プレイヤーターン中・手札2枚が同値・チップ充分
  const canSplit =
    isPlayerTurn &&
    playerHand.length === 2 &&
    playerHand[0]?.value === playerHand[1]?.value &&
    chips >= bet;

  // ボタンのDOMを取得
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const doubleBtn = document.getElementById('double-btn');
  const splitBtn = document.getElementById('split-btn');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // 状態に応じた活性・非活性制御
  hitBtn.disabled = !isPlayerTurn;
  standBtn.disabled = !isPlayerTurn;
  doubleBtn.disabled = !canDouble;
  splitBtn.disabled = !canSplit;

  // 🆕 RESULT状態でも次ラウンドを始められるように変更
  startBtn.disabled = !(
    (state === 'INIT' || state === 'RESULT') &&
    bet > 0 &&
    chips >= bet
  );

  restartBtn.disabled = !(state === 'RESULT');
}
