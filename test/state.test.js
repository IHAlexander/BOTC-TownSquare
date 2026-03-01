'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeSeat, makeDefaultState, applyAction } = require('../lib/state');

function gs() { return makeDefaultState(); }

// ── SET_TITLE ──────────────────────────────────────────────────────────────
test('SET_TITLE sets title', () => {
  const state = gs();
  applyAction(state, { type: 'SET_TITLE', title: 'Trouble Brewing' });
  assert.equal(state.title, 'Trouble Brewing');
});

test('SET_TITLE truncates at 60 chars', () => {
  const state = gs();
  applyAction(state, { type: 'SET_TITLE', title: 'A'.repeat(80) });
  assert.equal(state.title.length, 60);
});

// ── SET_PHASE ──────────────────────────────────────────────────────────────
test('SET_PHASE night→day does not increment dayNumber', () => {
  const state = gs(); // starts as night, day 1
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  assert.equal(state.phase, 'day');
  assert.equal(state.dayNumber, 1);
});

test('SET_PHASE day→night increments dayNumber', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  applyAction(state, { type: 'SET_PHASE', phase: 'night' });
  assert.equal(state.phase, 'night');
  assert.equal(state.dayNumber, 2);
});

test('SET_PHASE appends log entry', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  assert.ok(state.log[0].text.includes('Day 1'));
});

// ── SET_SEAT_COUNT ─────────────────────────────────────────────────────────
test('SET_SEAT_COUNT clamps to minimum 5', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_COUNT', count: 2 });
  assert.equal(state.seatCount, 5);
  assert.equal(state.seats.length, 5);
});

test('SET_SEAT_COUNT clamps to maximum 20', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_COUNT', count: 25 });
  assert.equal(state.seatCount, 20);
  assert.equal(state.seats.length, 20);
});

test('SET_SEAT_COUNT preserves existing seats when growing', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  applyAction(state, { type: 'SET_SEAT_COUNT', count: 12 });
  assert.equal(state.seats[0].name, 'Alice');
  assert.equal(state.seats.length, 12);
});

test('SET_SEAT_COUNT shrinks by dropping trailing seats', () => {
  const state = gs();
  state.seats[9].name = 'Zara';
  applyAction(state, { type: 'SET_SEAT_COUNT', count: 8 });
  assert.equal(state.seats.length, 8);
  assert.ok(state.seats.every(s => s.name !== 'Zara'));
});

// ── SET_SEAT_NAME ──────────────────────────────────────────────────────────
test('SET_SEAT_NAME names a seat', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Alice' });
  assert.equal(state.seats[0].name, 'Alice');
});

test('SET_SEAT_NAME logs join', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Alice' });
  assert.ok(state.log[0].text.includes('joined'));
});

test('SET_SEAT_NAME clears a seat and logs removal', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Alice' });
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: '' });
  assert.equal(state.seats[0].name, '');
  assert.ok(state.log[0].text.includes('removed'));
});

test('SET_SEAT_NAME logs rename', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Alice' });
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Bob' });
  assert.ok(state.log[0].text.includes('renamed'));
});

test('SET_SEAT_NAME truncates at 30 chars', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'A'.repeat(40) });
  assert.equal(state.seats[0].name.length, 30);
});

test('SET_SEAT_NAME on invalid index does not crash', () => {
  const state = gs();
  assert.doesNotThrow(() => applyAction(state, { type: 'SET_SEAT_NAME', index: 99, name: 'X' }));
});

// ── SET_SEAT_STATE ─────────────────────────────────────────────────────────
test('SET_SEAT_STATE updates named seat', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  applyAction(state, { type: 'SET_SEAT_STATE', index: 0, state: 'dead_vote' });
  assert.equal(state.seats[0].state, 'dead_vote');
});

test('SET_SEAT_STATE ignores empty seat', () => {
  const state = gs();
  applyAction(state, { type: 'SET_SEAT_STATE', index: 0, state: 'dead_vote' });
  assert.equal(state.seats[0].state, 'alive');
});

