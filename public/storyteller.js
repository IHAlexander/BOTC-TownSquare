(function () {
  'use strict';

  let state = null;
  let ws = null;
  let sortable = null;
  let languages = [];
  let currentLang = null;
  let markedSeatName = '';

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
        languages = msg.languages || [];
        I18N.setMessages(msg.messages);
        if (msg.state.language !== currentLang) {
          currentLang = msg.state.language;
          document.documentElement.lang = currentLang;
          document.title = I18N.t('app.stTitle');
          I18N.applyStatic();
        }
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

  // ── Nomination bar refs ────────────────────────────────────
  const nomBar        = document.getElementById('nomination-bar');
  const nomControls   = document.getElementById('nom-controls');
  const nomNominator  = document.getElementById('nom-nominator');
  const nomNominee    = document.getElementById('nom-nominee');
  const nomSubmitBtn  = document.getElementById('nom-submit-btn');
  const nomVoteRow    = document.getElementById('nom-vote-row');
  const nomVotesInput = document.getElementById('nom-votes-input');
  const nomVotesBtn   = document.getElementById('nom-votes-btn');
  const nomCancelBtn  = document.getElementById('nom-cancel-btn');
  const nomExecuteRow = document.getElementById('nom-execute-row');
  const nomExecuteName = document.getElementById('nom-execute-name');
  const nomExecuteBtn = document.getElementById('nom-execute-btn');
  const nomLogList    = document.getElementById('nom-log-list');
  const langSelect    = document.getElementById('lang-select');

  undoBtn.addEventListener('click', () => send({ type: 'UNDO' }));

  langSelect.addEventListener('change', () => {
    send({ type: 'SET_LANGUAGE', language: langSelect.value });
  });

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

  const resetModal = document.getElementById('reset-modal');

  document.getElementById('reset-btn').addEventListener('click', () => {
    resetModal.classList.remove('hidden');
  });

  document.getElementById('reset-keep-btn').addEventListener('click', () => {
    resetModal.classList.add('hidden');
    send({ type: 'SOFT_RESET' });
  });

  document.getElementById('reset-full-btn').addEventListener('click', () => {
    resetModal.classList.add('hidden');
    send({ type: 'RESET' });
  });

  // ── Nomination bar events ──────────────────────────────────
  nomSubmitBtn.addEventListener('click', () => {
    const nominatorIdx = parseInt(nomNominator.value);
    const nomineeIdx   = parseInt(nomNominee.value);
    if (isNaN(nominatorIdx) || isNaN(nomineeIdx)) return;
    send({ type: 'NOMINATE', nominatorIdx, nomineeIdx });
  });

  nomVotesBtn.addEventListener('click', () => {
    send({ type: 'SUBMIT_VOTES', votes: parseInt(nomVotesInput.value) || 0 });
  });

  nomCancelBtn.addEventListener('click', () => {
    send({ type: 'CANCEL_NOMINATION' });
  });

  nomExecuteBtn.addEventListener('click', () => {
    const name = markedSeatName || I18N.t('confirm.thisPlayer');
    if (confirm(I18N.t('confirm.execute', { name }))) send({ type: 'EXECUTE_MARKED' });
  });

  // ── Player list render ─────────────────────────────────────
  const playerList = document.getElementById('player-list');

  function stateLabel(s) {
    if (s === 'alive') return I18N.t('state.aliveShort');
    if (s === 'dead_vote') return I18N.t('state.deadVoteShort');
    return I18N.t('state.deadNoVoteShort');
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
          <span class="nom-indicator"></span>
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
            <span class="show-votes-label">Show on TV</span>
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
        const name = el.querySelector('.seat-name-input').value.trim() || I18N.t('confirm.thisPlayer');
        if (confirm(I18N.t('confirm.execute', { name }))) send({ type: 'EXECUTE_PLAYER' });
      });

      playerList.appendChild(el);
    }

    // Update values
    el.dataset.index = i;
    el.dataset.state = seat.state;

    const nameInput = el.querySelector('.seat-name-input');
    nameInput.placeholder = I18N.t('input.seatPlaceholder');
    if (document.activeElement !== nameInput) {
      nameInput.value = seat.name;
      nameInput.classList.toggle('empty', !seat.name);
    }

    const stateBtn = el.querySelector('.state-btn');
    stateBtn.textContent = stateLabel(seat.state);
    stateBtn.className = `state-btn ${seat.state}`;
    stateBtn.disabled = isEmpty;

    const blockBtn = el.querySelector('.block-btn');
    blockBtn.title = I18N.t('button.putOnBlock');
    blockBtn.classList.toggle('active', seat.onBlock);
    blockBtn.disabled = isEmpty;

    const clearBtn = el.querySelector('.clear-btn');
    clearBtn.title = I18N.t('button.clearSeat');
    clearBtn.style.visibility = seat.name ? 'visible' : 'hidden';

    const panel = el.querySelector('.block-panel');
    panel.classList.toggle('visible', seat.onBlock);

    el.querySelector('.vote-count').textContent = seat.blockVotes || 0;
    el.querySelector('.show-votes-cb').checked = gs.showVotesOnTV;
    el.querySelector('.show-votes-label').textContent = I18N.t('block.showOnTV');
    el.querySelector('.execute-btn').textContent = I18N.t('button.execute');

    // Nomination indicator dot
    const indicator = el.querySelector('.nom-indicator');
    indicator.className = 'nom-indicator' +
      (seat.isCurrentNominator ? ' nominator' : '') +
      (seat.isCurrentNominee   ? ' nominee'   : '') +
      (seat.markedForExecution && !seat.isCurrentNominee ? ' marked' : '');
  }

  function renderNominationBar(gs) {
    const isDay = gs.phase === 'day';
    nomBar.classList.toggle('night-disabled', !isDay);

    // Populate nominator select (alive, named, not yet nominated)
    const prevNominatorVal = nomNominator.value;
    nomNominator.innerHTML = `<option value="">${I18N.t('nomination.nominator')}</option>`;
    gs.seats.forEach((seat, i) => {
      if (seat.name && seat.state === 'alive' && !seat.hasNominated) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = seat.name;
        if (String(i) === prevNominatorVal) opt.selected = true;
        nomNominator.appendChild(opt);
      }
    });

    // Populate nominee select (named, not yet nominated)
    const prevNomineeVal = nomNominee.value;
    nomNominee.innerHTML = `<option value="">${I18N.t('nomination.nominee')}</option>`;
    gs.seats.forEach((seat, i) => {
      if (seat.name && !seat.hasBeenNominated) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = seat.name;
        if (String(i) === prevNomineeVal) opt.selected = true;
        nomNominee.appendChild(opt);
      }
    });

    // Toggle controls vs vote row
    nomControls.classList.toggle('hidden', gs.nominationInProgress);
    nomVoteRow.classList.toggle('hidden', !gs.nominationInProgress);

    // Execute row
    const markedSeat = gs.seats.find(s => s.markedForExecution && s.name);
    nomExecuteRow.classList.toggle('hidden', !markedSeat);
    if (markedSeat) {
      markedSeatName = markedSeat.name;
      nomExecuteName.textContent = I18N.t('nomination.marked', { name: markedSeat.name });
    } else {
      markedSeatName = '';
    }
  }

  function renderLanguageSelect() {
    if (!languages.length) return;
    langSelect.setAttribute('aria-label', I18N.t('label.language'));
    if (langSelect.options.length !== languages.length) {
      langSelect.innerHTML = '';
      languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.label;
        langSelect.appendChild(opt);
      });
    }
    langSelect.value = state.language;
  }

  function render() {
    if (!state) return;
    const gs = state;

    // Header
    phaseIndicator.textContent = I18N.t(gs.phase === 'day' ? 'phase.day' : 'phase.night', { n: gs.dayNumber });
    phaseIndicator.className = gs.phase;
    renderLanguageSelect();

    // Undo button: enable if we have a previous state (server tracks it; we show enabled after any action)
    // We approximate: always enabled unless told otherwise
    undoBtn.disabled = false;

    // Title
    if (document.activeElement !== titleInput) {
      titleInput.value = gs.title || '';
    }

    // Phase button
    if (gs.phase === 'day') {
      phaseBtn.textContent = I18N.t('button.beginNight');
      phaseBtn.className = 'to-night';
    } else {
      phaseBtn.textContent = I18N.t('button.beginDay');
      phaseBtn.className = 'to-day';
    }

    // Seat count
    scValue.textContent = gs.seatCount;

    // Majority
    const alive = gs.seats.filter(s => s.name && s.state === 'alive').length;
    const needed = alive > 0 ? Math.ceil(alive / 2) : 0;
    majorityInfo.textContent = I18N.t('header.majority', { alive, needed });

    // Nomination bar
    renderNominationBar(gs);

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

    // Nomination log
    nomLogList.innerHTML = '';
    (gs.nominationLog || []).slice().reverse().forEach(entry => {
      const li = document.createElement('li');
      li.textContent = `[${entry.time}] ${entry.text}`;
      nomLogList.appendChild(li);
    });
  }
})();
