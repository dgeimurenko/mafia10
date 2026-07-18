const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 360000, // 2 минуты
        skipMiddlewares: true
    }
});

let minuteInterval = null;
let minuteTimeout10 = null;

app.use(express.static("public"));

const ROLES = [
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

let adminId = null;

let gameState = "waiting";

let acceptedPlayers = 0;

let nightKill = null;

let donCheckTarget = null;

let sheriffCheckTarget = null;


// ======================
// Утилиты
// ======================

function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}


function voice(text) {

    if (!adminId) return;

    io.emit("voice", text);
}

function voice1(text) {

    if (!adminId) return;

    io.emit("voice1", text);
}

function getPlayerBySlot(slot) {

    return players.find(
        player => player.slot === Number(slot)
    );

}


function getAlivePlayers() {

    return players.filter(
        player => player.alive
    );

}


function sendPlayersToAdmin() {

    if (!adminId) return;

    io.to(adminId).emit(
        "playersUpdate",
        players.map(player => ({
            slot: player.slot,
            name: player.name,
            alive: player.alive,
            ready: player.accepted
        }))
    );

}


function assignRoles() {

    let roles = shuffle(
        ROLES.slice(0, players.length)
    );


    players.forEach((player, index) => {

        player.role = roles[index];
        player.accepted = false;
        player.alive = true;

    });

}

function startNight(){


    gameState = "night";


    voice(
        "Наступает ночь. Город засыпает."
    );



    setTimeout(()=>{


        gameState="donKill";


        voice(
            "Просыпается дон и выбирает кого убивает."
        );



        const don = players.find(
            p =>
            p.role === "Дон Мафии" &&
            p.alive
        );



        if(don){


            io.to(don.id).emit(
                "donKill"
            );


        }



    },10000);



}

function sendRoles() {

    players.forEach(player => {

        io.to(player.id).emit(
            "showRole",
            player.role
        );

    });

}

// ======================
// Начало классической ночи
// ======================

function startMafiaPhase() {

    gameState = "mafia";


    voice(
        "Просыпается мафия. У мафии одна минута на договорку начинается сейчас."
    );


    players.forEach(player => {


        if(
            player.role === "Мафия" ||
            player.role === "Дон Мафии"
        ){

            io.to(player.id).emit(
                "mafiaTimer",
                70
            );

        }


    });



    setTimeout(()=>{


        voice(
            "Договорка окончена. Засыпайте."
        );



        setTimeout(()=>{


            startSheriffPhase();


        },10000);



    },70000);


}





function startSheriffPhase(){


    gameState="sheriff";


    voice(
        "Шериф может осмотреть город."
    );



    const sheriff =
        players.find(
            p =>
            p.role === "Шериф" &&
            p.alive
        );



    setTimeout(()=>{


        voice(
            "Шериф засыпает."
        );



        setTimeout(()=>{

            io.to(adminId).emit("pauseMusic");
            voice(
                "Город просыпается."
            );

            gameState="day";


        },10000);



    },10000);



}



function startSheriff() {


    gameState = "sheriff";


    voice(
        "Просыпается шериф и ищет мафию."
    );



    const sheriff = players.find(
        p =>
        p.role === "Шериф" &&
        p.alive
    );



    if (sheriff) {

        io.to(sheriff.id).emit(
            "sheriffAction"
        );

    }


}

// ======================
// Socket.IO
// ======================

