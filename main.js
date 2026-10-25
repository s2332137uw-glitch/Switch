// =======================
 // 画面の取得
 // =======================

const participantScreen = document.getElementById("participantScreen");
const participantIdInput = document.getElementById("participantId");
const participantNextButton = document.getElementById("participantNextButton");

const startButton = document.getElementById("startButton");
const startScreen = document.getElementById("startScreen");

const questionScreen = document.getElementById("questionScreen");
const taskLabel = document.getElementById("taskLabel");
const stimulus = document.getElementById("stimulus");

const yesButton = document.getElementById("yesButton");
const noButton = document.getElementById("noButton");

const waitScreen = document.getElementById("waitScreen");
const waitLabel = document.getElementById("waitLabel");

const finishScreen = document.getElementById("finishScreen");
const downloadButton = document.getElementById("downloadButton");


// =======================
// 参加者情報
// =======================

let participantId = "";


// =======================
// 現在の問題
// =======================

let currentTask = "";
let currentStimulus = "";
let currentAnswer = false;
let startTime = 0;
let questionActive = false;


// =======================
// 実験結果
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

const blockSize = 4;

let conditions = [];
let conditionIndex = 0;
let questionIndex = 0;

// true：ベース課題
// false：条件課題
let basePhase = true;

// 現在の4問分の問題リスト
let blockQuestions = [];

// 待機タイマー
let waitTimeout = null;
let waitInterval = null;


// =======================
// 画面表示
// =======================

function showScreen(screen) {

    const screens = [
        participantScreen,
        startScreen,
        questionScreen,
        waitScreen,
        finishScreen
    ];

    screens.forEach(element => {
        if (element) {
            element.style.display = "none";
        }
    });

    screen.style.display = "block";
}


// =======================
// 条件生成
// =======================

function generateConditions() {

    conditions = [];

    for (const mode of modes) {

        for (const time of waitTimes) {

            conditions.push({
                mode: mode,
                waitTime: time
            });

        }

    }

    // 条件の順番をランダムにする
    for (let i = conditions.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [conditions[i], conditions[j]] =
            [conditions[j], conditions[i]];

    }

}


// =======================
// 配列をシャッフル
// =======================

function shuffleArray(array) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];

    }

    return shuffled;
}


// =======================
// 4問分の問題を作成
// =======================

function generateBlockQuestions() {

    // 数字2問・文字2問。
    // どちらも切り替え回数が2回になる並び。
    const patterns = [
        ["NUMBER", "LETTER", "LETTER", "NUMBER"],
        ["LETTER", "NUMBER", "NUMBER", "LETTER"]
    ];

    const pattern =
        patterns[Math.floor(Math.random() * patterns.length)];

    blockQuestions = [];

    // 各課題についてYESとNOを1問ずつ用意
    const answersByTask = {
        NUMBER: shuffleArray([true, false]),
        LETTER: shuffleArray([true, false])
    };

    const taskCounters = {
        NUMBER: 0,
        LETTER: 0
    };

    for (const task of pattern) {

        const answerYes =
            answersByTask[task][taskCounters[task]];

        taskCounters[task]++;

        blockQuestions.push({
            task: task,
            answerYes: answerYes
        });

    }

    questionIndex = 0;

}


// =======================
// 問題を表示
// =======================

function generateQuestion() {

    if (questionIndex >= blockQuestions.length) {
        return;
    }

    const question = blockQuestions[questionIndex];

    currentTask = question.task;
    currentAnswer = question.answerYes;

    // 数字課題
    if (currentTask === "NUMBER") {

        taskLabel.textContent = "奇数・偶数";

        const oddNumbers = [1, 3, 5, 7, 9];
        const evenNumbers = [2, 4, 6, 8];

        if (currentAnswer) {

            currentStimulus =
                oddNumbers[
                    Math.floor(Math.random() * oddNumbers.length)
                ];

        } else {

            currentStimulus =
                evenNumbers[
                    Math.floor(Math.random() * evenNumbers.length)
                ];

        }

    }

    // 文字課題
    else {

        taskLabel.textContent = "母音・子音";

        const vowels = ["A", "E", "I", "O", "U"];

        const consonants =
            "BCDFGHJKLMNPQRSTVWXYZ".split("");

        if (currentAnswer) {

            currentStimulus =
                vowels[Math.floor(Math.random() * vowels.length)];

        } else {

            currentStimulus =
                consonants[
                    Math.floor(Math.random() * consonants.length)
                ];

        }

    }

    stimulus.textContent = currentStimulus;

    // 回答受付開始
    questionActive = true;

    yesButton.disabled = false;
    noButton.disabled = false;

    // 反応時間の計測開始
    startTime = performance.now();

}


// =======================
// 待機画面
// =======================

