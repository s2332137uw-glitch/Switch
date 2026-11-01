
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

const STORAGE_KEY = "taskSwitchingExperiment_autosave_v2";

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

let basePhase = true;
let blockQuestions = [];
let currentSetNumber = null;
let previousTask = null;

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
            currentSetNumber,
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


function clearSavedProgress() {

    localStorage.removeItem(STORAGE_KEY);

}


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

    currentSetNumber = state.currentSetNumber ?? null;

    previousTask = state.previousTask ?? null;
    currentTask = state.currentTask || "";
    currentStimulus = state.currentStimulus ?? "";
    currentAnswer = Boolean(state.currentAnswer);

    questionActive = false;
    waitDeadline = state.waitDeadline || null;

    participantIdInput.value = participantId;

    if (state.currentScreenName === "finish") {

        showScreen(finishScreen);
        downloadButton.style.display = "inline-block";
        return;

    }

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

        startTime = performance.now();

        saveProgress();
        return;

    }

    showScreen(startScreen);
    saveProgress();

}


// =======================
// 条件生成
// =======================

function generateConditions() {

    conditions = [];

    let id = 1;

    for (const mode of modes) {

        for (const time of waitTimes) {

            conditions.push({
                id: id++,
                mode: mode,
                waitTime: time
            });

        }

    }

    conditions = shuffleArray(conditions);

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
// 15セットの固定問題
// =======================

// 各セットの構成
// ・数字課題2問、文字課題2問
// ・YES2問、NO2問
// ・課題の切り替え2回

const taskSwitchingSets = [

    [
        { task: "NUMBER", stimulus: "7", answerYes: true },
        { task: "LETTER", stimulus: "B", answerYes: false },
        { task: "LETTER", stimulus: "A", answerYes: true },
        { task: "NUMBER", stimulus: "4", answerYes: false }
    ],

    [
        { task: "LETTER", stimulus: "E", answerYes: true },
        { task: "NUMBER", stimulus: "8", answerYes: false },
        { task: "NUMBER", stimulus: "3", answerYes: true },
        { task: "LETTER", stimulus: "K", answerYes: false }
    ],

    [
        { task: "NUMBER", stimulus: "5", answerYes: true },
        { task: "LETTER", stimulus: "D", answerYes: false },
        { task: "LETTER", stimulus: "U", answerYes: true },
        { task: "NUMBER", stimulus: "6", answerYes: false }
    ],

    [
        { task: "LETTER", stimulus: "M", answerYes: false },
        { task: "NUMBER", stimulus: "9", answerYes: true },
        { task: "NUMBER", stimulus: "2", answerYes: false },
        { task: "LETTER", stimulus: "I", answerYes: true }
    ],

    [
        { task: "NUMBER", stimulus: "1", answerYes: true },
        { task: "LETTER", stimulus: "F", answerYes: false },
        { task: "LETTER", stimulus: "O", answerYes: true },
        { task: "NUMBER", stimulus: "6", answerYes: false }
    ],

    [
        { task: "LETTER", stimulus: "C", answerYes: false },
        { task: "NUMBER", stimulus: "8", answerYes: false },
        { task: "NUMBER", stimulus: "3", answerYes: true },
        { task: "LETTER", stimulus: "A", answerYes: true }
    ],

    [
        { task: "NUMBER", stimulus: "2", answerYes: false },
        { task: "LETTER", stimulus: "E", answerYes: true },
        { task: "LETTER", stimulus: "T", answerYes: false },
        { task: "NUMBER", stimulus: "5", answerYes: true }
    ],

    [
        { task: "LETTER", stimulus: "I", answerYes: true },
        { task: "NUMBER", stimulus: "4", answerYes: false },
        { task: "NUMBER", stimulus: "7", answerYes: true },
        { task: "LETTER", stimulus: "G", answerYes: false }
    ],

    [
        { task: "NUMBER", stimulus: "9", answerYes: true },
        { task: "LETTER", stimulus: "P", answerYes: false },
        { task: "LETTER", stimulus: "U", answerYes: true },
        { task: "NUMBER", stimulus: "2", answerYes: false }
    ],

    [
        { task: "LETTER", stimulus: "H", answerYes: false },
        { task: "NUMBER", stimulus: "1", answerYes: true },
        { task: "NUMBER", stimulus: "8", answerYes: false },
        { task: "LETTER", stimulus: "O", answerYes: true }
    ],

    [
        { task: "NUMBER", stimulus: "3", answerYes: true },
        { task: "LETTER", stimulus: "L", answerYes: false },
        { task: "LETTER", stimulus: "E", answerYes: true },
        { task: "NUMBER", stimulus: "6", answerYes: false }
    ],

    [
        { task: "LETTER", stimulus: "A", answerYes: true },
        { task: "NUMBER", stimulus: "8", answerYes: false },
        { task: "NUMBER", stimulus: "5", answerYes: true },
        { task: "LETTER", stimulus: "R", answerYes: false }
    ],

    [
        { task: "NUMBER", stimulus: "4", answerYes: false },
        { task: "LETTER", stimulus: "S", answerYes: false },
        { task: "LETTER", stimulus: "U", answerYes: true },
        { task: "NUMBER", stimulus: "7", answerYes: true }
    ],

    [
        { task: "LETTER", stimulus: "N", answerYes: false },
        { task: "NUMBER", stimulus: "3", answerYes: true },
        { task: "NUMBER", stimulus: "8", answerYes: false },
        { task: "LETTER", stimulus: "I", answerYes: true }
    ],

    [
        { task: "NUMBER", stimulus: "5", answerYes: true },
        { task: "LETTER", stimulus: "B", answerYes: false },
        { task: "LETTER", stimulus: "A", answerYes: true },
        { task: "NUMBER", stimulus: "2", answerYes: false }
    ]

];


// =======================
// 問題セットの構成チェック
// =======================

function validateTaskSwitchingSets() {

    if (taskSwitchingSets.length !== 15) {
        throw new Error("問題セットは15セット必要です。");
    }

    taskSwitchingSets.forEach((set, index) => {

        const numberCount =
            set.filter(q => q.task === "NUMBER").length;

        const letterCount =
            set.filter(q => q.task === "LETTER").length;

        const yesCount =
            set.filter(q => q.answerYes === true).length;

        const noCount =
            set.filter(q => q.answerYes === false).length;

        const switchCount =
            set.slice(1).filter(
                (q, i) => q.task !== set[i].task
            ).length;

        if (
            set.length !== 4 ||
            numberCount !== 2 ||
            letterCount !== 2 ||
            yesCount !== 2 ||
            noCount !== 2 ||
            switchCount !== 2
        ) {

            throw new Error(
                `問題セット${index + 1}の構成が条件を満たしていません。`
            );

        }

        set.forEach((q, questionIndex) => {

            const stimulusText = String(q.stimulus);

            const actualYes =
                q.task === "NUMBER"
                    ? Number(stimulusText) % 2 === 1
                    : "AEIOU".includes(stimulusText);

            if (actualYes !== q.answerYes) {

                throw new Error(
                    `問題セット${index + 1}の${questionIndex + 1}問目の正答設定が誤っています。`
                );

            }

        });

    });

}

validateTaskSwitchingSets();


// =======================
// 問題セットの割り当て
// =======================

// 参加者1：条件1→セット1、条件2→セット2 ...
// 参加者2：条件1→セット15、条件2→セット1 ...
// 参加者3：条件1→セット14、条件2→セット15 ...

function getAssignedSetIndex(conditionArrayIndex) {

    const participantNumber = Number(participantId);

    const offset = (participantNumber - 1) % 15;

    return (
        conditionArrayIndex - offset + 15
    ) % 15;

}


// =======================
// 4問分の問題を準備
// =======================

function generateBlockQuestions(setIndex = null) {

    // ベース課題はランダム生成
    if (setIndex === null) {

        const patterns = [
            ["NUMBER", "LETTER", "LETTER", "NUMBER"],
            ["LETTER", "NUMBER", "NUMBER", "LETTER"]
        ];

        const pattern =
            patterns[Math.floor(Math.random() * patterns.length)];

        blockQuestions = [];

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

        currentSetNumber = null;

    } else {

        // 条件課題は固定セットを使用
        blockQuestions =
            taskSwitchingSets[setIndex].map(
                question => ({ ...question })
            );

        currentSetNumber = setIndex + 1;

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

    taskLabel.textContent =
        currentTask === "NUMBER"
            ? "奇数・偶数"
            : "母音・子音";

    // 条件課題では固定刺激を使用
    if (question.stimulus !== undefined) {

        currentStimulus = question.stimulus;

    }

    // ベース課題の数字
    else if (currentTask === "NUMBER") {

        const numbers = currentAnswer
            ? [1, 3, 5, 7, 9]
            : [2, 4, 6, 8];

        currentStimulus = String(
            numbers[Math.floor(Math.random() * numbers.length)]
        );

    }

    // ベース課題のアルファベット
    else {

        const letters = currentAnswer
            ? ["A", "E", "I", "O", "U"]
            : "BCDFGHJKLMNPQRSTVWXYZ".split("");

        currentStimulus =
            letters[Math.floor(Math.random() * letters.length)];

    }

    stimulus.textContent = currentStimulus;

    questionActive = true;

    yesButton.disabled = false;
    noButton.disabled = false;

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

    // 現在の条件を取得
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


    // =======================
    // 表示方法なし
    // =======================

    if (mode === "none") {

        waitLabel.textContent = "お待ちください";

    }


    // =======================
    // 残り時間表示
    // =======================

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


    // =======================
    // 経過時間表示
    // =======================

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


    // =======================
    // 待機終了後の処理
    // =======================

    waitTimeout = setTimeout(() => {

        if (waitInterval !== null) {

            clearInterval(waitInterval);
            waitInterval = null;

        }

        waitTimeout = null;
        waitDeadline = null;

        // 現在の条件に対応する問題セットを取得
        const setIndex =
            getAssignedSetIndex(conditionIndex);

        generateBlockQuestions(setIndex);

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
                : conditions[conditionIndex].id,

        conditionOrder:
            basePhase
                ? "base"
                : conditionIndex + 1,

        setNumber:
            basePhase
                ? "base"
                : currentSetNumber,

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
        "response",
        "correct",
        "reactionTime",
        "mode",
        "waitTime",
        "condition",
        "conditionOrder",
        "setNumber",
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

    if (
        !/^\d+$/.test(participantId) ||
        Number(participantId) < 1
    ) {

        alert("参加者番号は1以上の整数で入力してください。");

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

    if (waitTimeout !== null) {
        clearTimeout(waitTimeout);
        waitTimeout = null;
    }

    if (waitInterval !== null) {
        clearInterval(waitInterval);
        waitInterval = null;
    }

    // 結果を初期化
    results = [];

    conditionIndex = 0;
    questionIndex = 0;

    basePhase = true;
    questionActive = false;
    previousTask = null;
    currentSetNumber = null;

    // 条件を生成して順番をシャッフル
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
        "OK：続きから再開する\nキャンセル：保存データを削除して新しく開始する"
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

