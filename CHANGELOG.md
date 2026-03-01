# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.3.0] - 2026-03-01

### Added
- Reset modal replaces the native `confirm()` dialog, offering two options:
  - **Keep Players** (`SOFT_RESET`): resets phase to Night 1, all seat states to alive, clears nomination state and logs, preserves player names and seat count
  - **Full Reset** (`RESET`): existing behaviour — clears everything including player names

---

## [1.2.0] - 2026-03-01

### Added
- Nomination and voting system on the ST console
  - Nominator and nominee dropdowns (alive-only nominators; any named player as nominee)
  - BOTC rules enforced: each alive player may nominate once per day; each player may be nominated once per day
  - Vote count input with outcome logic: safe / marked for execution / tie (clears all marks)
  - "Execute Marked" button: kills the marked player (retains ghost vote), transitions to Night
  - Nomination resets automatically at the start of each Day
- Execution mark badge (⚰) on TV token for the player currently marked for execution
- Nomination indicator dots on ST player rows (gold = nominator, red = nominee / marked)
- Nomination log panel in ST footer showing full vote history for the game

### Changed
- `lib/state.js`: `makeSeat()` gains 5 new boolean fields; `makeDefaultState()` gains `nominationInProgress`, `highestVotes`, `nominationLog`
- `SET_PHASE` to Day now resets per-seat nomination booleans and `highestVotes` (nomination log is never cleared)
- New actions: `NOMINATE`, `CANCEL_NOMINATION`, `SUBMIT_VOTES`, `EXECUTE_MARKED`

---

## [1.1.4] - 2026-03-01

### Fixed
- Undo button was broken: `snapshot()` was called before the UNDO handler, causing it to overwrite the saved previous state with the current state before restoring it (a no-op). Moved `snapshot()` to after the UNDO and RESET guards so it only runs for actual state-mutating actions.

---

## [1.1.3] - 2026-03-01

### Fixed
- Alive token colour changed from dark red to parchment/cream; dead token colour changed from dark grey to dark purple, matching the design spec
- Ghost vote badge now only shown on `dead_vote` tokens; `dead_no_vote` tokens show no badge (previously showed a greyed-out spent indicator)

---

## [1.1.2] - 2026-02-28

### Fixed
- Executed player state incorrectly set to `dead_no_vote`; BOTC rules grant executed players their ghost vote, so state is now `dead_vote`

---

## [1.1.1] - 2026-02-28

### Fixed
- Majority vote calculation used `floor(n/2)+1` giving 5 for 8 alive players; correct formula is `ceil(n/2)` giving 4

---

## [1.1.0] - 2026-02-28

### Fixed
- Reorder not updating TV display — Sortable `onEnd` callback closed over a stale `gs` reference from the first `render()` call, causing dragged player data to revert to the initial empty state

### Added
- Unit test suite using Node's built-in `node:test` (run with `npm test`)
- `lib/state.js` — extracted state mutation logic for testability
- `README.md` — installation, usage, and development guide
- `CHANGELOG.md` — this file

---

## [1.0.0] - 2026-02-28

### Added
- TV display with circular seat layout (5–20 seats)
- Storyteller console (mobile-optimised, WebSocket-synced)
- Player states: Alive, Dead with ghost vote, Dead without ghost vote
- Day/Night phase toggle with full visual theme change
- On-the-block highlight with majority vote calculation
- Optional live vote tally display on TV
- Quick Execute button
- Drag-to-reorder seats (SortableJS)
- Session title, game log, single-level undo
- QR code on TV linking to ST console URL (auto-dismisses on connect)
- State persistence to `state.json` (survives server restart)
- PWA manifest for phone home-screen installation
