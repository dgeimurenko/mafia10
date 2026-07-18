const socket = io();


// ======================
// Проверка админа
// ======================

const params = new URLSearchParams(
    window.location.search
);

const isAdmin = params.get("admin") === "true";


// ======================
// Элементы
// ======================

const login = document.getElementById("login");
const game = document.getElementById("game");
const adminPanel = document.getElementById("adminPanel");

const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("join");

const startBtn = document.getElementById("startGame");
const nightBtn = document.getElementById("startNight");
const endBtn = document.getElementById("endGame");

const playersList = document.getElementById("players");

const roleBox = document.getElementById("roleBox");

const actionBox = document.getElementById("actionBox");

const voiceText = document.getElementById("voiceText");

const playerName = document.getElementById("playerName");

const timer = document.getElementById("timer");



let currentName = "";



// ======================
// Админ
// ======================

if(isAdmin){

    socket.emit(
        "registerAdmin"
    );


    if(login)
        login.style.display="none";


    if(game)
        game.style.display="none";


    if(adminPanel)
        adminPanel.style.display="block";



    if(endBtn){

        endBtn.onclick = ()=>{

            if(confirm("Закончить игру?")){

                socket.emit(
                    "endGame"
                );

            }

        };

    }


}



// ======================
// Вход игрока
// ======================

if(joinBtn){

joinBtn.onclick = ()=>{


    const name =
        nameInput.value.trim();



    if(!name){

        alert(
            "Введите ник"
        );

        return;

    }



    currentName=name;



    socket.emit(
        "setName",
        {
            name
        }
    );



    if(login)
        login.style.display="none";


    if(game)
        game.style.display="block";


    if(playerName)
        playerName.innerText=name;


};

}



// ======================
// Админ: список игроков
// ======================

socket.on(
"playersUpdate",
players=>{


    if(!playersList)
        return;



    playersList.innerHTML="";



    players.forEach(player=>{


        const li =
            document.createElement("li");


        li.innerHTML=
        `
        ${player.slot}.
        ${player.name}
        ${player.alive ? "🟢":"💀"}
        ${player.ready ? "✅":""}
        `;


        playersList.appendChild(li);


    });


});



// ======================
// Начать игру
// ======================

if(startBtn){

startBtn.onclick=()=>{

    socket.emit(
        "startGame"
    );

};

}



// ======================
// Начало ночи
// ======================

if(nightBtn){

nightBtn.onclick=()=>{
    console.log("Нажата кнопка начала ночи");
    socket.emit("startNight");

};

}



// ======================
// Роль
// ======================

socket.on(
"showRole",
role=>{


    if(!roleBox)
        return;



    roleBox.innerHTML=
    `

    <div class="role-card">

        <h1>${role}</h1>

        <button id="acceptRole">
            Принято
        </button>

    </div>

    `;



    document
    .getElementById("acceptRole")
    .onclick=()=>{


        roleBox.innerHTML="";


        socket.emit(
            "roleAccepted"
        );


    };


});



// ======================
// Все приняли роли
// ======================

socket.on(
"allRolesAccepted",
()=>{


    console.log(
        "Все готовы"
    );


});



// ======================
// Голос
// ======================

socket.on(
"voice",
text=>{


    if(voiceText)
        voiceText.innerText=text;



    speechSynthesis.cancel();


    const msg =
        new SpeechSynthesisUtterance(text);


    msg.lang="ru-RU";


    speechSynthesis.speak(msg);



});




// ======================
// Дон - убийство
// ======================

socket.on(
"donKill",
()=>{


    showButtons(
        "donKill"
    );


});




// ======================
// Дон выбрал
// ======================

socket.on(
"donKillResult",
slot=>{


    showMessage(
        `Игрок номер ${slot} будет убит`,
        "donKill"
    );


});



// ======================
// Дон проверка
// ======================

socket.on(
"donCheck",
()=>{


    showButtons(
        "donCheck"
    );


});



socket.on(
"donCheckResult",
data=>{


    if(data.sheriff){

        showMessage(
            "Шериф",
            "red"
        );

    }
    else{

        showMessage(
            "Не шериф",
            "black"
        );

    }


});




// ======================
// Шериф
// ======================

socket.on(
"sheriffAction",
()=>{


    showButtons(
        "sheriffCheck"
    );


});



socket.on(
"sheriffResult",
data=>{


    if(data.mafia){

        showMessage(
            "МАФИЯ",
            "red"
        );

    }
    else{

        showMessage(
            "МИРНЫЙ",
            "black"
        );

    }


});




// ======================
// Кнопки игроков
// ======================

function showButtons(action){


    if(!actionBox)
        return;



    actionBox.innerHTML="";



    for(let i=1;i<=10;i++){


        const btn =
            document.createElement("button");


        btn.innerText=i;



        btn.onclick=()=>{


            socket.emit(
                action,
                i
            );


            actionBox.innerHTML="";


        };



        actionBox.appendChild(btn);


    }


}



// ======================
// Сообщение
// ======================

function showMessage(text,color){


    if(!actionBox)
        return;



    actionBox.innerHTML=
    `

    <h2 style="color:${color || "black"}">
    ${text}
    </h2>

    <button id="okBtn">
    Понятно
    </button>

    `;



    document
    .getElementById("okBtn")
    .onclick=()=>{


        actionBox.innerHTML="";


    };


}



// ======================
// Смерть
// ======================

socket.on(
"youAreDead",
()=>{


    alert(
        "Вы убиты этой ночью!"
    );


});



// ======================
// День
// ======================

socket.on(
"dayResult",
data=>{


    console.log(
        "Убит игрок:",
        data.killed
    );


});



// ======================
// Конец игры
// ======================

socket.on("gameResults", results => {

    if(!isAdmin) return;


    let text = "🎭 Результаты игры:\n\n";


    results.forEach(player => {

        text += 
        `${player.slot}. ${player.name} — ${player.role}\n`;

    });


    alert(text);


});

socket.on(
"mafiaTimer",
seconds=>{


    if(!timer)
        return;



    timer.style.display="block";


    let time=seconds;



    timer.innerText=time;



    const interval=setInterval(()=>{


        time--;


        timer.innerText=time;



        if(time<=0){

            clearInterval(interval);

            timer.innerText="";

        }


    },1000);


});


socket.on(
"gameEnded",
()=>{


    roleBox.innerHTML="";


    actionBox.innerHTML="";


    voiceText.innerHTML="";


});



// ======================
// Enter
// ======================

if(nameInput){

nameInput.addEventListener(
"keypress",
e=>{

    if(e.key==="Enter"){

        joinBtn.click();

    }

});

}