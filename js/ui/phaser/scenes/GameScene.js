// ui/phaser/scenes/GameScene.js
import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.esm.js';
import { bindScene } from '../phaserRenderer.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.cardObjects = [];
    this.centerX = 0;

    // GameOver overlay
    this.gameOverOverlay = null; // container
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

    // 追加：ゲームオーバー演出の土台を生成
    this.createGameOverOverlay();
  }

  clearHands() {
    this.cardObjects.forEach(o => o.destroy());
    this.cardObjects = [];
  }

  drawCard(card, x, y) {
    // 背景：常に白
    const rect = this.add.rectangle(x, y, 50, 70, 0xffffff);

    // 枠線：常に同じ（黒・太さ2）
    rect.setStrokeStyle(2, 0x000000);

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

  createGameOverOverlay() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const bg = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.72)
      .setOrigin(0, 0);

    const title = this.add
      .text(w / 2, h / 2 - 40, 'GAME OVER', {
        fontSize: '42px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(w / 2, h / 2 + 10, 'チップが0になりました', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // 背面クリックをブロック（何もしない）
    const blocker = this.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();
    blocker.on('pointerdown', () => { });

    const makeButton = (label, y, onClick) => {
      const bw = 320;
      const bh = 46;
      const btnBg = this.add
        .rectangle(w / 2, y, bw, bh, 0xffffff, 1)
        .setStrokeStyle(2, 0x000000);
      const btnText = this.add
        .text(w / 2, y, label, {
          fontSize: '16px',
          color: '#000000',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // ボタンは背景だけをクリック対象にする
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerdown', onClick);

      return { btnBg, btnText };
    };

    // ボタン① 資金補充（戦績は継続）
    const refillY = h / 2 + 40;
    const refill = makeButton('資金補充（戦績は継続）', refillY, async () => {
      try {
        if (typeof window.refillChips === "function") {
          await window.refillChips();
        } else {
          console.error("[GameOver] window.refillChips が未定義です");
          // 念のためDOM側にフォールバック（存在するなら）
          document.getElementById("refill-chips-btn")?.click();
        }
      } finally {
        this.hideGameOverOverlay();
      }
    });

    // ボタン② 全リセット（戦績も履歴も初期化）
    const resetY = h / 2 + 98;
    const reset = makeButton('全リセット（戦績も履歴も初期化）', resetY, () => {
      if (typeof window.fullReset === "function") {
        window.fullReset();
      } else {
        console.error("[GameOver] window.fullReset が未定義です");
        document.getElementById('reset-chips-btn')?.click();
      }
      this.hideGameOverOverlay();
    });

    this.gameOverOverlay = this.add
      .container(0, 0, [
        bg,
        blocker,
        title,
        sub,
        refill.btnBg,
        refill.btnText,
        reset.btnBg,
        reset.btnText,
      ])
      .setDepth(9999)
      .setVisible(false)
      .setAlpha(0);
  }

  showGameOverOverlay() {
    if (!this.gameOverOverlay) return;

    this.gameOverOverlay.setVisible(true);
    this.gameOverOverlay.setAlpha(0);

    // 軽い揺れ + フェードイン
    this.cameras.main.shake(220, 0.008);

    this.tweens.add({
      targets: this.gameOverOverlay,
      alpha: 1,
      duration: 260,
      ease: 'Sine.easeOut',
    });
  }

  hideGameOverOverlay() {
    if (!this.gameOverOverlay) return;

    this.tweens.add({
      targets: this.gameOverOverlay,
      alpha: 0,
      duration: 180,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.gameOverOverlay.setVisible(false);
      },
    });
  }
}
