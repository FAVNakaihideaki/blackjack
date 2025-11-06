// Blackjack メインゲームロジック

import { createDeck, calcHandValue } from './deck.js';
import { renderHands, renderMessage, renderChips, renderCurrentBet,updateButtons, } from './ui.js';


// グローバル変数（ゲーム状態管理）
let deck = [];             // 山札（52枚）
let playerHand = [];       // プレイヤーの手札
let dealerHand = [];       // ディーラーの手札
let chips = parseInt(localStorage.getItem('chips')) || 100; // チップ（localStorageで保存）
let bet = 0;               // 現在のベット額
let state = 'INIT';        // ゲーム状態（INIT, PLAYER_TURN, DEALER_TURN, RESULT）

// スプリット用
let playerHands = [];   // スプリット用に複数の手を保持
let currentHandIndex = 0; // 今どちらの手をプレイ中かを示す

// ベット設定処理

export function setBet(amount) {
  if (state === 'INIT' || state === 'RESULT') { // RESULTでも許可
    bet += amount;

    // 下限チェック：0未満にならない
    if (bet < 0) bet = 0;

    // 上限チェック：チップ以上は不可
    if (bet > chips) bet = chips;
    
    renderCurrentBet(bet);       // 画面のベット表示を更新
    updateButtons(state, playerHand, chips, bet);      // ベット後にボタン状態を更新
  }
}

// ゲーム開始処理

export function startGame() {
  // ベット未設定またはチップ不足時は開始不可
  if (bet === 0) return renderMessage('ベットを選択してください');
  if (chips < bet) return renderMessage('チップが足りません');

  renderMessage('ラウンド開始！');

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
  updateButtons(state, playerHand, chips, bet);

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
    renderMessage('バースト！あなたの負けです');
    endRound();
  }
}


// プレイヤー操作：Stand

export function standGame() {
  if (state !== 'PLAYER_TURN') return;

  // スプリット中で次の手がある場合
  if (playerHands.length === 2 && currentHandIndex === 0) {
    endRoundOrNextHand();
    return;
  }

  // 通常または2手目の最終手のとき
  state = 'DEALER_TURN';
  while (calcHandValue(dealerHand) < 17) dealerHand.push(deck.pop());

  renderHands(playerHand, dealerHand, false);

  const p = calcHandValue(playerHand);
  const d = calcHandValue(dealerHand);
  judgeResult(p, d);
}

// ダブルダウン処理
export function doubleDown() {
  if (state !== 'PLAYER_TURN') return;
  if (playerHand.length !== 2) return renderMessage('ダブルダウンは最初の2枚のときのみ実行できます');
  if (chips < bet) return renderMessage('チップが足りません');

  chips -= bet;  // ベット分追加支払い
  bet *= 2;
  renderChips(chips);
  renderCurrentBet(bet);

  // カードを1枚追加し、自動的にスタンド
  playerHand.push(deck.pop());
  renderHands(playerHand, dealerHand, true);

  standGame();
}

// スプリット処理
export function splitHand() {
  if (state !== 'PLAYER_TURN') return;
  if (playerHand.length !== 2) return renderMessage('スプリットは最初の2枚のときのみ実行できます');
  if (playerHand[0].value !== playerHand[1].value) return renderMessage('同じ値のカードのみスプリット可能です');
  if (chips < bet) return renderMessage('チップが足りません');

  // ベット追加支払い
  chips -= bet;
  renderChips(chips);

  // 各手を分けて新しいカードを配布
  const first = [playerHand[0], deck.pop()];
  const second = [playerHand[1], deck.pop()];

  playerHands = [first, second];
  currentHandIndex = 0;

  // 1手目開始
  playerHand = playerHands[currentHandIndex];
  renderHands(playerHand, dealerHand, true);
  renderMessage(`スプリット！手札${currentHandIndex + 1}をプレイ中`);
}

// 勝敗判定

function judgeResult(p, d) {
  let msg = '';

  if (p > 21) msg = 'バースト！あなたの負けです';                     // プレイヤーがバースト
  else if (d > 21) { msg = 'ディーラーがバースト！あなたの勝ちです'; chips += bet * 2; } // ディーラーがバースト
  else if (p > d) { msg = 'あなたの勝ちです'; chips += bet * 2; }  // 勝利
  else if (p < d) msg = 'あなたの負けです';                       // 敗北
  else { msg = '引き分けです'; chips += bet; }                    // 引き分け（ベット返還）

  renderMessage(msg);

    // スプリット中の1手目なら次のハンドへ
  if (playerHands.length === 2 && currentHandIndex === 0) {
    endRoundOrNextHand();
  } else {
    endRound();
  }
}

// スプリット時の複数手処理
function endRoundOrNextHand() {
  // 手札が2つあり、まだ1手目が終わっていない場合
  if (playerHands.length === 2 && currentHandIndex === 0) {
    currentHandIndex = 1;
    playerHand = playerHands[currentHandIndex];
    renderHands(playerHand, dealerHand, true);
    renderMessage(`次のハンド（ハンド${currentHandIndex + 1}）をプレイ中`);
  } else {
    endRound();
  }
}

// ラウンド終了処理

function endRound() {
  renderChips(chips);
  localStorage.setItem('chips', chips);
  state = 'RESULT';
  if (chips <= 0) renderMessage('Game Over');

  playerHands = [];
  currentHandIndex = 0;

// ボタン更新を呼び出し（Restart判定含む）
updateButtons(state, playerHand, chips, bet);

// Restartボタンを確実に有効化
const restartBtn = document.getElementById('restart-btn');
if (restartBtn) restartBtn.disabled = false;
}

// ブラックジャック判定（最初の2枚がA＋10点札）

function isBlackjack(hand) {
  if (hand.length !== 2) return false;
  const vals = hand.map(c => c.value);
  return vals.includes('A') && ['10', 'J', 'Q', 'K'].some(v => vals.includes(v));
}

// リスタート処理

export function restartGame() {
  chips = 100;
  bet = 0;
  state = 'INIT';
  playerHand = [];
  dealerHand = [];
  playerHands = [];
  currentHandIndex = 0;

  localStorage.setItem('chips', chips);
  renderHands([], [], false);
  renderChips(chips);
  renderCurrentBet(bet);
  renderMessage('ベットを選択してください');
  updateButtons(state, playerHand, chips, bet);
}
