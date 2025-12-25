import { bindScene } from '../phaserRenderer.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.cardObjects = [];
  }

  create() {
    bindScene(this);

    this.add.text(20, 20, 'BLACKJACK', { fontSize: '28px' });

    this.playerLabel = this.add.text(450, 260, 'PLAYER', { fontSize: '18px' });
    this.dealerLabel = this.add.text(600, 80, 'DEALER', { fontSize: '18px' });
  }

  clearHands() {
    this.cardObjects.forEach(o => o.destroy());
    this.cardObjects = [];
  }

  drawCard(card, x, y, active = false) {
    const rect = this.add.rectangle(
      x, y, 50, 70,
      active ? 0x88ff88 : 0xffffff
    ).setStrokeStyle(2, 0x000000);

    const text = this.add.text(
      x - 15, y - 10,
      `${card.value}${card.suit}`,
      { fontSize: '16px', color: '#000' }
    );

    this.cardObjects.push(rect, text);
  }

  drawHiddenCard(x, y) {
    const rect = this.add.rectangle(x, y, 50, 70, 0x444444);
    const text = this.add.text(x - 8, y - 10, '🂠', { fontSize: '20px' });

    this.cardObjects.push(rect, text);
  }
}
