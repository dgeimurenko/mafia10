const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Роли
const roles = [
  'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный', 'Мирный',
  'Шериф', 'Мафия', 'Мафия', 'Дон Мафии'
];

// Игроки
let players = [];
let gameStarted = false;
let gameInProgress = false;

// Статическая папка для HTML и JS
app.use(express.static('public'));

// Подключение нового игрока
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Добавляем игрока
  socket.on('setName', (data) => {
    players.push({ id: socket.id, name: data.name, role: null, slot: players.length + 1 });
    io.emit('updatePlayerList', players);
  });

  // Начало игры
  socket.on('startGame', () => {
    if (gameStarted || players.length < 2) {
      return;
    }

    // Перемешиваем роли
    let shuffledRoles = roles.slice();
    shuffledRoles.sort(() => Math.random() - 0.5);

    // Назначаем роли
    players.forEach((player, index) => {
      player.role = shuffledRoles[index];
    });

    gameStarted = true;

    // Озвучивание начала игры
    io.emit('gameStart', 'Игра началась! Всем игрокам нужно закрыть глаза.');
    setTimeout(() => {
      io.emit('gameStart', 'Мафия, просыпайтесь и выбирайте свою жертву.');
      setTimeout(() => {
        io.emit('gameStart', 'Шериф, просыпайся и выбирай кого расследовать.');
        setTimeout(() => {
          io.emit('gameStart', 'Ночь закончена, все засыпают.');
          io.emit('gameStart', 'День настал. Обсуждение.');
        }, 5000); // Шериф действия
      }, 5000); // Мафия действия
    }, 3000); // Ночь начинается

    io.emit('updatePlayerList', players);
  });

  // Отключение игрока
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    players = players.filter(player => player.id !== socket.id);
    io.emit('updatePlayerList', players);
  });
});

// Запуск сервера
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
