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
  assert.equal(state.seats[0].state, 'dead_no_vote');
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
