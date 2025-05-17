const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let users = {}; // socket.id -> { nickname, slot, role }

app.use(express.static('public'));

io.on('connection', socket => {
  socket.on('setPlayerInfo', ({ nickname, slot }) => {
    users[socket.id] = {
      nickname,
      slot: parseInt(slot),
      role: null
    };
    updateUsers();
  });

  socket.on('startGame', () => {
    const roles = [
      'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 
      'Шериф', 'Мафия', 'Мафия', 'Дон Мафии'
    ];
    const shuffledRoles = shuffleArray(roles);

    let index = 0;
    for (const id in users) {
      users[id].role = shuffledRoles[index++];
    }

    // Broadcasting to all players in order of their slot number
    let roleRevealSequence = usersSortedBySlot();
    io.emit('announceStart', roleRevealSequence);

    // After all roles are shown, tell players mafia is waking up
    setTimeout(() => {
      io.emit('announceMafiaWakeup');
    }, (roleRevealSequence.length + 1) * 4000); // Wait for all role reveals

    updateUsers();
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    updateUsers();
  });

  function updateUsers() {
    const list = usersSortedBySlot().map(u => ({
      nickname: u.nickname,
      slot: u.slot,
      role: u.role // role will be used on the client side under the spoiler
    }));
    io.emit('updateUsers', list);
  }

  function usersSortedBySlot() {
    return Object.values(users).sort((a, b) => a.slot - b.slot);
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
