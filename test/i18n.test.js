'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MESSAGES, SUPPORTED_LANGUAGES, getMessages, t, tCount } = require('../lib/i18n');
const { makeDefaultState, applyAction } = require('../lib/state');

// ── Catalog ────────────────────────────────────────────────────────────────
test('every supported language defines the same keys as en', () => {
  const enKeys = Object.keys(MESSAGES.en).sort();
  for (const { code } of SUPPORTED_LANGUAGES) {
    assert.deepEqual(
      Object.keys(MESSAGES[code] || {}).sort(),
      enKeys,
      `${code} is missing or has extra keys`
    );
  }
});

test('getMessages falls back to English for unknown languages', () => {
  assert.equal(getMessages('zh-CN')['phase.day'], '第 {n} 天');
  assert.equal(getMessages('fr')['phase.day'], 'Day {n}');
});

test('t interpolates params and falls back', () => {
  assert.equal(t('en', 'phase.day', { n: 3 }), 'Day 3');
  assert.equal(t('zh-CN', 'phase.day', { n: 3 }), '第 3 天');
  assert.equal(t('fr', 'phase.night', { n: 2 }), 'Night 2');
  assert.equal(t('en', 'no.such.key'), 'no.such.key');
});

test('tCount picks singular and plural variants', () => {
  assert.equal(tCount('en', 'block.votesSoFar', 1), '1 vote so far');
  assert.equal(tCount('en', 'block.votesSoFar', 2), '2 votes so far');
  assert.equal(tCount('zh-CN', 'block.votesSoFar', 1), '已有 1 票');
  assert.equal(tCount('zh-CN', 'block.votesSoFar', 2), '已有 2 票');
});

// ── SET_LANGUAGE ───────────────────────────────────────────────────────────
test('makeDefaultState defaults to English', () => {
  assert.equal(makeDefaultState().language, 'en');
});

test('makeDefaultState leaves the session title empty (clients show a localized default)', () => {
  assert.equal(makeDefaultState().title, '');
  assert.equal(t('en', 'title.default'), 'Blood on the Clocktower');
  assert.equal(t('zh-CN', 'title.default'), '染·钟楼谜团');
});

test('SET_LANGUAGE switches to a supported language', () => {
  const state = makeDefaultState();
  const { changed } = applyAction(state, { type: 'SET_LANGUAGE', language: 'zh-CN' });
  assert.equal(changed, true);
  assert.equal(state.language, 'zh-CN');
});

test('SET_LANGUAGE rejects unsupported languages', () => {
  const state = makeDefaultState();
  const { changed } = applyAction(state, { type: 'SET_LANGUAGE', language: 'fr' });
  assert.equal(changed, false);
  assert.equal(state.language, 'en');
});

test('SET_LANGUAGE to the current language is a no-op', () => {
  const state = makeDefaultState();
  const { changed } = applyAction(state, { type: 'SET_LANGUAGE', language: 'en' });
  assert.equal(changed, false);
});

// ── Localized logs ─────────────────────────────────────────────────────────
test('game log is written in the active language', () => {
  const state = makeDefaultState();
  applyAction(state, { type: 'SET_LANGUAGE', language: 'zh-CN' });
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Alice' });
  assert.equal(state.log[0].text, 'Alice 加入');
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  assert.equal(state.log[0].text, '第 1 天开始');
  assert.equal(state.log[1].text, 'Alice 加入');
});

test('vote result log is localized', () => {
  const state = makeDefaultState();
  applyAction(state, { type: 'SET_LANGUAGE', language: 'zh-CN' });
  applyAction(state, { type: 'SET_PHASE', phase: 'day' });
  for (let i = 0; i < 8; i++) state.seats[i].name = `P${i}`;
  applyAction(state, { type: 'NOMINATE', nominatorIdx: 0, nomineeIdx: 1 });
  applyAction(state, { type: 'SUBMIT_VOTES', votes: 5 });
  assert.ok(state.log[0].text.includes('P1：5 票（需 4）— 标记处决'));
});

test('English remains the default for logs', () => {
  const state = makeDefaultState();
  applyAction(state, { type: 'SET_SEAT_NAME', index: 0, name: 'Alice' });
  assert.equal(state.log[0].text, 'Alice joined');
});
