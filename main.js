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

// 自動保存用
// 計算課題とは別の保存領域を使用する
const STORAGE_KEY = "taskSwitchingExperiment_autosave_v1";

let waitDeadline = null;
let currentScreenName = "participant";


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

// 直前に実施した課題
let previousTask = null;

// 待機タイマー
let waitTimeout = null;
let waitInterval = null;


// =======================
// 画面表示
// =======================

function showScreen(screen) {

    if (screen === participantScreen) {
        currentScreenName = "participant";
    } else if (screen === startScreen) {
        currentScreenName = "start";
    } else if (screen === questionScreen) {
        currentScreenName = "question";
    } else if (screen === waitScreen) {
        currentScreenName = "wait";
    } else if (screen === finishScreen) {
        currentScreenName = "finish";
    }

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
// 自動保存・再開
// =======================

// 現在の実験状態を保存する
function saveProgress() {

    try {

        const state = {
            participantId,
            results,
            conditions,
            conditionIndex,
            questionIndex,
            basePhase,
blockQuestions,
previousTask,
currentTask,
            currentStimulus,
            currentAnswer,
            questionActive,
            currentScreenName,
            waitDeadline,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.error(
            "実験データの自動保存に失敗しました。",
            error
        );

    }

}


// 保存データを読み込む
function getSavedProgress() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        return saved ? JSON.parse(saved) : null;

    } catch (error) {

        console.error(
            "保存データを読み込めませんでした。",
            error
        );

        return null;

    }

}


// 保存データを削除する
function clearSavedProgress() {

    localStorage.removeItem(STORAGE_KEY);

}


