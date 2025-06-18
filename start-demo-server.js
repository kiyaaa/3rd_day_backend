const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 8080;

// 정적 파일 제공
app.use(express.static(path.join(__dirname)));

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'demo-web-ui.html'));
});

// 백엔드 서버 시작
console.log('🚀 백엔드 서버 시작 중...');
const backendProcess = spawn('node', ['src/server.js'], {
    cwd: __dirname,
    detached: false,
    stdio: 'inherit'
});

// 데모 웹 서버 시작
app.listen(PORT, () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 연결이(Yeongyul) 데모가 준비되었습니다!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 웹 브라우저에서 다음 주소로 접속하세요:

   http://localhost:${PORT}

💡 사용 방법:
   1. "데모 시작" 버튼을 클릭하여 시작
   2. "사용자 연결" 버튼으로 WebSocket 연결
   3. "채팅 시뮬레이션" 버튼으로 대화 확인
   
   또는 직접 채팅창에 메시지를 입력할 수 있습니다!

🛑 종료하려면 Ctrl+C를 누르세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});

// 종료 처리
process.on('SIGINT', () => {
    console.log('\n🛑 데모 서버를 종료합니다...');
    backendProcess.kill();
    process.exit();
});