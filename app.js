document.addEventListener('deviceready', function () {
    const statusElement = document.getElementById('status');
    const yesterdayElement = document.getElementById('yesterday');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');

    let measurementInterval = null;
    let scores = [];
    let errorSeconds = 0;
    let totalMeasurementTime = 0;
    const storageKey = 'posture_scores';
    const measurementDuration = 60 * 1000; // 1分間（60秒）

    // 昨日のスコアを表示
    function showYesterdayScore() {
        const savedData = JSON.parse(localStorage.getItem(storageKey));
        if (savedData && savedData.date === getYesterdayDate()) {
            yesterdayElement.textContent = `前日のスコア: ${savedData.score}%`;
        } else {
            yesterdayElement.textContent = "前日のスコア: データなし";
        }
    }

    // 現在の日付を取得
    function getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // 昨日の日付を取得
    function getYesterdayDate() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // iOS用の加速度センサー許可リクエスト
    function requestPermissionAndStart() {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        startMeasurement();
                    } else {
                        alert('加速度センサーの使用が許可されませんでした。');
                        statusElement.textContent = "計測不可: 権限がありません";
                    }
                })
                .catch(error => {
                    console.error('許可リクエストエラー:', error);
                    statusElement.textContent = "計測不可: 権限リクエストエラー";
                });
        } else {
            // 権限リクエストが不要な環境の場合
            startMeasurement();
        }
    }

    // 計測を開始
    function startMeasurement() {
        scores = [];
        errorSeconds = 0;
        totalMeasurementTime = 0;
        startButton.disabled = true;
        stopButton.disabled = false;
        statusElement.textContent = "計測中...";

        // 加速度センサーのデータ取得
        measurementInterval = setInterval(() => {
            totalMeasurementTime++;

            try {
                if ('DeviceMotionEvent' in window) {
                    window.addEventListener('devicemotion', event => {
                        const acceleration = event.accelerationIncludingGravity;
                        if (acceleration) {
                            const { x, y, z } = acceleration;
                            const magnitude = Math.sqrt(x * x + y * y + z * z);

                            // z軸の比率で垂直度を計算
                            const verticalPercentage = Math.abs(z / magnitude) * 100;
                            const roundedPercentage = Math.round(verticalPercentage);
                            scores.push(roundedPercentage);
                            statusElement.textContent = `計測中: 現在のスコア ${roundedPercentage}%`;
                        } else {
                            throw new Error('加速度データなし');
                        }
                    });
                } else {
                    throw new Error('加速度センサーが使用できません');
                }
            } catch (error) {
                errorSeconds++;
                console.warn('加速度センサーのデータ取得エラー: ', error);
                statusElement.textContent = "計測不可: センサーデータエラー";
            }
        }, 1000); // 毎秒データ取得
    }

    // 計測を停止
    function stopMeasurement() {
        clearInterval(measurementInterval);
        startButton.disabled = false;
        stopButton.disabled = true;

        // 平均スコアを計算して保存
        const validScores = scores.length > 0 ? scores : [0]; // 計測できなかった場合に0を扱う
        const averageScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);

        const successSeconds = totalMeasurementTime - errorSeconds;

        localStorage.setItem(storageKey, JSON.stringify({
            date: getTodayDate(),
            score: averageScore
        }));

        alert(`計測結果:\n平均スコア: ${averageScore}%\n計測成功時間: ${successSeconds}秒\n計測エラー時間: ${errorSeconds}秒\n合計計測時間: ${totalMeasurementTime}秒`);
        statusElement.textContent = `計測終了。\n平均スコア: ${averageScore}%\n計測成功時間: ${successSeconds}秒\n計測エラー時間: ${errorSeconds}秒\n合計計測時間: ${totalMeasurementTime}秒`;
    }

    // イベントリスナー設定
    startButton.addEventListener('click', requestPermissionAndStart);
    stopButton.addEventListener('click', stopMeasurement);

    // アプリ起動時に昨日のスコアを表示
    showYesterdayScore();
});
