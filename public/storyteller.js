(function () {
  'use strict';

  let state = null;
  let ws = null;
  let sortable = null;

  // ── WebSocket ──────────────────────────────────────────────
  function connect() {
    ws = new WebSocket(`ws://${location.host}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'storyteller' }));
    };

    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'STATE') {
        state = msg.state;
        render();
      }
    };

    ws.onclose = () => setTimeout(connect, 2000);
  }

  function send(action) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
    }
  }

  connect();

  // ── Header / controls ──────────────────────────────────────
  const phaseIndicator = document.getElementById('phase-indicator');
  const undoBtn = document.getElementById('undo-btn');
  const titleInput = document.getElementById('title-input');
  const phaseBtn = document.getElementById('phase-btn');
  const scValue = document.getElementById('sc-value');
  const majorityInfo = document.getElementById('majority-info');

  undoBtn.addEventListener('click', () => send({ type: 'UNDO' }));

  titleInput.addEventListener('change', () => {
    send({ type: 'SET_TITLE', title: titleInput.value });
  });

  phaseBtn.addEventListener('click', () => {
    if (!state) return;
    send({ type: 'SET_PHASE', phase: state.phase === 'day' ? 'night' : 'day' });
  });

  document.getElementById('sc-dec').addEventListener('click', () => {
    if (!state) return;
    send({ type: 'SET_SEAT_COUNT', count: Math.max(5, state.seatCount - 1) });
  });

  document.getElementById('sc-inc').addEventListener('click', () => {
    if (!state) return;
    send({ type: 'SET_SEAT_COUNT', count: Math.min(20, state.seatCount + 1) });
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Reset the game? This will clear all players and start fresh.')) {
      send({ type: 'RESET' });
    }
  });

  // ── Player list render ─────────────────────────────────────
  const playerList = document.getElementById('player-list');

  function stateLabel(s) {
    return s === 'alive' ? 'ALV' : s === 'dead_vote' ? 'D+V' : 'DED';
  }

  function nextState(s) {
    return s === 'alive' ? 'dead_vote' : s === 'dead_vote' ? 'dead_no_vote' : 'alive';
  }

  function renderRow(seat, i, gs) {
    const isEmpty = !seat.name;

    let el = playerList.querySelector(`[data-index="${i}"]`);
    if (!el) {
      el = document.createElement('li');
      el.className = 'player-row';
      el.dataset.index = i;
      el.innerHTML = `
        <div class="row-main">
          <span class="drag-handle">⠿</span>
          <input class="seat-name-input" type="text" maxlength="30"
            placeholder="Empty seat…" autocomplete="off" spellcheck="false">
          <button class="state-btn"></button>
          <button class="block-btn" title="Put on block">👑</button>
          <button class="clear-btn" title="Clear seat">×</button>
        </div>
        <div class="block-panel">
          <div class="vote-ctrl">
            <button class="vote-btn vote-dec">−</button>
            <span class="vote-count">0</span>
            <button class="vote-btn vote-inc">+</button>
          </div>
          <label class="show-votes-toggle">
            <input type="checkbox" class="show-votes-cb">
            Show on TV
          </label>
          <button class="execute-btn">Execute</button>
        </div>`;

      const nameInput = el.querySelector('.seat-name-input');
      const stateBtn = el.querySelector('.state-btn');
      const blockBtn = el.querySelector('.block-btn');
      const clearBtn = el.querySelector('.clear-btn');
      const voteDecBtn = el.querySelector('.vote-dec');
      const voteIncBtn = el.querySelector('.vote-inc');
      const showVotesCb = el.querySelector('.show-votes-cb');
      const executeBtn = el.querySelector('.execute-btn');

      nameInput.addEventListener('change', () => {
        send({ type: 'SET_SEAT_NAME', index: parseInt(el.dataset.index), name: nameInput.value.trim() });
      });

      nameInput.addEventListener('input', () => {
        nameInput.classList.toggle('empty', !nameInput.value.trim());
      });

      stateBtn.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const cur = el.dataset.state;
        if (cur) send({ type: 'SET_SEAT_STATE', index: idx, state: nextState(cur) });
      });

      blockBtn.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const isActive = blockBtn.classList.contains('active');
        send({ type: 'SET_ON_BLOCK', index: isActive ? -1 : idx });
      });

      clearBtn.addEventListener('click', () => {
        send({ type: 'SET_SEAT_NAME', index: parseInt(el.dataset.index), name: '' });
      });

      voteDecBtn.addEventListener('click', () => {
        const cur = parseInt(el.querySelector('.vote-count').textContent) || 0;
        send({ type: 'SET_BLOCK_VOTES', votes: Math.max(0, cur - 1) });
      });

      voteIncBtn.addEventListener('click', () => {
        const cur = parseInt(el.querySelector('.vote-count').textContent) || 0;
        send({ type: 'SET_BLOCK_VOTES', votes: cur + 1 });
      });

      showVotesCb.addEventListener('change', () => {
        send({ type: 'TOGGLE_SHOW_VOTES' });
      });

      executeBtn.addEventListener('click', () => {
        const name = el.querySelector('.seat-name-input').value.trim() || 'this player';
        if (confirm(`Execute ${name}?`)) send({ type: 'EXECUTE_PLAYER' });
      });

      playerList.appendChild(el);
    }

    // Update values
    el.dataset.index = i;
    el.dataset.state = seat.state;

    const nameInput = el.querySelector('.seat-name-input');
    if (document.activeElement !== nameInput) {
      nameInput.value = seat.name;
      nameInput.classList.toggle('empty', !seat.name);
    }

    const stateBtn = el.querySelector('.state-btn');
    stateBtn.textContent = stateLabel(seat.state);
    stateBtn.className = `state-btn ${seat.state}`;
    stateBtn.disabled = isEmpty;

    const blockBtn = el.querySelector('.block-btn');
    blockBtn.classList.toggle('active', seat.onBlock);
    blockBtn.disabled = isEmpty;

    el.querySelector('.clear-btn').style.visibility = seat.name ? 'visible' : 'hidden';

    const panel = el.querySelector('.block-panel');
    panel.classList.toggle('visible', seat.onBlock);

    el.querySelector('.vote-count').textContent = seat.blockVotes || 0;
    el.querySelector('.show-votes-cb').checked = gs.showVotesOnTV;
  }

  function render() {
    if (!state) return;
    const gs = state;

    // Header
    phaseIndicator.textContent = `${gs.phase === 'day' ? 'Day' : 'Night'} ${gs.dayNumber}`;
    phaseIndicator.className = gs.phase;

    // Undo button: enable if we have a previous state (server tracks it; we show enabled after any action)
    // We approximate: always enabled unless told otherwise
    undoBtn.disabled = false;

    // Title
    if (document.activeElement !== titleInput) {
      titleInput.value = gs.title || '';
    }

    // Phase button
    if (gs.phase === 'day') {
      phaseBtn.textContent = 'Begin Night';
      phaseBtn.className = 'to-night';
    } else {
      phaseBtn.textContent = 'Begin Day';
      phaseBtn.className = 'to-day';
    }

    // Seat count
    scValue.textContent = gs.seatCount;

    // Majority
    const alive = gs.seats.filter(s => s.name && s.state === 'alive').length;
    const named = gs.seats.filter(s => s.name).length;
    const needed = alive > 0 ? Math.ceil(alive / 2) : 0;
    majorityInfo.textContent = `${alive} alive · ${needed} to execute`;

    // Reconcile player rows
    const currentRows = Array.from(playerList.querySelectorAll('.player-row'));

    // Remove excess rows
    while (currentRows.length > gs.seatCount) {
      currentRows.pop().remove();
    }

    // Render each seat
    gs.seats.forEach((seat, i) => renderRow(seat, i, gs));

    // Ensure row order matches seat order (drag may have reordered DOM)
    gs.seats.forEach((seat, i) => {
      const el = playerList.querySelector(`[data-index="${i}"]`);
      if (el && el !== playerList.children[i]) {
        playerList.insertBefore(el, playerList.children[i] || null);
      }
    });

    // Init Sortable once
    if (!sortable && typeof Sortable !== 'undefined') {
      sortable = Sortable.create(playerList, {
        handle: '.drag-handle',
        animation: 150,
        onEnd(evt) {
          if (evt.oldIndex === evt.newIndex) return;
          // Build new seats array from current DOM order using live state
          const rows = Array.from(playerList.querySelectorAll('.player-row'));
          const newSeats = rows.map(row => state.seats[parseInt(row.dataset.index)]);
          // Reassign data-index after reorder
          rows.forEach((row, i) => { row.dataset.index = i; });
          send({ type: 'REORDER_SEATS', seats: newSeats });
        },
      });
    }

    // Game log
    const logList = document.getElementById('log-list');
    logList.innerHTML = '';
    (gs.log || []).slice(0, 30).forEach(entry => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="time">${entry.time}</span>${entry.text}`;
      logList.appendChild(li);
    });
  }
})();
