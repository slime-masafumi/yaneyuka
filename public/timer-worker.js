// タイマー用Web Worker
// バックグラウンドで正確に時間を計測する

let targetTime = null;
let intervalId = null;

self.onmessage = function(e) {
  const { type, data } = e.data;

  if (type === 'START') {
    // タイマー開始
    targetTime = data.targetTime;
    
    // 既存のインターバルをクリア
    if (intervalId) {
      clearInterval(intervalId);
    }

    // 100msごとにチェック（精度を高める）
    intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = targetTime - now;

      if (remaining <= 0) {
        // 時間になった
        clearInterval(intervalId);
        self.postMessage({ type: 'ALARM' });
      } else {
        // 残り時間を送信（UI更新用）
        self.postMessage({ 
          type: 'TICK', 
          remaining: Math.max(0, remaining) 
        });
      }
    }, 100);
  } else if (type === 'STOP') {
    // タイマー停止
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    targetTime = null;
    self.postMessage({ type: 'STOPPED' });
  }
};



