test('SET_SEAT_STATE ignores invalid state string', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  applyAction(state, { type: 'SET_SEAT_STATE', index: 0, state: 'zombie' });
  assert.equal(state.seats[0].state, 'alive');
});

// ── REORDER_SEATS ──────────────────────────────────────────────────────────
test('REORDER_SEATS applies valid reorder', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  const reversed = [...state.seats].reverse();
  applyAction(state, { type: 'REORDER_SEATS', seats: reversed });
  assert.equal(state.seats[0].name, '');
  assert.equal(state.seats[state.seatCount - 1].name, 'Alice');
});

test('REORDER_SEATS ignores wrong-length array', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  const snapshot = [...state.seats];
  applyAction(state, { type: 'REORDER_SEATS', seats: [makeSeat()] });
  assert.deepEqual(state.seats, snapshot);
});

// ── SET_ON_BLOCK ───────────────────────────────────────────────────────────
test('SET_ON_BLOCK sets a named seat on the block', () => {
  const state = gs();
  state.seats[2].name = 'Charlie';
  applyAction(state, { type: 'SET_ON_BLOCK', index: 2 });
  assert.equal(state.seats[2].onBlock, true);
});

test('SET_ON_BLOCK clears any previous block', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  applyAction(state, { type: 'SET_ON_BLOCK', index: 0 });
  applyAction(state, { type: 'SET_ON_BLOCK', index: 1 });
  assert.equal(state.seats[0].onBlock, false);
  assert.equal(state.seats[1].onBlock, true);
});

test('SET_ON_BLOCK resets blockVotes when switching', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[0].onBlock = true;
  state.seats[0].blockVotes = 5;
  state.seats[1].name = 'Bob';
  applyAction(state, { type: 'SET_ON_BLOCK', index: 1 });
  assert.equal(state.seats[0].blockVotes, 0);
});

test('SET_ON_BLOCK with index -1 clears block', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  applyAction(state, { type: 'SET_ON_BLOCK', index: 0 });
  applyAction(state, { type: 'SET_ON_BLOCK', index: -1 });
  assert.equal(state.seats[0].onBlock, false);
});

test('SET_ON_BLOCK ignores empty seat', () => {
  const state = gs();
  applyAction(state, { type: 'SET_ON_BLOCK', index: 0 });
  assert.equal(state.seats[0].onBlock, false);
});

// ── SET_BLOCK_VOTES ────────────────────────────────────────────────────────
test('SET_BLOCK_VOTES updates vote count', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[0].onBlock = true;
  applyAction(state, { type: 'SET_BLOCK_VOTES', votes: 7 });
  assert.equal(state.seats[0].blockVotes, 7);
});

test('SET_BLOCK_VOTES cannot go below 0', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[0].onBlock = true;
  applyAction(state, { type: 'SET_BLOCK_VOTES', votes: -3 });
  assert.equal(state.seats[0].blockVotes, 0);
});

// ── TOGGLE_SHOW_VOTES ──────────────────────────────────────────────────────
test('TOGGLE_SHOW_VOTES flips the flag', () => {
  const state = gs();
  assert.equal(state.showVotesOnTV, false);
  applyAction(state, { type: 'TOGGLE_SHOW_VOTES' });
  assert.equal(state.showVotesOnTV, true);
  applyAction(state, { type: 'TOGGLE_SHOW_VOTES' });
  assert.equal(state.showVotesOnTV, false);
});

// ── EXECUTE_PLAYER ─────────────────────────────────────────────────────────
test('EXECUTE_PLAYER marks on-block player as dead', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[0].onBlock = true;
  applyAction(state, { type: 'EXECUTE_PLAYER' });
  assert.equal(state.seats[0].state, 'dead_vote');
  assert.equal(state.seats[0].onBlock, false);
  assert.equal(state.seats[0].blockVotes, 0);
});

test('EXECUTE_PLAYER logs execution', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[0].onBlock = true;
  applyAction(state, { type: 'EXECUTE_PLAYER' });
  assert.ok(state.log[0].text.includes('executed'));
});

