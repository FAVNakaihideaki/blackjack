// js/ui/phaser/scenes/GameScene.js
import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.esm.js';
import { bindScene } from '../phaserRenderer.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.cardObjects = [];
    this.centerX = 0;

    this.dealerTotalText = null;
    this.playerTotalText = null;
  }

  create() {
    bindScene(this);

    this.centerX = this.cameras.main.width / 2;

    // タイトル
    this.add.text(this.centerX, 16, 'BLACKJACK', {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(1000);

    // DEALER / PLAYER ラベル
    this.dealerLabel = this.add.text(this.centerX, 55, 'DEALER', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(1000);

    this.playerLabel = this.add.text(this.centerX, 215, 'PLAYER', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(1000);

    // 合計値（カードより前面に出す）
    this.dealerTotalText = this.add.text(this.centerX, 75, '', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(1000);

    this.playerTotalText = this.add.text(this.centerX, 235, '', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(1000);
  }

  clearHands() {
    this.cardObjects.forEach(o => o.destroy());
    this.cardObjects = [];
  }

  drawCard(card, x, y, active = false) {
    const rect = this.add.rectangle(
      x,
      y,
      50,
      70,
      active ? 0x88ff88 : 0xffffff
    ).setStrokeStyle(2, 0x000000);

    const text = this.add.text(
      x,
      y,
      `${card.value}${card.suit}`,
      { fontSize: '16px', color: '#000' }
    ).setOrigin(0.5);

    this.cardObjects.push(rect, text);
  }

  drawHiddenCard(x, y) {
    const rect = this.add.rectangle(x, y, 50, 70, 0x444444);
    const text = this.add.text(x, y, '🂠', {
      fontSize: '20px',
    }).setOrigin(0.5);

    this.cardObjects.push(rect, text);
  }
}
