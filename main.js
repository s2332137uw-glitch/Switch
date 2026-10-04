// =======================
// 画面
// =======================

const participantScreen =
    document.getElementById("participantScreen");

const participantIdInput =
    document.getElementById("participantId");

const participantNextButton =
    document.getElementById("participantNextButton");

const startButton =
    document.getElementById("startButton");

const startScreen =
    document.getElementById("startScreen");

const questionScreen =
    document.getElementById("questionScreen");

const taskLabel =
    document.getElementById("taskLabel");

const stimulus =
    document.getElementById("stimulus");

const yesButton =
    document.getElementById("yesButton");

const noButton =
    document.getElementById("noButton");

const waitScreen =
    document.getElementById("waitScreen");

const waitLabel =
    document.getElementById("waitLabel");

const finishScreen =
    document.getElementById("finishScreen");

const downloadButton =
    document.getElementById("downloadButton");


// 参加者番号
let participantId = "";


// =======================
// 現在の問題
// =======================

let currentTask = "";
let currentStimulus = "";
let startTime = 0;


// =======================
// 結果保存
// =======================

let results = [];


// =======================
// 実験条件
// =======================

const modes = [
    "none",
    "elapsed",
    "remaining"
];

const waitTimes = [
    0,
    5,
    15,
    25,
    35
];


let conditions = [];

let conditionIndex = 0;

let questionIndex = 0;

const blockSize = 4;

// ベース課題かどうか
let basePhase = true;


// =======================
// 条件生成
// =======================

function generateConditions(){

    conditions = [];

    for(const mode of modes){

        for(const time of waitTimes){

            conditions.push({
                mode: mode,
                waitTime: time
            });

        }

    }


    // シャッフル

    for(let i = conditions.length - 1; i > 0; i--){

        const j =
        Math.floor(Math.random() * (i + 1));

        [conditions[i], conditions[j]] =
        [conditions[j], conditions[i]];

    }

}



// =======================
// 問題作成
// =======================

function generateQuestion(){

    if(Math.random() < 0.5){

        currentTask = "NUMBER";

        currentStimulus =
        Math.floor(Math.random() * 9) + 1;

        taskLabel.textContent =
        "奇数・偶数";


    }else{


        currentTask = "LETTER";

        const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ";


        currentStimulus =
        alphabet[Math.floor(Math.random()*26)];


        taskLabel.textContent =
        "母音・子音";

    }


    stimulus.textContent =
    currentStimulus;


    startTime =
    performance.now();

}



// =======================
// 待機画面
// =======================

function startWaitScreen(){

    // 待機中は保存ボタンを非表示
    downloadButton.style.display = "none";


    // 現在の待機条件を取得
    const currentCondition =
        conditions[conditionIndex];

    const waitTime =
        currentCondition.waitTime;

    const mode =
        currentCondition.mode;


    // 問題画面を消す
    questionScreen.style.display = "none";

    // 待機画面を表示
    waitScreen.style.display = "block";


    // =======================
    // 表示方法
    // =======================

    // 表示なし
    if(mode === "none"){

        waitLabel.textContent =
            "お待ちください";

    }


    // 残り時間
    else if(mode === "remaining"){

        let remain = waitTime;

        waitLabel.textContent =
            "残り時間：" + remain + "秒";


        const timer =
            setInterval(()=>{

                remain--;

                if(remain > 0){

                    waitLabel.textContent =
                        "残り時間：" + remain + "秒";

                }

                if(remain <= 0){

                    clearInterval(timer);

                }

            },1000);

    }


    // 経過時間
    else{

        let elapsed = 0;

        waitLabel.textContent =
            "経過時間：0秒";


        const timer =
            setInterval(()=>{

                elapsed++;

                waitLabel.textContent =
                    "経過時間：" + elapsed + "秒";


                if(elapsed >= waitTime){

                    clearInterval(timer);

                }

            },1000);

    }


        // =======================
    // 待機終了後
    // =======================

    setTimeout(()=>{

        // =======================
        // ベース課題終了後
        // =======================

        if(basePhase){

            basePhase = false;

            questionIndex = 0;

            // 最初の条件を開始
            waitScreen.style.display = "none";

            questionScreen.style.display = "block";

            generateQuestion();

            return;
        }

        // =======================
        // 次の条件が残っている
        // =======================

        if(conditionIndex < conditions.length){

            waitScreen.style.display = "none";

            questionScreen.style.display = "block";

            generateQuestion();

            return;
        }


       // =======================
// 全条件終了
// =======================

waitScreen.style.display = "none";

questionScreen.style.display = "none";

finishScreen.style.display = "block";

    }, waitTime * 1000);

}