function startWaitScreen() {

    questionActive = false;

    yesButton.disabled = true;
    noButton.disabled = true;

    // 前のタイマーが残っていた場合は解除
    if (waitTimeout !== null) {
        clearTimeout(waitTimeout);
        waitTimeout = null;
    }

    if (waitInterval !== null) {
        clearInterval(waitInterval);
        waitInterval = null;
    }

    // 現在の条件の待機時間と表示方法
    const currentCondition = conditions[conditionIndex];

    const waitTime = currentCondition.waitTime;
    const mode = currentCondition.mode;

    showScreen(waitScreen);

    // 表示方法なし
    if (mode === "none") {

        waitLabel.textContent = "お待ちください";

    }

    // 残り時間表示
    else if (mode === "remaining") {

        const updateRemaining = () => {

            const elapsedSeconds =
                (performance.now() - waitStartTime) / 1000;

            const remain = Math.max(
                0,
                Math.ceil(waitTime - elapsedSeconds)
            );

            waitLabel.textContent =
                "残り時間：" + remain + "秒";

        };

        var waitStartTime = performance.now();

        updateRemaining();

        waitInterval = setInterval(updateRemaining, 100);

    }

    // 経過時間表示
    else if (mode === "elapsed") {

        const waitStartTime = performance.now();

        const updateElapsed = () => {

            const elapsedSeconds = Math.floor(
                (performance.now() - waitStartTime) / 1000
            );

            waitLabel.textContent =
                "経過時間：" +
                Math.min(waitTime, elapsedSeconds) +
                "秒";

        };

        updateElapsed();

        waitInterval = setInterval(updateElapsed, 100);

    }

    // 待機終了後の処理
    waitTimeout = setTimeout(() => {

        if (waitInterval !== null) {
            clearInterval(waitInterval);
            waitInterval = null;
        }

        waitTimeout = null;

        // 次の4問を準備
        generateBlockQuestions();

        showScreen(questionScreen);

        generateQuestion();

    }, waitTime * 1000);

}


// =======================
// 回答判定・記録
// =======================

function checkAnswer(userPressedYes) {

    // 二重回答を防止
    if (!questionActive) {
        return;
    }

    questionActive = false;

    yesButton.disabled = true;
    noButton.disabled = true;

    const reactionTime =
        performance.now() - startTime;

    const correct =
        userPressedYes === currentAnswer;

    const phase =
        basePhase ? "base" : "condition";

    const mode =
        basePhase ? "none" : conditions[conditionIndex].mode;

    const waitTime =
        basePhase ? 0 : conditions[conditionIndex].waitTime;

    const previousQuestion =
        questionIndex > 0
            ? blockQuestions[questionIndex - 1]
            : null;

    const switchOccurred =
        previousQuestion !== null &&
        previousQuestion.task !== currentTask;

    results.push({

        participantId: participantId,

        phase: phase,

        task: currentTask,

        stimulus: currentStimulus,

        correct: correct,

        reactionTime: reactionTime.toFixed(1),

        mode: mode,

        waitTime: waitTime,

        condition: basePhase ? "base" : conditionIndex + 1,

        questionNumber: questionIndex + 1,

        previousTask:
            previousQuestion ? previousQuestion.task : "",

        taskSwitch: switchOccurred

    });

    console.log(results[results.length - 1]);

    questionIndex++;

    // =======================
    // 4問終了後
    // =======================

    if (questionIndex >= blockSize) {

        // ベース課題終了
        if (basePhase) {

            basePhase = false;

            conditionIndex = 0;

            // 条件1の待機を開始
            startWaitScreen();

            return;

        }

        // 最後の条件終了
        if (conditionIndex === conditions.length - 1) {

            questionActive = false;

            showScreen(finishScreen);

            downloadButton.style.display = "inline-block";

            return;

        }

        // 次の条件へ
        conditionIndex++;

        startWaitScreen();

        return;

    }

    // 4問未満なら次の問題
    generateQuestion();

}


// =======================
// CSV保存
// =======================

function downloadCSV() {

    if (results.length === 0) {

        alert("保存する実験結果がありません。");

        return;

    }

    const headers = [
        "participantId",
        "phase",
        "task",
        "stimulus",
        "correct",
        "reactionTime",
        "mode",
        "waitTime",
        "condition",
        "questionNumber",
        "previousTask",
        "taskSwitch"
    ];

    // CSV内のカンマ・引用符・改行に対応
    function escapeCSV(value) {

        const text = String(value ?? "");

        return '"' + text.replace(/"/g, '""') + '"';

    }

    let csv = headers.map(escapeCSV).join(",") + "\r\n";

    results.forEach(result => {

        const row = headers.map(header => {
            return escapeCSV(result[header]);
        });

        csv += row.join(",") + "\r\n";

    });

    // Excelで日本語が文字化けしにくいようBOMを付ける
    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =
        "experiment_result_" +
        participantId.replace(/[\\/:*?"<>|]/g, "_") +
        ".csv";

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);

}


// =======================
// 参加者番号入力
// =======================

participantNextButton.addEventListener("click", () => {

    participantId =
        participantIdInput.value.trim();

    if (participantId === "") {

        alert("参加者番号を入力してください。");

        return;

    }

    showScreen(startScreen);

});


// =======================
// 実験開始
// =======================

startButton.addEventListener("click", () => {

    // 結果を初期化
    results = [];

    conditionIndex = 0;
    questionIndex = 0;

    basePhase = true;
    questionActive = false;

    generateConditions();

    // ベース課題の4問を準備
    generateBlockQuestions();

    showScreen(questionScreen);

    generateQuestion();

});


// =======================
// 回答ボタン
// =======================

yesButton.addEventListener("click", () => {

    checkAnswer(true);

});

noButton.addEventListener("click", () => {

    checkAnswer(false);

});


// =======================
// CSVダウンロードボタン
// =======================

downloadButton.addEventListener("click", () => {

    downloadCSV();

});
