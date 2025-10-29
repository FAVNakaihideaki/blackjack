// Blackjack メインゲームロジック

import { createDeck, calcHandValue } from './deck.js';
import { renderHands, renderMessage, renderChips, renderCurrentBet } from './ui.js';

// グローバル変数（ゲーム状態管理）
let deck = [];             // 山札（52枚）
let playerHand = [];       // プレイヤーの手札
let dealerHand = [];       // ディーラーの手札
let chips = parseInt(localStorage.getItem('chips')) || 100; // チップ（localStorageで保存）
let bet = 0;               // 現在のベット額
let state = 'INIT';        // ゲーム状態（INIT, PLAYER_TURN, DEALER_TURN, RESULT）

// ベット設定処理

export function setBet(amount) {
  if (state === 'INIT') {        // ゲーム開始前のみ変更可能
    bet = amount;
    renderCurrentBet(bet);       // 画面のベット表示を更新
  }
}

// ゲーム開始処理

export function startGame() {
  // ベット未設定またはチップ不足時は開始不可
  if (bet === 0 || chips < bet) return renderMessage('Place Your Bet');

  state = 'PLAYER_TURN';         // プレイヤーのターンに遷移

  // 残りカードが少ない場合は山札を再生成
  if (deck.length < 15) deck = createDeck();

  // プレイヤーとディーラーに2枚ずつカードを配布
  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];

  // ベット分を所持チップから減算
  chips -= bet;

  // 初期状態を描画（ディーラー2枚目は伏せ）
  renderHands(playerHand, dealerHand, true);
  renderChips(chips);

  // ブラックジャック判定（A + 10点札）
  if (isBlackjack(playerHand)) {
    renderHands(playerHand, dealerHand, false);
    renderMessage('Blackjack!');
    chips += bet * 2.5;          // 3:2 の配当
    endRound();                  // ラウンド終了
  }
}

// プレイヤー操作：Hit

export function hitCard() {
  if (state !== 'PLAYER_TURN') return;

  // カードを1枚引く
  playerHand.push(deck.pop());
  renderHands(playerHand, dealerHand, true);

  // 合計が21を超えた場合はバースト（敗北）
  if (calcHandValue(playerHand) > 21) {
    renderMessage('Bust! You Lose');
    endRound();
  }
}


// プレイヤー操作：Stand

export function standGame() {
  if (state !== 'PLAYER_TURN') return;
  state = 'DEALER_TURN';

  // ディーラーは合計17以上になるまで自動でHit
  while (calcHandValue(dealerHand) < 17) dealerHand.push(deck.pop());

  // ディーラーの全カードを表示
  renderHands(playerHand, dealerHand, false);

  // プレイヤー／ディーラーの合計値を比較
  const p = calcHandValue(playerHand);
  const d = calcHandValue(dealerHand);
  judgeResult(p, d);
}

// 勝敗判定

function judgeResult(p, d) {
  let msg = '';

  if (p > 21) msg = 'Bust! You Lose';                     // プレイヤーがバースト
  else if (d > 21) { msg = 'Dealer Bust! You Win'; chips += bet * 2; } // ディーラーがバースト
  else if (p > d) { msg = 'You Win'; chips += bet * 2; }  // 勝利
  else if (p < d) msg = 'You Lose';                       // 敗北
  else { msg = 'Draw'; chips += bet; }                    // 引き分け（ベット返還）

  renderMessage(msg);
  endRound();
}

// ラウンド終了処理（共通）

function endRound() {
  renderChips(chips);
  localStorage.setItem('chips', chips); // チップ残高を保存
  state = 'RESULT';
  if (chips <= 0) renderMessage('Game Over');
}

// ブラックジャック判定（最初の2枚がA＋10点札）

function isBlackjack(hand) {
  if (hand.length !== 2) return false;
  const vals = hand.map(c => c.value);
  return vals.includes('A') && ['10', 'J', 'Q', 'K'].some(v => vals.includes(v));
}

// 再スタート処理

export function restartGame() {
  bet = 0;
  state = 'INIT';
  renderCurrentBet(bet);
  renderMessage('Place Your Bet');
  renderHands([], [], false); // 手札をリセット表示
}
