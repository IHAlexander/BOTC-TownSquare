'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const { makeDefaultState, applyAction } = require('./lib/state');

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

let gameState = makeDefaultState();

if (fs.existsSync(STATE_FILE)) {
  try {
    gameState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    // Backfill fields added in v1.2.0 that may be missing from older state.json files
    if (!Array.isArray(gameState.nominationLog)) gameState.nominationLog = [];
    if (gameState.nominationInProgress === undefined) gameState.nominationInProgress = false;
    if (gameState.highestVotes === undefined) gameState.highestVotes = 0;
    if (Array.isArray(gameState.seats)) {
      gameState.seats.forEach(seat => {
        if (seat.hasNominated === undefined) seat.hasNominated = false;
        if (seat.hasBeenNominated === undefined) seat.hasBeenNominated = false;
        if (seat.isCurrentNominator === undefined) seat.isCurrentNominator = false;
        if (seat.isCurrentNominee === undefined) seat.isCurrentNominee = false;
        if (seat.markedForExecution === undefined) seat.markedForExecution = false;
      });
    }
  } catch {
    console.warn('Could not load state.json, using defaults');
  }
}

let previousState = null;

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(gameState, null, 2));
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

    if (msg.type === 'UNDO') {
      if (previousState) {
        gameState = previousState;
        previousState = null;
        saveState();
        broadcast();
      }
      return;
    }

    if (msg.type === 'RESET') {
      gameState = makeDefaultState();
      previousState = null;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      gameState.log.unshift({ time, text: 'Game reset' });
      saveState();
      broadcast();
      return;
    }

    snapshot();
    const { changed } = applyAction(gameState, msg);
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
