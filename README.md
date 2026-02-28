# BOTC Town Square

A virtual town square display for in-person **Blood on the Clocktower** games. The TV shows a circular seat layout; the Storyteller controls everything from a phone over local Wi-Fi.

## Features

- Circular town square on a TV/monitor (up to 20 seats)
- Mobile Storyteller console — no app install required
- Player states: Alive, Dead with ghost vote, Dead without ghost vote
- Seat count adjustable (5–20) with drag-to-reorder
- Day/Night phase toggle with visual theme change
- On-the-block highlight with majority vote calculation
- Optional live vote tally on TV
- Quick Execute button
- Session title, game log, undo last action
- QR code on TV for instant ST console access
- State persisted to disk — survives server restarts
- PWA-installable on phone

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- A local network (phone and TV PC on the same Wi-Fi)

## Installation

```bash
git clone https://github.com/IHAlexander/BOTC-TownSquare.git
cd BOTC-TownSquare
npm install
```

## Running

```bash
npm start
```

The server prints its local IP on startup:

```
BOTC Town Square running on port 3000
  TV display:  http://192.168.1.x:3000/display.html
  ST console:  http://192.168.1.x:3000/storyteller.html
```

- Open the **TV display** URL in a full-screen browser on the PC connected to your TV
- Scan the **QR code** shown on the TV with your phone to open the ST console (or type the URL manually)

The QR code disappears once the ST console connects.

## TV Display

| Element | Description |
|---|---|
| Phase banner | DAY/NIGHT + number, colour-coded |
| Player tokens | Circle per seat; colour = alive/dead state |
| On-the-block strip | Highlighted player + votes needed for majority |
| QR code | Bottom-right, dismisses when ST connects |

## ST Console

| Control | Action |
|---|---|
| Title field | Sets the session title shown on TV |
| Begin Night / Begin Day | Toggles phase; increments day counter |
| ◀ [N] ▶ | Adjusts total seat count (5–20) |
| Seat name field | Tap to name, rename, or clear a player |
| ALV / D+V / DED button | Cycles player state |
| 👑 button | Puts player on the block |
| − [votes] + | Adjusts vote tally (shown on TV if enabled) |
| Execute | Kills the on-block player in one tap |
| ↩ Undo | Reverts the last action |
| × | Clears a seat |
| Game Log | Collapsible event history |
| Reset Game | Clears all players and resets to Night 1 |

## Development

### Running tests

```bash
npm test
```

Uses Node's built-in test runner (`node:test`) — no extra dependencies.

### Branching

Create a branch before every change:

```bash
git checkout -b fix/description   # bug fixes
git checkout -b feat/description  # new features
```

### Versioning

This project uses [semantic versioning](https://semver.org). Update `package.json` `version` and add an entry to `CHANGELOG.md` for every change that affects behaviour.

| Increment | When |
|---|---|
| Patch (1.0.x) | Bug fixes |
| Minor (1.x.0) | New features, backwards compatible |
| Major (x.0.0) | Breaking changes |
