// ui/renderer.js
import * as DomRenderer from './dom/domRenderer.js';
import * as PhaserRenderer from './phaser/phaserRenderer.js';

let currentRenderer = DomRenderer;

export function setRenderer(type = 'dom') {
  currentRenderer = type === 'phaser'
    ? PhaserRenderer
    : DomRenderer;
}

export const renderHands = (...args) =>
  currentRenderer.renderHands?.(...args);

export const renderGameDetail = (detail) =>
  currentRenderer.renderGameDetail?.(detail);

// Game Over 演出（レンダラー側に委譲）
export const showGameOver = () =>
  currentRenderer.showGameOver?.();
