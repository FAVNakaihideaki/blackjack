// ui/phaser/scenes/GameScene.js
import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.esm.js';
import { bindScene } from '../phaserRenderer.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.cardObjects = [];
    this.centerX = 0;
  }

  create() {
    bindScene(this);

    this.centerX = this.cameras.main.width / 2;

    this.add.text(this.centerX, 16, 'BLACKJACK', {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);

    this.dealerLabel = this.add.text(this.centerX, 55, 'DEALER', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);

    this.playerLabel = this.add.text(this.centerX, 215, 'PLAYER', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1000);
  }

  clearHands() {
    this.cardObjects.forEach(o => o.destroy());
    this.cardObjects = [];
  }

  drawCard(card, x, y, active = false) {
    // ✅ 背景は常に白で統一
    const rect = this.add.rectangle(x, y, 50, 70, 0xffffff);

    // ✅ アクティブは枠線で強調（色・太さだけ変える）
    rect.setStrokeStyle(active ? 4 : 2, active ? 0x00cc66 : 0x000000);

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
      fontSize: '20px'
    }).setOrigin(0.5);

    this.cardObjects.push(rect, text);
  }
}