io.on("connection", socket => {

    console.log("Подключился:", socket.id);

    if (socket.recovered) {
        console.log("Соединение восстановлено");
    }

    // ======================
    // Регистрация администратора
    // ======================

    socket.on("registerAdmin", () => {

        adminId = socket.id;

        console.log(
            "Администратор:",
            adminId
        );

        sendPlayersToAdmin();

    });



    // ======================
    // Игрок вводит имя
    // ======================

    socket.on("setName", data => {


        if (!data.name) return;


        // защита от повторного входа
        if (
            players.find(
                p => p.id === socket.id
            )
        ) {
            return;
        }



        players.push({

            id: socket.id,

            name: data.name,

            slot: players.length + 1,

            role: null,

            accepted: false,

            alive: true

        });



        console.log(
            "Игрок:",
            data.name
        );


        sendPlayersToAdmin();


    });



    // ======================
    // Начать игру
    // ======================

    socket.on("startGame", () => {


        if (socket.id !== adminId) {
            return;
        }


        if (gameState !== "waiting") {
            return;
        }


        if (players.length < 2) {

            io.to(adminId).emit(
                "errorMessage",
                "Нужно минимум 2 игрока"
            );

            return;

        }



        assignRoles();


        acceptedPlayers = 0;


        gameState = "roles";


        sendRoles();


        sendPlayersToAdmin();



    });

    socket.on("shufflePlayers", () => {

    if (socket.id !== adminId) return;

    players = shuffle(players);

    players.forEach((player, index) => {
        player.slot = index + 1;
    });

    sendPlayersToAdmin();

    io.emit("playersShuffled",
        players.map(player => ({
            id: player.id,
            slot: player.slot,
            name: player.name,
            alive: player.alive
        }))
    );

});

    // ======================
// Начало ночи
// ======================

socket.on("startNight", () => {


    console.log(
        "Админ нажал начало ночи",
        gameState
    );


    if (socket.id !== adminId) {

        console.log("Не админ");

        return;
    }


    startNight();


});



// ======================
// Дон выбирает жертву
// ======================

socket.on("donKill", slot => {


    if (gameState !== "donKill") {
        return;
    }


    const player = players.find(
        p => p.id === socket.id
    );


    if (!player) return;


    if (
        player.role !== "Дон Мафии"
    ) {
        return;
    }



    const target = getPlayerBySlot(slot);


    if (!target) return;



    nightKill = target.slot;



    io.to(player.id).emit(
        "donKillResult",
        target.slot
    );



    gameState = "donCheck";



    setTimeout(() => {

        voice(
            "Дон проверяет игрока на шерифство."
        );


        io.to(player.id).emit(
            "donCheck"
        );


    }, 2000);



});



// ======================
// Дон проверяет шерифа
// ======================

socket.on("donCheck", slot => {


    if (gameState !== "donCheck") {
        return;
    }



    const player = players.find(
        p => p.id === socket.id
    );


    if (!player) return;


    if (
        player.role !== "Дон Мафии"
    ) {
        return;
    }



    const target = getPlayerBySlot(slot);


    if (!target) return;



    const result =
        target.role === "Шериф";



    io.to(player.id).emit(
        "donCheckResult",
        {
            sheriff: result
        }
    );



    gameState = "sheriff";



    setTimeout(() => {


        voice(
            "Дон засыпает."
        );


        setTimeout(() => {


            startSheriff();


        },10000);



    },3000);



});




// ======================
// Шериф проверяет игрока
// ======================

socket.on("sheriffCheck", slot => {


    if (gameState !== "sheriff") {
        return;
    }



    const player = players.find(
        p => p.id === socket.id
    );


    if (!player) return;



    if (
        player.role !== "Шериф"
    ) {
        return;
    }



    const target = getPlayerBySlot(slot);


    if (!target) return;



    const mafia =
        target.role === "Мафия" ||
        target.role === "Дон Мафии";



    io.to(player.id).emit(
        "sheriffResult",
        {
            mafia
        }
    );

    setTimeout(() => {

    voice(
        "Шериф засыпает."
    );


    setTimeout(() => {

        startDay();

    },10000);


},3000);

});

// ======================
// Завершение проверки шерифа
// ======================

socket.on("sheriffFinished", () => {


    if (socket.id !== adminId) {
        return;
    }


    startDay();


});

    // ======================
    // Игрок принял роль
    // ======================

    socket.on("roleAccepted", () => {


        let player = players.find(
            p => p.id === socket.id
        );


        if (!player) return;


        if (player.accepted) return;



        player.accepted = true;


        acceptedPlayers++;


        sendPlayersToAdmin();



        if (
    acceptedPlayers === players.length
    ) {


    gameState="ready";


    io.emit(
        "allRolesAccepted"
    );



    setTimeout(()=>{


        startMafiaPhase();


    },3000);



        }


    });



// ======================
// День
// ======================

function startDay() {


    gameState = "day";


    const killed = getPlayerBySlot(
        nightKill
    );


    if (killed) {


        killed.alive = false;


        io.to(killed.id).emit(
            "youAreDead"
        );


    }


    io.to(adminId).emit("pauseMusic");
    voice(
        `Город просыпается. Сегодня был убит игрок номер ${nightKill}.`
    );



    io.emit(
        "dayResult",
        {
            killed: nightKill
        }
    );



    sendPlayersToAdmin();


    nightKill = null;


}



// ======================
// Завершение игры
// ======================

socket.on("endGame", () => {


    if (socket.id !== adminId) {
        return;
    }



    finishGame();



});

socket.on("oneMinute", ()=>{

    if(socket.id !== adminId)
        return;

    if(minuteInterval){
        clearInterval(minuteInterval);
    }

    if(minuteTimeout10){
        clearTimeout(minuteTimeout10);
    }

    voice1(
        "Ваша одна минута начинается прямо сейчас."
    );

    let seconds = 60;

    io.to(adminId).emit(
        "minuteTimer",
        seconds
    );

    minuteTimeout10 = setTimeout(()=>{

        voice1(
            "Осталось десять секунд."
        );

    },50000);

    minuteInterval = setInterval(()=>{

        seconds--;

        io.to(adminId).emit(
            "minuteTimer",
            seconds
        );

        if(seconds<=0){

            clearInterval(minuteInterval);
            minuteInterval = null;

            clearTimeout(minuteTimeout10);
            minuteTimeout10 = null;

            voice1(
                "Минута закончилась."
            );

            io.to(adminId).emit(
                "minuteTimer",
                0
            );

        }

    },1000);

});

socket.on("resetMinute", ()=>{

    if(socket.id !== adminId)
        return;

    if(minuteInterval){

        clearInterval(minuteInterval);
        minuteInterval = null;

    }

    if(minuteTimeout10){

        clearTimeout(minuteTimeout10);
        minuteTimeout10 = null;

    }

    io.to(adminId).emit(
        "minuteTimer",
        0
    );

});


function finishGame() {


    gameState = "finished";



    const result =
        players.map(player => ({

            slot: player.slot,

            name: player.name,

            role: player.role

        }));



    if (adminId) {


        io.to(adminId).emit(
            "gameResults",
            result
        );


    }



    players.forEach(player => {


        player.role = null;

        player.accepted = false;

        player.alive = true;


    });



    acceptedPlayers = 0;

    nightKill = null;


    gameState = "waiting";



    io.emit(
        "gameEnded"
    );



    sendPlayersToAdmin();


}



// ======================
// Отключение игрока
// ======================

socket.on("disconnect", () => {

    console.log(
        "Отключился:",
        socket.id
    );

    if (socket.id === adminId) {
        adminId = null;
        return;
    }

    const player = players.find(
        p => p.id === socket.id
    );

    if (!player) return;

    player.offline = true;

    setTimeout(() => {

        // Если за 5 минут игрок не переподключился,
        // удаляем его окончательно.
        if (player.offline) {

            players = players.filter(
                p => p.id !== player.id
            );

            sendPlayersToAdmin();

            console.log(
                `${player.name} удалён после долгого отсутствия`
            );
        }

    }, 5 * 60 * 1000);

    sendPlayersToAdmin();

});



});

server.listen(3000, () => {

    console.log(
        "Сервер запущен: http://localhost:3000"
    );

});