// 保存データから実験を再開する
function restoreProgress(state) {

    participantId = state.participantId || "";

    results = Array.isArray(state.results)
        ? state.results
        : [];

    conditions = Array.isArray(state.conditions)
        ? state.conditions
        : [];

    conditionIndex = Number.isInteger(state.conditionIndex)
        ? state.conditionIndex
        : 0;

    questionIndex = Number.isInteger(state.questionIndex)
        ? state.questionIndex
        : 0;

    basePhase = state.basePhase !== false;

    blockQuestions = Array.isArray(state.blockQuestions)
    ? state.blockQuestions
    : [];

previousTask = state.previousTask ?? null;
    currentTask = state.currentTask || "";

    currentStimulus = state.currentStimulus ?? "";

    currentAnswer = Boolean(state.currentAnswer);

    // 再読み込み後は回答受付をいったん無効にする
    questionActive = false;

    waitDeadline = state.waitDeadline || null;

    participantIdInput.value = participantId;


    // 実験が終了していた場合
    if (state.currentScreenName === "finish") {

        showScreen(finishScreen);

        downloadButton.style.display = "inline-block";

        return;

    }


    // 待機中だった場合
    if (
        state.currentScreenName === "wait" &&
        waitDeadline &&
        conditions[conditionIndex]
    ) {

        const remainingMs = Math.max(
            0,
            waitDeadline - Date.now()
        );

        startWaitScreen(remainingMs);

        return;

    }


    // 問題の途中だった場合
    if (
        state.currentScreenName === "question" &&
        blockQuestions.length > 0 &&
        questionIndex < blockQuestions.length
    ) {

        taskLabel.textContent =
            currentTask === "NUMBER"
                ? "奇数・偶数"
                : "母音・子音";

        stimulus.textContent = currentStimulus;

        showScreen(questionScreen);

        questionActive = true;

        yesButton.disabled = false;
        noButton.disabled = false;

        // 再開後は反応時間を再計測する
        startTime = performance.now();

        saveProgress();

        return;

    }


    // その他の場合は開始画面へ
    showScreen(startScreen);

    saveProgress();

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

        const j = Math.floor(
            Math.random() * (i + 1)
        );

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

        const j = Math.floor(
            Math.random() * (i + 1)
        );

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
        patterns[
            Math.floor(Math.random() * patterns.length)
        ];

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

    saveProgress();

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
                    Math.floor(
                        Math.random() * oddNumbers.length
                    )
                ];

        } else {

            currentStimulus =
                evenNumbers[
                    Math.floor(
                        Math.random() * evenNumbers.length
                    )
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
                vowels[
                    Math.floor(
                        Math.random() * vowels.length
                    )
                ];

        } else {

            currentStimulus =
                consonants[
                    Math.floor(
                        Math.random() * consonants.length
                    )
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

    saveProgress();

}


// =======================
// 待機画面
// =======================

function startWaitScreen(remainingMs = null) {

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

    if (!currentCondition) {
        return;
    }

    const waitTime = currentCondition.waitTime;
    const mode = currentCondition.mode;

    const totalWaitMs = waitTime * 1000;

    const actualRemainingMs =
        remainingMs === null
            ? totalWaitMs
            : Math.max(0, remainingMs);

    waitDeadline = Date.now() + actualRemainingMs;

    showScreen(waitScreen);

    saveProgress();


    // 表示方法なし
    if (mode === "none") {

        waitLabel.textContent = "お待ちください";

    }


    // 残り時間表示
    else if (mode === "remaining") {

        const updateRemaining = () => {

            const remain = Math.max(
                0,
                Math.ceil(
                    (waitDeadline - Date.now()) / 1000
                )
            );

            waitLabel.textContent =
                "残り時間：" + remain + "秒";

        };

        updateRemaining();

        waitInterval = setInterval(
            updateRemaining,
            100
        );

    }


    // 経過時間表示
    else if (mode === "elapsed") {

        const updateElapsed = () => {

            const elapsedSeconds = Math.max(
                0,
                Math.floor(
                    (
                        totalWaitMs -
                        Math.max(
                            0,
                            waitDeadline - Date.now()
                        )
                    ) / 1000
                )
            );

            waitLabel.textContent =
                "経過時間：" +
                Math.min(waitTime, elapsedSeconds) +
                "秒";

        };

        updateElapsed();

        waitInterval = setInterval(
            updateElapsed,
            100
        );

    }


    // 待機終了後の処理
    waitTimeout = setTimeout(() => {

        if (waitInterval !== null) {

            clearInterval(waitInterval);

            waitInterval = null;

        }

        waitTimeout = null;
        waitDeadline = null;

        // 次の4問を準備
        generateBlockQuestions();

        showScreen(questionScreen);

        generateQuestion();

        saveProgress();

    }, actualRemainingMs);

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
        basePhase
            ? "none"
            : conditions[conditionIndex].mode;

    const waitTime =
        basePhase
            ? 0
            : conditions[conditionIndex].waitTime;

    // 直前の課題と今回の課題を比較
const previousTaskForResult = previousTask;

const switchOccurred =
    previousTaskForResult !== null &&
    previousTaskForResult !== currentTask;


    // 実験結果を記録
    results.push({

        participantId: participantId,

        phase: phase,

        task: currentTask,

        stimulus: currentStimulus,

        response: userPressedYes ? "YES" : "NO",

        correct: correct,

        reactionTime: reactionTime.toFixed(1),

        mode: mode,

        waitTime: waitTime,

        condition:
            basePhase
                ? "base"
                : conditionIndex + 1,

        questionNumber: questionIndex + 1,

        previousTask: previousTaskForResult,

        taskSwitch: switchOccurred

    });

    previousTask = currentTask;
    console.log(results[results.length - 1]);

    // 次の問題番号へ進む
    questionIndex++;

    // 回答直後に自動保存
    saveProgress();


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

            saveProgress();

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
    "response",       // 追加
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


    let csv =
        headers.map(escapeCSV).join(",") + "\r\n";


    results.forEach(result => {

        const row = headers.map(header => {

            return escapeCSV(result[header]);

        });

        csv += row.join(",") + "\r\n";

    });


    // Excelで日本語が文字化けしにくいようBOMを付ける
    const blob = new Blob(
        ["\uFEFF" + csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =
        "task_switching_result_" +
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

    saveProgress();

});


// =======================
// 実験開始
// =======================

startButton.addEventListener("click", () => {

    // 新しく開始する場合は以前の保存データを消す
    clearSavedProgress();

    waitDeadline = null;

    // 結果を初期化
    results = [];

    conditionIndex = 0;
    questionIndex = 0;

    basePhase = true;
questionActive = false;
previousTask = null;

generateConditions();

    // ベース課題の4問を準備
    generateBlockQuestions();

    showScreen(questionScreen);

    generateQuestion();

    saveProgress();

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
// 起動時に保存データがあれば再開を確認
// =======================

window.addEventListener("load", () => {

    const saved = getSavedProgress();

    if (
        !saved ||
        !saved.participantId ||
        !Array.isArray(saved.results)
    ) {

        return;

    }

    const shouldResume = confirm(
        "前回のタスクスイッチング実験の保存データがあります。\n" +
        "参加者番号：" + saved.participantId + "\n" +
        "保存済み回答数：" + saved.results.length + "問\n\n" +
        "OK：続きから再開する\n" +
        "キャンセル：保存データを削除して新しく開始する"
    );

    if (shouldResume) {

        restoreProgress(saved);

    } else {

        clearSavedProgress();

        showScreen(participantScreen);

    }

});


// =======================
// CSVダウンロードボタン
// =======================

downloadButton.addEventListener("click", () => {

    downloadCSV();

});
