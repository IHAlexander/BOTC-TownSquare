'use strict';

const { t, tCount, isSupportedLanguage } = require('./i18n');

function makeSeat() {
  return {
    name: '', state: 'alive', onBlock: false, blockVotes: 0,
    hasNominated: false,
    hasBeenNominated: false,
    isCurrentNominator: false,
    isCurrentNominee: false,
    markedForExecution: false,
  };
}

function makeDefaultState() {
  return {
    title: '',
    language: 'en',
    phase: 'night',
    dayNumber: 1,
    seatCount: 10,
    seats: Array.from({ length: 10 }, makeSeat),
    showVotesOnTV: false,
    log: [],
    nominationInProgress: false,
    highestVotes: 0,
    nominationLog: [],
  };
}

function logEvent(gs, text) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  gs.log.unshift({ time, text });
  if (gs.log.length > 100) gs.log.length = 100;
}

function logNomEvent(gs, text) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  gs.nominationLog.push({ time, text });
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

    case 'SET_LANGUAGE': {
      if (!isSupportedLanguage(msg.language) || msg.language === gs.language) {
        changed = false;
        break;
      }
      gs.language = msg.language;
      break;
    }

    case 'SET_PHASE': {
      const newPhase = msg.phase === 'night' ? 'night' : 'day';
      if (gs.phase === 'day' && newPhase === 'night') {
        gs.dayNumber++;
      }
      if (newPhase === 'day') {
        gs.nominationInProgress = false;
        gs.highestVotes = 0;
        gs.seats.forEach(s => {
          s.hasNominated = false;
          s.hasBeenNominated = false;
          s.isCurrentNominator = false;
          s.isCurrentNominee = false;
          s.markedForExecution = false;
        });
      }
      gs.phase = newPhase;
      logEvent(gs, t(gs.language, newPhase === 'day' ? 'log.dayBegins' : 'log.nightBegins', { n: gs.dayNumber }));
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
        if (seat.name && !oldName) logEvent(gs, t(gs.language, 'log.playerJoined', { name: seat.name }));
        else if (!seat.name && oldName) logEvent(gs, t(gs.language, 'log.playerRemoved', { name: oldName }));
        else if (seat.name !== oldName && oldName) logEvent(gs, t(gs.language, 'log.playerRenamed', { old: oldName, new: seat.name }));
      }
      break;
    }

    case 'SET_SEAT_STATE': {
      const seat = gs.seats[msg.index];
      const valid = ['alive', 'dead_vote', 'dead_no_vote'];
      if (seat && seat.name && valid.includes(msg.state)) {
        seat.state = msg.state;
        const logKeys = { alive: 'log.nowAlive', dead_vote: 'log.nowDeadVote', dead_no_vote: 'log.nowDeadNoVote' };
        logEvent(gs, t(gs.language, logKeys[msg.state], { name: seat.name }));
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
        logEvent(gs, t(gs.language, 'log.onBlock', { name: gs.seats[idx].name }));
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
        seat.state = 'dead_vote';
        seat.onBlock = false;
        seat.blockVotes = 0;
        gs.showVotesOnTV = false;
        logEvent(gs, t(gs.language, 'log.executed', { name: seat.name }));
      }
      break;
    }

    case 'NOMINATE': {
      const nominatorIdx = parseInt(msg.nominatorIdx);
      const nomineeIdx = parseInt(msg.nomineeIdx);
      if (
        gs.phase !== 'day' ||
        gs.nominationInProgress ||
        nominatorIdx === nomineeIdx ||
        !gs.seats[nominatorIdx] ||
        !gs.seats[nomineeIdx]
      ) {
        changed = false;
        break;
      }
      const nominator = gs.seats[nominatorIdx];
      const nominee = gs.seats[nomineeIdx];
      if (
        !nominator.name ||
        !nominee.name ||
        nominator.state !== 'alive' ||
        nominator.hasNominated ||
        nominee.hasBeenNominated
      ) {
        changed = false;
        break;
      }
      gs.nominationInProgress = true;
      nominator.hasNominated = true;
      nominator.isCurrentNominator = true;
      nominee.hasBeenNominated = true;
      nominee.isCurrentNominee = true;
      logEvent(gs, t(gs.language, 'log.nominated', { nominator: nominator.name, nominee: nominee.name }));
      logNomEvent(gs, t(gs.language, 'nomlog.nominated', {
        n: gs.dayNumber, nominator: nominator.name, nominee: nominee.name,
      }));
      break;
    }

    case 'CANCEL_NOMINATION': {
      if (!gs.nominationInProgress) {
        changed = false;
        break;
      }
      gs.nominationInProgress = false;
      gs.seats.forEach(s => {
        s.isCurrentNominator = false;
        s.isCurrentNominee = false;
      });
      break;
    }

    case 'SUBMIT_VOTES': {
      if (!gs.nominationInProgress) {
        changed = false;
        break;
      }
      const votes = Math.max(0, parseInt(msg.votes) || 0);
      const availableVotes = gs.seats.filter(
        s => s.name && (s.state === 'alive' || s.state === 'dead_vote')
      ).length;
      const threshold = Math.ceil(availableVotes / 2);
      const nominee = gs.seats.find(s => s.isCurrentNominee);

      let outcomeKey;
      if (votes < threshold) {
        outcomeKey = 'outcome.safe';
      } else if (votes > gs.highestVotes) {
        gs.seats.forEach(s => { s.markedForExecution = false; });
        if (nominee) nominee.markedForExecution = true;
        gs.highestVotes = votes;
        outcomeKey = 'outcome.marked';
      } else if (votes === gs.highestVotes) {
        gs.seats.forEach(s => { s.markedForExecution = false; });
        outcomeKey = 'outcome.tie';
      } else {
        outcomeKey = 'outcome.safe';
      }

      const nomineeName = nominee ? nominee.name : '?';
      const result = tCount(gs.language, 'log.voteResult', votes, {
        votes,
        nominee: nomineeName,
        threshold,
        outcome: t(gs.language, outcomeKey),
      });
      logEvent(gs, result);
      logNomEvent(gs, t(gs.language, 'nomlog.voteResult', { n: gs.dayNumber, result }));

      gs.nominationInProgress = false;
      gs.seats.forEach(s => {
        s.isCurrentNominator = false;
        s.isCurrentNominee = false;
      });
      break;
    }

    case 'EXECUTE_MARKED': {
      const seat = gs.seats.find(s => s.markedForExecution && s.name);
      if (!seat) {
        changed = false;
        break;
      }
      seat.state = 'dead_vote';
      gs.seats.forEach(s => {
        s.markedForExecution = false;
        s.isCurrentNominator = false;
        s.isCurrentNominee = false;
        s.hasNominated = false;
        s.hasBeenNominated = false;
      });
      gs.nominationInProgress = false;
      gs.dayNumber++;
      gs.phase = 'night';
      logEvent(gs, t(gs.language, 'log.executed', { name: seat.name }));
      logEvent(gs, t(gs.language, 'log.nightBegins', { n: gs.dayNumber }));
      break;
    }

    default:
      changed = false;
  }

  return { changed };
}

module.exports = { makeSeat, makeDefaultState, applyAction };