test('EXECUTE_PLAYER with no one on block does not crash', () => {
  const state = gs();
  assert.doesNotThrow(() => applyAction(state, { type: 'EXECUTE_PLAYER' }));
});

// ── Unknown action ─────────────────────────────────────────────────────────
test('unknown action returns changed=false', () => {
  const state = gs();
  const { changed } = applyAction(state, { type: 'DOES_NOT_EXIST' });
  assert.equal(changed, false);
});

// ── makeSeat / makeDefaultState new fields ─────────────────────────────────
test('makeSeat has nomination fields defaulting to false', () => {
  const seat = makeSeat();
  assert.equal(seat.hasNominated, false);
  assert.equal(seat.hasBeenNominated, false);
  assert.equal(seat.isCurrentNominator, false);
  assert.equal(seat.isCurrentNominee, false);
  assert.equal(seat.markedForExecution, false);
});

test('makeDefaultState has nominationInProgress false', () => {
  assert.equal(gs().nominationInProgress, false);
});

test('makeDefaultState has highestVotes 0', () => {
  assert.equal(gs().highestVotes, 0);
});

test('makeDefaultState has empty nominationLog', () => {
  assert.deepEqual(gs().nominationLog, []);
});

// ── SET_PHASE nomination resets ────────────────────────────────────────────
test('SET_PHASE to day resets per-seat nomination booleans', () => {
  const state = gs();
  state.seats[0].name = 'Alice';
  state.seats[0].hasNominated = true;
  state.seats[0].markedForExecution = true;
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  assert.equal(state.seats[0].hasNominated, false);
  assert.equal(state.seats[0].markedForExecution, false);
});

test('SET_PHASE to day resets highestVotes', () => {
  const state = gs();
  state.highestVotes = 7;
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  assert.equal(state.highestVotes, 0);
});

test('SET_PHASE to day does not clear nominationLog', () => {
  const state = gs();
  state.nominationLog.push({ time: '12:00', text: 'old entry' });
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  assert.equal(state.nominationLog.length, 1);
});

test('SET_PHASE to night does not reset highestVotes', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.highestVotes = 5;
  applyAction(state, { type: 'SET_PHASE', phase: 'night' });
  assert.equal(state.highestVotes, 5);
});

// ── NOMINATE ───────────────────────────────────────────────────────────────
test('NOMINATE sets flags correctly', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  assert.equal(state.nominationInProgress, true);
  assert.equal(state.seats[0].hasNominated, true);
  assert.equal(state.seats[0].isCurrentNominator, true);
  assert.equal(state.seats[1].hasBeenNominated, true);
  assert.equal(state.seats[1].isCurrentNominee, true);
});

test('NOMINATE adds log entries', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  assert.ok(state.log[0].text.includes('Alice'));
  assert.ok(state.log[0].text.includes('Bob'));
  assert.equal(state.nominationLog.length, 1);
});

test('NOMINATE guard: not day phase returns changed=false', () => {
  const state = gs(); // starts as night
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  const { changed } = applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  assert.equal(changed, false);
  assert.equal(state.nominationInProgress, false);
});

test('NOMINATE guard: nomination already in progress returns changed=false', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  state.seats[2].name = 'Charlie';
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  const { changed } = applyAction(state, { type: 'NOMINATE', nominatorIdx: 2, nomineeIdx: 1 });
  assert.equal(changed, false);
});

test('NOMINATE guard: self-nomination returns changed=false', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  const { changed } = applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 0 });
  assert.equal(changed, false);
});

test('NOMINATE guard: dead nominator returns changed=false', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[0].state = 'dead_vote';
  state.seats[1].name = 'Bob';
  const { changed } = applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  assert.equal(changed, false);
});

test('NOMINATE guard: nominator already nominated returns changed=false', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[0].hasNominated = true;
  state.seats[1].name = 'Bob';
  const { changed } = applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  assert.equal(changed, false);
});

