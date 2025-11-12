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
let splitResults = []; // スプリット各手の勝敗結果を記録

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

  renderMessage(`
    カードが配られました！<br>
    どの行動をするか選びましょう。<br><br>
    <b>Hit：</b> もう1枚カードを引く<br>
    <b>Stand：</b> 現在の手札で勝負する<br>
    <b>Double Down：</b> ベットを倍にして1枚だけ引く（最初の2枚のときのみ）<br>
    <b>Split：</b> 同じ点数のカードなら2手に分けてプレイ（例：10とKなど）
  `);

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

export async function hitCard() {
  if (state !== 'PLAYER_TURN') return;

  // 一時的にボタン無効化（連打防止）
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const doubleBtn = document.getElementById('double-btn');
  const splitBtn = document.getElementById('split-btn');
  [hitBtn, standBtn, doubleBtn, splitBtn].forEach(btn => {
    if (btn) btn.disabled = true;
  });

  // メッセージ①：「カードを引きます...」
  renderMessage('カードを引きます...');
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機演出

  // 実際にカードを引く
  playerHand.push(deck.pop());
  renderHands(playerHand, dealerHand, true, playerHands);

  // 合計値チェック
  if (calcHandValue(playerHand) > 21) {
    renderMessage('バースト！あなたの負けです');

    // スプリット中の場合
    if (playerHands.length === 2) {
      // 1手目なら次のハンドへ
      if (currentHandIndex === 0) {
        splitResults.push('バースト！あなたの負けです');
        setTimeout(() => endRoundOrNextHand(), 1000);
      } else {
        // 2手目なら結果追加 → まとめ表示
        splitResults.push('バースト！あなたの負けです');
        setTimeout(() => {
          renderSplitSummary();
          endRound();
        }, 1000);
      }
    } else {
      // 通常プレイ
      setTimeout(() => endRound(), 1000);
    }
    return; // ⚠️ ここで終了（再活性化しない）
  }

  // バーストしてなければ再度ボタン活性化
  updateButtons(state, playerHand, chips, bet);
  renderMessage('次の行動を選びましょう。');
}

// プレイヤー操作：Stand

export async function standGame() {          // async化
  if (state !== 'PLAYER_TURN') return;

  state = 'DEALER_TURN';
  renderMessage('ディーラーのターン...');
  
  // 新しいディーラー演出処理を呼び出し
  await dealerTurn();                        // whileループの代わりに関数化

  updateButtons(state, playerHand, chips, bet);
}

