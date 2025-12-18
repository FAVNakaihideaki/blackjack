// ui/dom/domRenderer.js
import { calcHandValue } from '../../core/deck.js';
import { GameState } from '../../core/gameState.js';

export function renderHands(playerHand, dealerHand, hideDealerSecond = false, allPlayerHands = null) {
  const playerArea = document.getElementById('player-cards');
  const dealerArea = document.getElementById('dealer-cards');
  const playerTotalEl = document.getElementById('player-total');
  const dealerTotalEl = document.getElementById('dealer-total');

  if (!playerArea || !dealerArea) return;

  playerArea.innerHTML = '';
  dealerArea.innerHTML = '';

  if (allPlayerHands && allPlayerHands.length === 2) {
    allPlayerHands.forEach((hand, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'hand-wrapper';

      const label = document.createElement('div');
      const isCurrent = index === GameState.currentHandIndex;
      const total = calcHandValue(hand);

      label.textContent = isCurrent
        ? `▶ Hand ${index + 1}（合計: ${total}）`
        : `Hand ${index + 1}（合計: ${total}）`;

      label.className = 'hand-label';
      if (isCurrent) label.classList.add('active-hand-label');
      wrapper.appendChild(label);

      const handContainer = document.createElement('div');
      handContainer.className = 'hand';

      hand.forEach(card => {
        handContainer.appendChild(createCardEl(card));
      });

      wrapper.appendChild(handContainer);
      playerArea.appendChild(wrapper);
    });

    if (playerTotalEl) {
      const current = allPlayerHands[GameState.currentHandIndex];
      playerTotalEl.textContent = calcHandValue(current);
    }
  } else {
    playerHand.forEach(card => {
      playerArea.appendChild(createCardEl(card));
    });
    if (playerTotalEl) {
      playerTotalEl.textContent = playerHand.length ? calcHandValue(playerHand) : 0;
    }
  }

  dealerHand.forEach((card, index) => {
    if (hideDealerSecond && index === 1) {
      const hidden = document.createElement('div');
      hidden.className = 'card back';
      hidden.textContent = '🂠';
      dealerArea.appendChild(hidden);
      return;
    }
    dealerArea.appendChild(createCardEl(card));
  });

  if (dealerTotalEl) {
    if (hideDealerSecond) {
      dealerTotalEl.textContent = dealerHand.length > 0 ? '?' : 0;
    } else {
      dealerTotalEl.textContent = dealerHand.length
        ? calcHandValue(dealerHand)
        : 0;
    }
  }
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';

  const isRed = card.suit === '♥' || card.suit === '♦';
  if (isRed) el.classList.add('red');

  el.innerHTML = `
    <div class="card-value">${card.value}</div>
    <div class="card-suit">${card.suit}</div>
  `;

  return el;
}

export function renderGameDetail(detail) {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;

  const {
    result,
    bet,
    payout,
    is_blackjack,
    is_double,
    is_split,
    played_at
  } = detail;

  const flags = [
    is_blackjack ? 'BLACKJACK' : null,
    is_double ? 'DOUBLE' : null,
    is_split ? 'SPLIT' : null,
  ].filter(Boolean).join(' / ');

  messageEl.innerHTML = `
    <b>🃏 対局詳細</b><br><br>
    結果：<b>${result}</b><br>
    Bet：${bet}<br>
    Diff：${payout}<br>
    ${flags ? `特記事項：${flags}<br>` : ''}
    日時：${played_at
      ? new Date(played_at).toLocaleString()
      : '-'}
  `;
}