// =======================
// 正解判定
// =======================

function checkAnswer(userPressedYes){


    const reactionTime =
    performance.now() - startTime;



    let correctAnswer;



    if(currentTask==="NUMBER"){


        correctAnswer =
        currentStimulus % 2 === 1;


    }else{


        correctAnswer =
        "AEIOU".includes(currentStimulus);


    }



    const correct =
    userPressedYes === correctAnswer;



    results.push({

    phase:
    basePhase ? "base" : "condition",

    task:
    currentTask,

    stimulus:
    currentStimulus,

    correct:
    correct,

    reactionTime:
    reactionTime.toFixed(1),

    mode:
    basePhase ? "none" : conditions[conditionIndex].mode,

    waitTime:
    basePhase ? 0 : conditions[conditionIndex].waitTime,

    condition:
    basePhase ? "base" : conditionIndex

});



    console.log(results);



    questionIndex++;


// =======================
// 4問終わったら
// =======================

if(questionIndex % blockSize === 0){


    // -----------------------
    // ベース課題終了
    // -----------------------

    if(basePhase){

        startWaitScreen();

        return;

    }


    // 条件15終了
if(conditionIndex === conditions.length - 1){

    waitScreen.style.display = "none";

    questionScreen.style.display = "none";

    finishScreen.style.display = "block";

    return;
}


// -----------------------
// 条件1～14終了
// -----------------------
conditionIndex++;
startWaitScreen();

return;

}


// 4問終わっていなければ次の問題
generateQuestion();

}



// =======================
// CSV保存
// =======================

function downloadCSV(){


    let csv =
"participantId,phase,task,stimulus,correct,reactionTime,mode,waitTime,condition\n";



    results.forEach((r)=>{


        ccsv +=
participantId + "," +
r.phase + "," +
r.task + "," +
r.stimulus + "," +
r.correct + "," +
r.reactionTime + "," +
r.mode + "," +
r.waitTime + "," +
r.condition +
"\n";


    });



    const blob =
    new Blob(
        [csv],
        {type:"text/csv"}
    );



    const url =
    URL.createObjectURL(blob);



    const a =
    document.createElement("a");



    a.href=url;


    a.download =
    "experiment_result_" +
    participantId +
    ".csv";


    a.click();


    URL.revokeObjectURL(url);


}



// =======================
// 参加者番号入力
// =======================

participantNextButton.addEventListener("click",()=>{

    // 参加者番号を取得
    participantId =
        participantIdInput.value.trim();

    // 未入力なら次に進まない
    if(participantId === ""){
        alert("参加者番号を入力してください。");
        return;
    }

    // 参加者番号画面を消す
    participantScreen.style.display = "none";

    // 課題説明画面を表示
    startScreen.style.display = "block";

});


// =======================
// 実験開始
// =======================

startButton.addEventListener("click",()=>{

    // 課題説明画面を消す
    startScreen.style.display = "none";

    // 問題画面を表示
    questionScreen.style.display = "block";

    // 条件を作る
    generateConditions();

    // 最初の問題を表示
    generateQuestion();

});



// =======================
// ボタン
// =======================

yesButton.addEventListener("click",()=>{

    checkAnswer(true);

});


noButton.addEventListener("click",()=>{

    checkAnswer(false);

});


downloadButton.addEventListener("click",()=>{

    downloadCSV();

});
