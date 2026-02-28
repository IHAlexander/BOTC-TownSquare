'use strict';

function makeSeat() {
  return { name: '', state: 'alive', onBlock: false, blockVotes: 0 };
}

function makeDefaultState() {
  return {
    title: 'Blood on the Clocktower',
    phase: 'night',
    dayNumber: 1,
    seatCount: 10,
    seats: Array.from({ length: 10 }, makeSeat),
    showVotesOnTV: false,
    log: [],
  };
}

function logEvent(gs, text) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  gs.log.unshift({ time, text });
  if (gs.log.length > 100) gs.log.length = 100;
}

// Applies msg to gs (mutated in place).
// Does NOT handle UNDO or RESET — those require reference swaps in server.js.
// Returns { changed: boolean }
function applyAction(gs, msg) {
  let changed = true;

  switch (msg.type) {
    case 'SET_TITLE':
      gs.title = String(msg.title || '').slice(0, 60);
      break;

    case 'SET_PHASE': {
      const newPhase = msg.phase === 'night' ? 'night' : 'day';
      if (gs.phase === 'day' && newPhase === 'night') {
        gs.dayNumber++;
      }
      gs.phase = newPhase;
      logEvent(gs, `${newPhase === 'day' ? 'Day' : 'Night'} ${gs.dayNumber} begins`);
      break;
    }

    case 'SET_SEAT_COUNT': {
      const count = Math.max(5, Math.min(20, parseInt(msg.count) || 10));
      const old = gs.seats;
      gs.seats = Array.from({ length: count }, (_, i) => old[i] || makeSeat());
      gs.seatCount = count;
      break;
    }

    case 'SET_SEAT_NAME': {
      const seat = gs.seats[msg.index];
      if (seat !== undefined) {
        const oldName = seat.name;
        seat.name = String(msg.name || '').slice(0, 30);
        if (seat.name && !oldName) logEvent(gs, `${seat.name} joined`);
        else if (!seat.name && oldName) logEvent(gs, `${oldName} removed`);
        else if (seat.name !== oldName && oldName) logEvent(gs, `${oldName} renamed to ${seat.name}`);
      }
      break;
    }

    case 'SET_SEAT_STATE': {
      const seat = gs.seats[msg.index];
      const valid = ['alive', 'dead_vote', 'dead_no_vote'];
      if (seat && seat.name && valid.includes(msg.state)) {
        seat.state = msg.state;
        const labels = { alive: 'alive', dead_vote: 'dead (vote remaining)', dead_no_vote: 'dead' };
        logEvent(gs, `${seat.name} is now ${labels[msg.state]}`);
      }
      break;
    }

    case 'REORDER_SEATS': {
      if (Array.isArray(msg.seats) && msg.seats.length === gs.seatCount) {
        gs.seats = msg.seats;
      }
      break;
    }

    case 'SET_ON_BLOCK': {
      const idx = parseInt(msg.index);
      gs.seats.forEach(s => { s.onBlock = false; s.blockVotes = 0; });
      gs.showVotesOnTV = false;
      if (idx >= 0 && gs.seats[idx] && gs.seats[idx].name) {
        gs.seats[idx].onBlock = true;
        logEvent(gs, `${gs.seats[idx].name} is on the block`);
      }
      break;
    }

    case 'SET_BLOCK_VOTES': {
      const seat = gs.seats.find(s => s.onBlock);
      if (seat) seat.blockVotes = Math.max(0, parseInt(msg.votes) || 0);
      break;
    }

    case 'TOGGLE_SHOW_VOTES':
      gs.showVotesOnTV = !gs.showVotesOnTV;
      break;

    case 'EXECUTE_PLAYER': {
      const seat = gs.seats.find(s => s.onBlock);
      if (seat && seat.name) {
        seat.state = 'dead_no_vote';
        seat.onBlock = false;
        seat.blockVotes = 0;
        gs.showVotesOnTV = false;
        logEvent(gs, `${seat.name} was executed`);
      }
      break;
    }

    default:
      changed = false;
  }

  return { changed };
}

module.exports = { makeSeat, makeDefaultState, applyAction };
