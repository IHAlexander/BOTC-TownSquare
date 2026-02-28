const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'state.json');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

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

let gameState = makeDefaultState();

if (fs.existsSync(STATE_FILE)) {
  try {
    gameState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    console.warn('Could not load state.json, using defaults');
  }
}

let previousState = null;

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(gameState, null, 2));
}

function logEvent(text) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  gameState.log.unshift({ time, text });
  if (gameState.log.length > 100) gameState.log.length = 100;
}

function snapshot() {
  previousState = JSON.parse(JSON.stringify(gameState));
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Map of ws -> { role: 'display' | 'storyteller' }
const clients = new Map();

let qrCodeDataUrl = '';
const localIP = getLocalIP();
const stUrl = `http://${localIP}:${PORT}/storyteller.html`;

QRCode.toDataURL(stUrl, { width: 220, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
  .then(url => { qrCodeDataUrl = url; })
  .catch(() => {});

function stConnected() {
  for (const info of clients.values()) {
    if (info.role === 'storyteller') return true;
  }
  return false;
}

function buildBroadcast() {
  return JSON.stringify({
    type: 'STATE',
    state: gameState,
    stConnected: stConnected(),
    qrCode: qrCodeDataUrl,
  });
}

function broadcast() {
  const msg = buildBroadcast();
  for (const ws of clients.keys()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

wss.on('connection', ws => {
  clients.set(ws, { role: 'display' });
  ws.send(buildBroadcast());

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'IDENTIFY') {
      clients.set(ws, { role: msg.role === 'storyteller' ? 'storyteller' : 'display' });
      broadcast();
      return;
    }

    snapshot();
    let changed = true;

    switch (msg.type) {
      case 'SET_TITLE':
        gameState.title = String(msg.title || '').slice(0, 60);
        break;

      case 'SET_PHASE': {
        const newPhase = msg.phase === 'night' ? 'night' : 'day';
        if (gameState.phase === 'day' && newPhase === 'night') {
          gameState.dayNumber++;
        }
        gameState.phase = newPhase;
        logEvent(`${newPhase === 'day' ? 'Day' : 'Night'} ${gameState.dayNumber} begins`);
        break;
      }

      case 'SET_SEAT_COUNT': {
        const count = Math.max(5, Math.min(20, parseInt(msg.count) || 10));
        const old = gameState.seats;
        gameState.seats = Array.from({ length: count }, (_, i) => old[i] || makeSeat());
        gameState.seatCount = count;
        break;
      }

      case 'SET_SEAT_NAME': {
        const seat = gameState.seats[msg.index];
        if (seat !== undefined) {
          const oldName = seat.name;
          seat.name = String(msg.name || '').slice(0, 30);
          if (seat.name && !oldName) logEvent(`${seat.name} joined`);
          else if (!seat.name && oldName) logEvent(`${oldName} removed`);
          else if (seat.name !== oldName && oldName) logEvent(`${oldName} renamed to ${seat.name}`);
        }
        break;
      }

      case 'SET_SEAT_STATE': {
        const seat = gameState.seats[msg.index];
        const valid = ['alive', 'dead_vote', 'dead_no_vote'];
        if (seat && seat.name && valid.includes(msg.state)) {
          seat.state = msg.state;
          const labels = { alive: 'alive', dead_vote: 'dead (vote remaining)', dead_no_vote: 'dead' };
          logEvent(`${seat.name} is now ${labels[msg.state]}`);
        }
        break;
      }

      case 'REORDER_SEATS': {
        if (Array.isArray(msg.seats) && msg.seats.length === gameState.seatCount) {
          gameState.seats = msg.seats;
        }
        break;
      }

      case 'SET_ON_BLOCK': {
        const idx = parseInt(msg.index);
        gameState.seats.forEach(s => { s.onBlock = false; s.blockVotes = 0; });
        gameState.showVotesOnTV = false;
        if (idx >= 0 && gameState.seats[idx] && gameState.seats[idx].name) {
          gameState.seats[idx].onBlock = true;
          logEvent(`${gameState.seats[idx].name} is on the block`);
        }
        break;
      }

      case 'SET_BLOCK_VOTES': {
        const seat = gameState.seats.find(s => s.onBlock);
        if (seat) seat.blockVotes = Math.max(0, parseInt(msg.votes) || 0);
        break;
      }

      case 'TOGGLE_SHOW_VOTES':
        gameState.showVotesOnTV = !gameState.showVotesOnTV;
        break;

      case 'EXECUTE_PLAYER': {
        const seat = gameState.seats.find(s => s.onBlock);
        if (seat && seat.name) {
          seat.state = 'dead_no_vote';
          seat.onBlock = false;
          seat.blockVotes = 0;
          gameState.showVotesOnTV = false;
          logEvent(`${seat.name} was executed`);
        }
        break;
      }

      case 'UNDO':
        if (previousState) {
          gameState = previousState;
          previousState = null;
          saveState();
          broadcast();
        }
        changed = false;
        break;

      case 'RESET':
        gameState = makeDefaultState();
        previousState = null;
        logEvent('Game reset');
        break;

      default:
        changed = false;
    }

    if (changed) {
      saveState();
      broadcast();
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast();
  });
});

server.listen(PORT, () => {
  console.log(`\nBOTC Town Square running on port ${PORT}`);
  console.log(`  TV display:  http://${localIP}:${PORT}/display.html`);
  console.log(`  ST console:  http://${localIP}:${PORT}/storyteller.html\n`);
});