test('NOMINATE guard: nominee already nominated returns changed=false', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  state.seats[1].hasBeenNominated = true;
  const { changed } = applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  assert.equal(changed, false);
});

// ── CANCEL_NOMINATION ──────────────────────────────────────────────────────
test('CANCEL_NOMINATION clears current flags', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  applyAction(state, { type: 'CANCEL_NOMINATION' });
  assert.equal(state.nominationInProgress, false);
  assert.equal(state.seats[0].isCurrentNominator, false);
  assert.equal(state.seats[1].isCurrentNominee, false);
});

test('CANCEL_NOMINATION preserves hasNominated and hasBeenNominated', () => {
  const state = gs();
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  state.seats[0].name = 'Alice';
  state.seats[1].name = 'Bob';
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  applyAction(state, { type: 'CANCEL_NOMINATION' });
  assert.equal(state.seats[0].hasNominated, true);
  assert.equal(state.seats[1].hasBeenNominated, true);
});

test('CANCEL_NOMINATION with no active nomination returns changed=false', () => {
  const state = gs();
  const { changed } = applyAction(state, { type: 'CANCEL_NOMINATION' });
  assert.equal(changed, false);
});

// ── SUBMIT_VOTES ───────────────────────────────────────────────────────────
function setupNomination(state) {
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  for (let i = 0; i < 8; i++) state.seats[i].name = `P${i}`;
  // 8 alive players → threshold = ceil(8/2) = 4
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
}

test('SUBMIT_VOTES safe: votes below threshold', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 3 });
  assert.equal(state.seats[1].markedForExecution, false);
  assert.equal(state.highestVotes, 0);
  assert.equal(state.nominationInProgress, false);
});

test('SUBMIT_VOTES marks for execution when votes beat highestVotes', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  assert.equal(state.seats[1].markedForExecution, true);
  assert.equal(state.highestVotes, 5);
});

test('SUBMIT_VOTES tie clears all marks', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 }); // Alice marked
  // Start second nomination
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 2, nomineeIdx: 3 });
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 }); // tie
  assert.equal(state.seats[1].markedForExecution, false);
  assert.equal(state.seats[3].markedForExecution, false);
});

test('SUBMIT_VOTES safe when votes above threshold but below highestVotes', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 6 }); // P1 marked, highestVotes=6
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 2, nomineeIdx: 3 });
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 }); // above threshold but < 6
  assert.equal(state.seats[1].markedForExecution, true); // P1 still marked
  assert.equal(state.seats[3].markedForExecution, false);
});

test('SUBMIT_VOTES logs vote result to nominationLog', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  assert.equal(state.nominationLog.length, 2); // NOMINATE + SUBMIT_VOTES
});

test('SUBMIT_VOTES guard: no nomination in progress returns changed=false', () => {
  const state = gs();
  const { changed } = applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  assert.equal(changed, false);
});

// ── EXECUTE_MARKED ─────────────────────────────────────────────────────────
test('EXECUTE_MARKED kills marked player and transitions to night', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  const dayNumber = state.dayNumber;
  applyAction(state, { type: 'EXECUTE_MARKED' });
  assert.equal(state.seats[1].state, 'dead_vote');
  assert.equal(state.phase, 'night');
  assert.equal(state.dayNumber, dayNumber + 1);
});

test('EXECUTE_MARKED clears all nomination flags', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  applyAction(state, { type: 'EXECUTE_MARKED' });
  assert.ok(state.seats.every(s => !s.markedForExecution));
  assert.ok(state.seats.every(s => !s.hasNominated));
  assert.equal(state.nominationInProgress, false);
});

test('EXECUTE_MARKED logs execution events', () => {
  const state = gs();
  setupNomination(state);
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  applyAction(state, { type: 'EXECUTE_MARKED' });
  assert.ok(state.log[1].text.includes('executed'));
});

test('EXECUTE_MARKED guard: no marked seat returns changed=false', () => {
  const state = gs();
  const { changed } = applyAction(state, { type: 'EXECUTE_MARKED' });
  assert.equal(changed, false);
});
