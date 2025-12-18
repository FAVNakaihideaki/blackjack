// ui/renderer.js
import * as DomRenderer from './dom/domRenderer.js';
// import * as PhaserRenderer from './phaser/phaserRenderer.js'; // 後で追加

let currentRenderer = DomRenderer;

export function setRenderer(type = 'dom') {
  // 今はDOMのみ。将来 phaserRenderer に切替可能
  currentRenderer = DomRenderer;
}

export const renderHands = (...args) =>
  currentRenderer.renderHands?.(...args);

export const renderGameDetail = (detail) =>
  currentRenderer.renderGameDetail?.(detail);