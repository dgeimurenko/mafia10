// Simple Mafia Game Stats Service
// Ready to deploy on Render.com as a Web Service

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { players: {}, games: [] };
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Routes

// Health check
app.get('/', (req, res) => {
  res.send('Mafia Stats Service is running');
});

// Add game result
app.post('/game', (req, res) => {
  const { players, winner } = req.body;

  if (!players || !Array.isArray(players) || !winner) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const db = loadDB();

  const game = {
    id: Date.now(),
    players,
    winner,
    date: new Date().toISOString()
  };

  db.games.push(game);

  players.forEach(p => {
    if (!db.players[p.name]) {
      db.players[p.name] = {
        games: 0,
        wins: 0,
        roles: {}
      };
    }

    db.players[p.name].games += 1;

    if (p.role) {
      db.players[p.name].roles[p.role] = (db.players[p.name].roles[p.role] || 0) + 1;
    }

    if (p.team === winner) {
      db.players[p.name].wins += 1;
    }
  });

  saveDB(db);

  res.json({ success: true, game });
});

// Get all stats
app.get('/stats', (req, res) => {
  const db = loadDB();
  res.json(db.players);
});