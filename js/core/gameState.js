// core/gameState.js

export const GameState = {
  state: 'INIT',            // INIT / PLAYER_TURN / DEALER_TURN / RESULT / GAME_OVER
  playerHand: [],
  dealerHand: [],

  // スプリット対応
  playerHands: [],
  dealerHands: [],
  currentHandIndex: 0,
  splitResults: [],
  bets: [],
  hasSplit: false,

  // チップ管理
  chips: 0,
  bet: 0,

  // ゲスト戦績用データ
  guestStats: {
    total_games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    max_chips: 100
  },

  // リセット用
  resetHands() {
    this.playerHand = [];
    this.dealerHand = [];
    this.playerHands = [];
    this.dealerHands = [];
    this.currentHandIndex = 0;
    this.splitResults = [];
    this.bets = [];
  },

  resetForNextRound() {
    this.state = 'INIT';
    this.bet = 0;
    this.hasSplit = false;
    this.resetHands();
  }
};
