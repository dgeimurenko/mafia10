const socket = io();

const params = new URLSearchParams(window.location.search);
const isAdmin = params.get("admin") === "true";

const login = document.getElementById("login");
const game = document.getElementById("game");
const adminPanel = document.getElementById("adminPanel");

const joinBtn = document.getElementById("join");
const startBtn = document.getElementById("startGame");
const endBtn = document.getElementById("endGame");

const nameInput = document.getElementById("name");

const roleBox = document.getElementById("roleBox");
const timer = document.getElementById("timer");
const sheriffBox = document.getElementById("sheriffBox");
const voiceText = document.getElementById("voiceText");
const playersList = document.getElementById("players");
const playerName = document.getElementById("playerName");

let myName = "";

if (isAdmin) {
    login.style.display = "none";
    game.style.display = "none";
    adminPanel.style.display = "block";

    endBtn.onclick = () => {

        if(confirm("Закончить игру?")){

            socket.emit("endGame");

        }

    };

} else {
    adminPanel.style.display = "none";
}

joinBtn.onclick = () => {

    const name = nameInput.value.trim();

    if (!name) {
        alert("Введите ник");
        return;
    }

    myName = name;

    socket.emit("setName", {
        name
    });

    login.style.display = "none";
    game.style.display = "block";

    playerName.innerText = name;

};

startBtn.onclick = () => {
    socket.emit("startGame");
};

socket.on("updatePlayers", players => {

    if (!isAdmin) return;

    playersList.innerHTML = "";

    players.forEach(player => {

        const li = document.createElement("li");

        li.innerText = player.name;

        playersList.appendChild(li);

    });

});

socket.on("showRole", role => {

    roleBox.innerHTML = `
        <div class="role-card">
            <h1>${role}</h1>
            <button id="acceptRole">
                Принято
            </button>
        </div>
    `;

    document.getElementById("acceptRole").onclick = () => {

        roleBox.innerHTML = "";

        socket.emit("roleAccepted");

    };

});

socket.on("voice", text => {

    voiceText.innerText = text;

    speechSynthesis.cancel();

    const msg = new SpeechSynthesisUtterance(text);

    msg.lang = "ru-RU";

    msg.rate = 1;

    speechSynthesis.speak(msg);

});

// =======================
// Таймер мафии
// =======================

let timerInterval = null;

socket.on("mafiaTimer", (seconds) => {

    timer.style.display = "block";

    let time = seconds;

    timer.innerHTML = formatTime(time);

    clearInterval(timerInterval);

    timerInterval = setInterval(() => {

        time--;

        timer.innerHTML = formatTime(time);

        if (time <= 0) {

            clearInterval(timerInterval);

            timer.style.display = "none";

        }

    }, 1000);

});

function formatTime(sec) {

    const m = Math.floor(sec / 60);
    const s = sec % 60;

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

}


// =======================
// Шериф
// =======================

socket.on("showSheriff", () => {

    sheriffBox.style.display = "block";

});

socket.on("hideSheriff", () => {

    sheriffBox.style.display = "none";

});


// =======================
// Очистка интерфейса
// =======================

socket.on("gameFinished", () => {

    roleBox.innerHTML = "";

    sheriffBox.style.display = "none";

    timer.style.display = "none";

    voiceText.innerHTML = "";

});


// =======================
// Переподключение
// =======================

socket.on("connect", () => {

    console.log("Соединение установлено");

});

socket.on("disconnect", () => {

    voiceText.innerHTML = "Соединение потеряно...";

});


// =======================
// На всякий случай скрываем
// лишние элементы
// =======================

timer.style.display = "none";
sheriffBox.style.display = "none";


// =======================
// Запрет Enter отправлять
// пустое имя
// =======================

nameInput.addEventListener("keypress", e => {

    if (e.key === "Enter") {

        joinBtn.click();

    }

});

socket.on("gameEnded", ()=>{

    roleBox.innerHTML = "";

    timer.style.display="none";

    sheriffBox.style.display="none";

    voiceText.innerHTML="";

});

socket.on("gameResults", results=>{

    if(!isAdmin) return;

    playersList.innerHTML="";

    results.forEach(player=>{

        const li=document.createElement("li");

        li.innerHTML=`
            <b>${player.name}</b>
            <br>
            ${player.role}
        `;

        playersList.appendChild(li);

    });

});