const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const BASE_ROLES = [
    "Шериф",
    "Дон Мафии",
    "Мафия",
    "Мафия",
    "Мирный",
    "Мирный",
    "Мирный",
    "Мирный",
    "Мирный",
    "Мирный"
];

let players = [];
let acceptedPlayers = 0;
let gameState = "waiting";

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function voice(text) {
    io.emit("voice", text);
}

function broadcastPlayers() {

    io.emit(
        "updatePlayers",
        players.map(p => ({
            id: p.id,
            name: p.name,
            ready: p.accepted,
            role: gameState === "waiting" ? null : p.role
        }))
    );

}

function assignRoles() {

    let roles = BASE_ROLES.slice(0, players.length);

    while (roles.length < players.length) {
        roles.push("Мирный");
    }

    roles = shuffle(roles);

    players.forEach((player, index) => {

        player.role = roles[index];
        player.accepted = false;

    });

}

function sendRoles() {

    players.forEach(player => {

        io.to(player.id).emit("showRole", player.role);

    });

}

function startNight() {

    gameState = "mafia";

    voice("Просыпается мафия. У мафии одна минута на договорку начинается сейчас.");

    players.forEach(player => {

        if (player.role === "Мафия" || player.role === "Дон Мафии") {
            io.to(player.id).emit("mafiaTimer", 80);
        }

    });

    setTimeout(endMafia, 80000);

}

function endMafia() {

    voice("Договорка окончена. Засыпайте.");

    setTimeout(startSheriff, 10000);

}

function startSheriff() {

    gameState = "sheriff";

    voice("Шериф может осмотреть город.");

    const sheriff = players.find(p => p.role === "Шериф");

    if (sheriff) {
        io.to(sheriff.id).emit("showSheriff");
    }

    setTimeout(endSheriff, 10000);

}

function endSheriff() {

    const sheriff = players.find(p => p.role === "Шериф");

    if (sheriff) {
        io.to(sheriff.id).emit("hideSheriff");
    }

    voice("Шериф засыпает.");

    setTimeout(() => {

        gameState = "day";

        voice("Город просыпается.");

    }, 10000);

}

io.on("connection", socket => {

    console.log("Подключился:", socket.id);

    socket.on("setName", data => {

        // Не даём зарегистрироваться дважды
        if (players.find(p => p.id === socket.id)) return;

        players.push({
            id: socket.id,
            name: data.name,
            role: null,
            accepted: false
        });

        broadcastPlayers();

    });

    socket.on("startGame", () => {

        if (gameState !== "waiting") return;

        if (players.length < 2) return;

        acceptedPlayers = 0;

        assignRoles();

        sendRoles();

        gameState = "roles";

        broadcastPlayers();

    });

    socket.on("roleAccepted", () => {

        const player = players.find(p => p.id === socket.id);

        if (!player) return;

        if (player.accepted) return;

        player.accepted = true;

        acceptedPlayers++;

        broadcastPlayers();

        if (acceptedPlayers >= players.length) {
            startNight();
        }

    });

    socket.on("disconnect", () => {

        console.log("Отключился:", socket.id);

        players = players.filter(p => p.id !== socket.id);

        broadcastPlayers();

    });

    socket.on("endGame", () => {

    endGame();

});

});

function endGame() {

    // Показываем админу роли
    io.emit("gameResults", players.map(player => ({
        name: player.name,
        role: player.role
    })));

    // Очищаем игроков
    players.forEach(player => {
        player.role = null;
        player.accepted = false;
    });

    acceptedPlayers = 0;
    gameState = "waiting";

    // Всем игрокам
    io.emit("gameEnded");

    broadcastPlayers();

}

server.listen(3000, () => {

    console.log("Сервер запущен: http://localhost:3000");

});