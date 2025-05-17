const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Список ролей
const roles = [
  'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный',
  'Шериф', 'Мафия', 'Мафия', 'Дон Мафии'
];

// Онлайн игроки и их роли
let players = [];

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('New player connected: ' + socket.id);

  // При подключении нового игрока сохраняем его данные
  socket.on('setName', (data) => {
    // Сохраняем имя и номер игрока
    players.push({ id: socket.id, name: data.name, slot: data.slot, role: null });
    io.emit('updatePlayerList', players);
  });

  // Когда суперюзер запускает игру
  socket.on('startGame', () => {
    // Рандомное распределение ролей
    let shuffledRoles = roles.slice();
    shuffledRoles.sort(() => Math.random() - 0.5);

    // Назначаем роль каждому игроку
    players.forEach((player, index) => {
      player.role = shuffledRoles[index]; // Назначаем роль
    });

    // Озвучивание для каждого игрока
    players.forEach((player, index) => {
      io.to(player.id).emit('gameStart', { message: `Игрок номер ${player.slot}, открой глаза, посмотри на свою роль в этой игре.` });
      io.to(player.id).emit('showRole', { role: player.role });
    });

    // Сообщаем всем игрокам, что роли назначены
    setTimeout(() => {
      io.emit('gameStarted', 'Все роли назначены. Все игроки засыпают.');
    }, 3000); // Задержка для озвучивания
  });

  // Отключение игрока
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id);
    players = players.filter(player => player.id !== socket.id);
    io.emit('updatePlayerList', players);
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
