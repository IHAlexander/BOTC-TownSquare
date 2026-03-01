(function () {
  'use strict';

  let state = null;

  // ── WebSocket ──────────────────────────────────────────────
  function connect() {
    const ws = new WebSocket(`ws://${location.host}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'display' }));
    };

    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'STATE') {
        const prevPhase = state ? state.state.phase : null;
        state = msg;
        render(prevPhase);
      }
    };

    ws.onclose = () => setTimeout(connect, 2000);
  }

  connect();

  // ── Fullscreen ─────────────────────────────────────────────
  const fsBtn = document.getElementById('fullscreen-btn');
  fsBtn.addEventListener('click', () => {
    document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.classList.toggle('hidden', !!document.fullscreenElement);
  });

  // ── Render ─────────────────────────────────────────────────
  function render(prevPhase) {
    const { state: gs, stConnected, qrCode } = state;

    // Phase / body class
    document.body.classList.toggle('night', gs.phase === 'night');

    // Header
    document.getElementById('session-title').textContent = gs.title || '';
    document.getElementById('phase-banner').textContent =
      `${gs.phase === 'day' ? 'Day' : 'Night'} ${gs.dayNumber}`;

    // On-the-block strip
    const blockSeat = gs.seats.find(s => s.onBlock);
    const strip = document.getElementById('block-strip');
    const container = document.getElementById('circle-container');

    if (blockSeat) {
      strip.classList.remove('hidden');
      container.classList.add('has-strip');

      const alive = gs.seats.filter(s => s.name && s.state === 'alive').length;
      const needed = Math.ceil(alive / 2);

      document.getElementById('block-name').textContent =
        `${blockSeat.name} is on the block`;

      let voteText = `${needed} vote${needed !== 1 ? 's' : ''} needed for majority`;
      if (gs.showVotesOnTV) {
        voteText = `${blockSeat.blockVotes} vote${blockSeat.blockVotes !== 1 ? 's' : ''} so far  ·  ${voteText}`;
      }
      document.getElementById('block-votes-info').textContent = voteText;
    } else {
      strip.classList.add('hidden');
      container.classList.remove('has-strip');
    }

    // QR code
    const qrOverlay = document.getElementById('qr-overlay');
    if (stConnected) {
      qrOverlay.classList.add('hidden');
    } else {
      qrOverlay.classList.remove('hidden');
      const img = document.getElementById('qr-img');
      if (qrCode && img.src !== qrCode) img.src = qrCode;
    }

    // Circle
    renderCircle(gs);
  }

  // ── Circle layout ──────────────────────────────────────────
  function tokenSize(seatCount) {
    if (seatCount <= 7) return 110;
    if (seatCount <= 10) return 96;
    if (seatCount <= 13) return 82;
    if (seatCount <= 16) return 70;
    return 58;
  }

  function renderCircle(gs) {
    const container = document.getElementById('circle');
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    const n = gs.seatCount;
    const sz = tokenSize(n);
    const margin = sz * 0.65;
    const rx = W / 2 - margin;
    const ry = H / 2 - margin;
    const cx = W / 2;
    const cy = H / 2;

    // Keyed update: reuse existing .token elements by seat index
    const existing = Array.from(container.querySelectorAll('.token'));
    const byIndex = {};
    existing.forEach(el => { byIndex[el.dataset.index] = el; });

    const newKeys = new Set(gs.seats.map((_, i) => String(i)));

    // Remove tokens beyond seatCount
    existing.forEach(el => {
      if (!newKeys.has(el.dataset.index)) el.remove();
    });

    gs.seats.forEach((seat, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);

      let el = byIndex[String(i)];
      if (!el) {
        el = document.createElement('div');
        el.className = 'token';
        el.dataset.index = i;
        el.innerHTML = `
          <div class="token-circle">
            <span class="vote-badge"></span>
          </div>
          <div class="token-name"></div>`;
        container.appendChild(el);
      }

      // Position
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      // Size
      const circle = el.querySelector('.token-circle');
      circle.style.width = `${sz}px`;
      circle.style.height = `${sz}px`;

      const badge = el.querySelector('.vote-badge');
      const nameEl = el.querySelector('.token-name');

      // State classes
      const isEmpty = !seat.name;
      el.className = 'token ' + (isEmpty ? 'empty' : seat.state) + (seat.onBlock ? ' on-block' : '');

      nameEl.textContent = seat.name || 'Empty';
      nameEl.style.maxWidth = `${sz + 20}px`;

      // Badge size
      const badgePx = Math.round(sz * 0.28);
      badge.style.width = `${badgePx}px`;
      badge.style.height = `${badgePx}px`;
      badge.style.fontSize = `${Math.round(badgePx * 0.55)}px`;

      // Show badge only for dead_vote (unspent ghost vote)
      badge.style.display = seat.state === 'dead_vote' && !isEmpty
        ? 'flex' : 'none';
    });
  }

  // Recompute positions on resize
  window.addEventListener('resize', () => { if (state) render(null); });
})();
