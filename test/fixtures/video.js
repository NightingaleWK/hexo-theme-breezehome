// Original, silent fixture generated locally; no camera or microphone access.
(async () => {
  const status = document.querySelector('#video-status');
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 240;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    let frame = 0;
    const draw = setInterval(() => {
      context.fillStyle = '#386651'; context.fillRect(0, 0, 640, 240);
      context.fillStyle = '#fafaf8'; context.fillRect((frame++ * 8) % 560, 80, 80, 80);
    }, 66);
    recorder.start();
    await new Promise(resolve => setTimeout(resolve, 3000));
    recorder.stop(); await stopped;
    clearInterval(draw); stream.getTracks().forEach(track => track.stop());
    document.querySelector('#playback-fixture').src = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    status.textContent = '三秒原创视频已就绪，可播放、暂停和拖动进度。';
  } catch (error) { status.textContent = `测试视频生成失败：${error.message}`; }
})();