// ディーラーのターン：1秒後に伏せカードをめくり、その後1枚ずつ引く演出
async function dealerTurn() {
  // ① スタンド直後の1秒間 “間” を演出
  await new Promise(resolve => setTimeout(resolve, 1000));

  // ② ディーラーが伏せカードをめくる
  renderHands(playerHand, dealerHand, false);
  renderMessage('ディーラーが伏せカードをめくりました');
  await new Promise(resolve => setTimeout(resolve, 1000)); // さらに1秒演出待機

  // ③ ディーラーが17以上になるまで1枚ずつ引く
  while (calcHandValue(dealerHand) < 17) {
    dealerHand.push(deck.pop());
    renderHands(playerHand, dealerHand, false);
    renderMessage('ディーラーがカードを引きました...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 各ドローごとに1秒待機
  }

  // ④ ターン終了＆勝敗判定
  renderMessage('ディーラーのターン終了');
  const p = calcHandValue(playerHand);
  const d = calcHandValue(dealerHand);
  judgeResult(p, d);
}

// ダブルダウン処理（演出＋バースト即終了対応）
export async function doubleDown() {
  if (state !== 'PLAYER_TURN') return;
  if (playerHand.length !== 2)
    return renderMessage('ダブルダウンは最初の2枚のときのみ実行できます');
  if (chips < bet)
    return renderMessage('チップが足りません');

  // ベットを2倍にして支払い
  chips -= bet;
  bet *= 2;
  renderChips(chips);
  renderCurrentBet(bet);

  // ボタン無効化
  updateButtons('DEALER_TURN', playerHand, chips, bet);

  // メッセージ①
  renderMessage('ダブルダウン！1枚引いてスタンドします...');
  await new Promise(resolve => setTimeout(resolve, 1200));

  // メッセージ②：カードを引く演出
  renderMessage('カードを引きました...');
  await new Promise(resolve => setTimeout(resolve, 800));

  // 実際にカードを配る
  playerHand.push(deck.pop());
  renderHands(playerHand, dealerHand, true);

  // バーストチェック（ここを新規追加！）
  if (calcHandValue(playerHand) > 21) {
    renderMessage('バースト！あなたの負けです');
    await new Promise(resolve => setTimeout(resolve, 1000));
    endRound();
    return; // ← 即終了（ディーラーターンへ進まない）
  }

  // 少し見せてからスタンドへ
  await new Promise(resolve => setTimeout(resolve, 1000));
  await standGame();
}

// スプリット処理
export function splitHand() {
  if (state !== 'PLAYER_TURN') return;
  if (playerHand.length !== 2)
    return renderMessage('スプリットは最初の2枚のときのみ実行できます');

  // 🎯 スプリット可能判定（絵札はすべて10点扱い）
  const getCardNumericValue = (card) => {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
  };

  const v1 = getCardNumericValue(playerHand[0]);
  const v2 = getCardNumericValue(playerHand[1]);

  if (v1 !== v2)
    return renderMessage('スプリットできるのは同じ点数（10や絵札同士など）のカードのみです');

  if (chips < bet)
    return renderMessage('チップが足りません');

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
  renderHands(playerHand, dealerHand, true, playerHands);
  renderMessage(`スプリット！手札${currentHandIndex + 1}をプレイ中`);
}

// 勝敗判定
function judgeResult(p, d) {
  let msg = '';

  if (p > 21) msg = 'バースト！あなたの負けです';
  else if (d > 21) { msg = 'ディーラーがバースト！あなたの勝ちです'; chips += bet * 2; }
  else if (p > d) { msg = 'あなたの勝ちです'; chips += bet * 2; }
  else if (p < d) msg = 'あなたの負けです';
  else { msg = '引き分けです'; chips += bet; }

  renderMessage(msg);

  // スプリット用修正ポイント
  // 勝敗メッセージを即時表示せず、集計のみ
  if (playerHands.length === 2) {
    splitResults.push(msg);

    if (currentHandIndex === 0) {
      // 1手目終了 → 次のハンドへ
      renderMessage(`手札${currentHandIndex + 1}の結果を記録しました。次のハンドへ...`);
      setTimeout(() => endRoundOrNextHand(), 800);
    } else {
      // 2手目終了 → まとめて表示
      renderSplitSummary();
      endRound();
    }
  } else {
    // 通常プレイのみ即時表示
    renderMessage(msg);
    endRound();
  }
}

// スプリット時の複数手処理
function endRoundOrNextHand() {
  // 手札が2つあり、まだ1手目が終わっていない場合
  if (playerHands.length === 2 && currentHandIndex === 0) {
    currentHandIndex = 1;
    playerHand = playerHands[currentHandIndex];

    // スプリット用：両方の手を表示
    renderHands(playerHand, dealerHand, true, playerHands);

    // メッセージを明確に
    renderMessage(`次のハンド（ハンド${currentHandIndex + 1}）をプレイ中`);

    // ✅ ボタンを再度有効化！
    state = 'PLAYER_TURN';
    updateButtons(state, playerHand, chips, bet);

  } else {
    endRound();
  }
}

// ラウンド終了処理

function endRound() {
  // チップ情報の更新と保存
  renderChips(chips);
  localStorage.setItem('chips', chips);
  state = 'RESULT';

  // スプリット関連の初期化
  playerHands = [];
  currentHandIndex = 0;

  // ベットをリセット
  bet = 0;
  renderCurrentBet(bet);

  // ボタン状態を更新（Restart判定含む）
  updateButtons(state, playerHand, chips, bet);

  // 既存の「次のラウンドへ」ボタンがあれば削除
  const existingNext = document.getElementById('next-round-btn');
  if (existingNext) existingNext.remove();

  // Game Over の場合は専用演出を追加
  if (chips <= 0) {
    renderMessage('あなたのチップは尽きました...');
    
    // 1秒後にGame Overメッセージ → さらに1秒後に再挑戦ボタン
    setTimeout(() => {
      renderMessage('Game Over');

      const retryBtn = document.createElement('button');
      retryBtn.id = 'retry-btn';
      retryBtn.textContent = 'もう一度プレイする';
      retryBtn.classList.add('next-round-btn');

      const msgArea = document.getElementById('message');
      if (msgArea) msgArea.insertAdjacentElement('afterend', retryBtn);

      retryBtn.addEventListener('click', () => {
        chips = 100;
        bet = 0;
        playerHand = [];
        dealerHand = [];
        renderChips(chips);
        renderHands([], [], false);
        renderMessage('ベットを選択してください');
        updateButtons('INIT', [], chips, 0);
        retryBtn.remove();
        state = 'INIT';
      });
    }, 1000);

    return; // Game Over 専用演出なのでここで終了
  }

  // 通常の「次のラウンドへ」処理
  const nextButton = document.createElement('button');
  nextButton.id = 'next-round-btn';
  nextButton.textContent = '▶ 次のラウンドへ';
  nextButton.classList.add('next-round-btn');

  const msgArea = document.getElementById('message');
  if (msgArea) msgArea.insertAdjacentElement('afterend', nextButton);

  nextButton.addEventListener('click', () => {
    renderHands([], [], false);              // 手札をクリア
    renderMessage('ベットを選択してください'); // 案内メッセージ再表示
    updateButtons('INIT', [], chips, 0);     // ボタン初期化
    state = 'INIT';
    nextButton.remove();
  });
}

// スプリット結果まとめ表示
function renderSplitSummary() {
  const wins = splitResults.filter(r => r.includes('勝ち')).length;
  const loses = splitResults.filter(r => r.includes('負け')).length;
  const draws = splitResults.filter(r => r.includes('引き分け')).length;

  let totalMsg = '';
  if (wins > loses) totalMsg = 'あなたの勝ち！';
  else if (loses > wins) totalMsg = 'あなたの負け...';
  else totalMsg = '引き分けです。';

  renderMessage(`
    <b>スプリット結果</b><br>
    Hand1：${splitResults[0]}<br>
    Hand2：${splitResults[1]}<br>
    <hr>
    🪄 ${totalMsg}
  `);

  splitResults = []; // 初期化
}

// 次ラウンド開始処理
export function nextRound() {
  state = 'INIT';
  playerHand = [];
  dealerHand = [];
  playerHands = [];
  splitResults = [];
  currentHandIndex = 0;
  bet = 0;

  renderHands([], [], false);
  renderCurrentBet(bet);
  renderMessage('ベットを選択してください');
  updateButtons(state, playerHand, chips, bet);

  // ボタン無効化
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.disabled = true;
}

// ブラックジャック判定（最初の2枚がA＋10点札）

function isBlackjack(hand) {
  if (hand.length !== 2) return false;
  const vals = hand.map(c => c.value);
  return vals.includes('A') && ['10', 'J', 'Q', 'K'].some(v => vals.includes(v));
}
