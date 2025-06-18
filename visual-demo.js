const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3004/api';
const WS_URL = 'http://localhost:3004';

// ANSI 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgYellow: '\x1b[43m',
  bgGreen: '\x1b[42m',
  bgMagenta: '\x1b[45m'
};

// 화면 지우기
function clearScreen() {
  console.clear();
}

// 구분선 출력
function printDivider(char = '=', length = 60) {
  console.log(char.repeat(length));
}

// 헤더 출력
function printHeader(title) {
  clearScreen();
  console.log(`${colors.bgBlue}${colors.white}${colors.bright}`);
  printDivider(' ');
  console.log(`  🚀 연결이(Yeongyul) - ${title}`.padEnd(60));
  printDivider(' ');
  console.log(colors.reset);
  console.log();
}

// 메시지 박스 출력
function printBox(title, content, color = colors.cyan) {
  console.log(`${color}┌─ ${title} ${'─'.repeat(50 - title.length)}┐${colors.reset}`);
  const lines = content.split('\n');
  lines.forEach(line => {
    console.log(`${color}│${colors.reset} ${line.padEnd(52)} ${color}│${colors.reset}`);
  });
  console.log(`${color}└${'─'.repeat(54)}┘${colors.reset}`);
  console.log();
}

// 채팅 메시지 출력
function printChatMessage(sender, message, time, isMe = false) {
  const timeStr = new Date(time).toLocaleTimeString('ko-KR');
  
  if (isMe) {
    // 내 메시지 (오른쪽 정렬)
    console.log(`${' '.repeat(30)}${colors.bgGreen}${colors.white} ${sender} ${colors.reset}`);
    console.log(`${' '.repeat(30)}${colors.green}${message}${colors.reset}`);
    console.log(`${' '.repeat(30)}${colors.dim}${timeStr}${colors.reset}`);
  } else {
    // 다른 사람 메시지 (왼쪽 정렬)
    console.log(`${colors.bgBlue}${colors.white} ${sender} ${colors.reset}`);
    console.log(`${colors.blue}${message}${colors.reset}`);
    console.log(`${colors.dim}${timeStr}${colors.reset}`);
  }
  console.log();
}

// 진행 상황 출력
function printProgress(step, total, message) {
  const progress = Math.round((step / total) * 20);
  const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
  console.log(`\n${colors.yellow}[${bar}] ${step}/${total} - ${message}${colors.reset}`);
}

// 지연 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 타이핑 효과
async function typeEffect(text, delayMs = 50) {
  for (const char of text) {
    process.stdout.write(char);
    await delay(delayMs);
  }
  console.log();
}

// 데모 데이터
const users = {
  alex: { email: 'visual_alex@test.com', password: 'pass123', name: 'Alex Kim', role: 'user' },
  sarah: { email: 'visual_sarah@test.com', password: 'pass123', name: 'Sarah Lee', role: 'expert' },
  mike: { email: 'visual_mike@test.com', password: 'pass123', name: 'Mike Park', role: 'expert' }
};

let tokens = {};
let sockets = {};

// 메인 데모
async function runVisualDemo() {
  try {
    // 1. 서비스 소개
    printHeader('서비스 소개');
    await typeEffect(`${colors.bright}연결이(Yeongyul)는 질문자와 전문가를 실시간으로 매칭하는 지식 공유 플랫폼입니다.${colors.reset}`);
    await delay(2000);
    await typeEffect(`\n${colors.cyan}주요 기능:${colors.reset}
• AI 기반 전문가 매칭 (RAG 시스템)
• 실시간 그룹 채팅
• 다중 전문가 협업 답변`);
    await delay(3000);

    // 2. 시나리오 소개
    printHeader('시연 시나리오');
    printBox('등장 인물', `👤 Alex Kim - React 개발자 (질문자)
👩‍💻 Sarah Lee - React 전문가
👨‍💻 Mike Park - 성능 최적화 전문가`);
    await delay(2000);
    
    printBox('시나리오', `Alex는 React useEffect의 무한 루프 문제로 고민중입니다.
연결이를 통해 전문가들의 도움을 받고자 합니다.`);
    await delay(3000);

    // 3. 사용자 등록 및 로그인
    printHeader('사용자 등록 및 로그인');
    printProgress(1, 8, '사용자 계정 생성 중...');
    
    for (const [key, user] of Object.entries(users)) {
      try {
        await axios.post(`${API_URL}/auth/register`, user);
        console.log(`${colors.green}✓${colors.reset} ${user.name} 계정 생성 완료`);
      } catch (e) {
        console.log(`${colors.yellow}ℹ${colors.reset} ${user.name} 기존 계정 사용`);
      }
      
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: user.email,
        password: user.password
      });
      tokens[key] = loginRes.data.token;
      await delay(500);
    }
    
    await delay(2000);

    // 4. WebSocket 연결
    printHeader('실시간 연결 설정');
    printProgress(2, 8, 'WebSocket 연결 중...');
    
    for (const [key, user] of Object.entries(users)) {
      const socket = io(WS_URL, { auth: { token: tokens[key] } });
      sockets[key] = socket;
      
      socket.on('connect', () => {
        console.log(`${colors.green}✓${colors.reset} ${user.name} 연결됨`);
      });
      
      await delay(500);
    }
    
    await delay(2000);

    // 5. Alex의 질문 등록
    printHeader('질문 등록');
    printProgress(3, 8, 'Alex가 질문을 등록합니다...');
    
    printBox('Alex의 질문', `제목: React useEffect 무한 루프 문제
내용: useEffect 안에서 state를 업데이트하면 
      무한 루프가 발생합니다. 어떻게 해결해야 하나요?
카테고리: React
긴급도: 높음`, colors.yellow);
    
    const questionRes = await axios.post(`${API_URL}/questions`, {
      title: 'React useEffect 무한 루프 문제',
      content: 'useEffect 안에서 state를 업데이트하면 무한 루프가 발생합니다. 어떻게 해결해야 하나요?',
      category: 'React',
      urgency: 'high'
    }, {
      headers: { Authorization: `Bearer ${tokens.alex}` }
    });
    
    const questionId = questionRes.data.question.id;
    await delay(2000);

    // 6. AI 매칭 시뮬레이션
    printHeader('AI 전문가 매칭');
    printProgress(4, 8, 'AI가 질문을 분석하고 전문가를 찾습니다...');
    
    console.log(`\n${colors.cyan}🤖 AI 분석 중...${colors.reset}`);
    await delay(1000);
    console.log('• 질문 키워드: useEffect, state, 무한 루프');
    await delay(1000);
    console.log('• 필요 전문성: React Hooks, 상태 관리');
    await delay(1000);
    console.log('• 매칭된 전문가: Sarah Lee (React), Mike Park (최적화)');
    
    // 질문 상태 업데이트
    await axios.put(`${API_URL}/questions/${questionId}`, {
      status: 'matched'
    }, {
      headers: { Authorization: `Bearer ${tokens.alex}` }
    });
    
    await delay(2000);

    // 7. 채팅방 생성
    printHeader('채팅방 생성');
    printProgress(5, 8, '실시간 채팅방을 생성합니다...');
    
    const chatRoomRes = await axios.post(`${API_URL}/chat/rooms`, {
      questionId
    }, {
      headers: { Authorization: `Bearer ${tokens.alex}` }
    });
    
    const roomId = chatRoomRes.data.chatRoom.id;
    console.log(`\n${colors.green}✓${colors.reset} 채팅방이 생성되었습니다 (ID: ${roomId})`);
    
    // 모든 사용자 채팅방 입장
    for (const [key, user] of Object.entries(users)) {
      sockets[key].emit('join_room', { roomId });
      await delay(500);
    }
    
    await delay(2000);

    // 8. 실시간 채팅 시뮬레이션
    printHeader('실시간 문제 해결');
    printProgress(6, 8, '전문가들과 실시간으로 대화합니다...');
    await delay(2000);
    
    clearScreen();
    console.log(`${colors.bgMagenta}${colors.white}${colors.bright} 💬 연결이 채팅방 - React useEffect 문제 ${colors.reset}\n`);
    
    // 메시지 리스너 설정
    Object.entries(sockets).forEach(([key, socket]) => {
      socket.on('new_message', (message) => {
        if (message.sender_name !== users[key].name) {
          printChatMessage(message.sender_name, message.content, message.created_at, false);
        }
      });
    });
    
    // 채팅 시뮬레이션
    const chatScript = [
      { user: 'alex', message: '안녕하세요! useEffect 무한 루프 문제로 도움이 필요합니다.', delay: 2000 },
      { user: 'sarah', message: '안녕하세요 Alex님! 코드를 보여주실 수 있나요?', delay: 3000 },
      { user: 'alex', message: `useEffect(() => {
  setCount(count + 1);
}, [count]);`, delay: 2000 },
      { user: 'sarah', message: '아, 문제를 찾았습니다! dependency array에 count가 있어서 무한 루프가 발생하네요.', delay: 3000 },
      { user: 'mike', message: '맞습니다. count가 변경될 때마다 useEffect가 실행되고, 또 count를 변경하니 무한 반복이죠.', delay: 3000 },
      { user: 'sarah', message: `해결 방법:
1) dependency array를 비우기: useEffect(() => {...}, [])
2) 함수형 업데이트 사용: setCount(prev => prev + 1)`, delay: 4000 },
      { user: 'alex', message: '아하! 이해했습니다. 함수형 업데이트를 사용하면 되는군요!', delay: 2000 },
      { user: 'mike', message: '추가로, useCallback이나 useMemo를 활용하면 성능도 개선할 수 있습니다.', delay: 3000 },
      { user: 'alex', message: '정말 감사합니다! 문제가 해결되었어요! 👍', delay: 2000 }
    ];
    
    for (const script of chatScript) {
      await delay(script.delay);
      
      // 메시지 전송
      sockets[script.user].emit('send_message', {
        roomId,
        content: script.message,
        type: 'text'
      });
      
      // 화면에 표시
      printChatMessage(
        users[script.user].name,
        script.message,
        new Date(),
        script.user === 'alex'
      );
    }
    
    await delay(3000);

    // 9. 채팅 종료
    printHeader('문제 해결 완료');
    printProgress(7, 8, '채팅을 종료합니다...');
    
    await axios.post(`${API_URL}/chat/rooms/${roomId}/close`, {}, {
      headers: { Authorization: `Bearer ${tokens.alex}` }
    });
    
    printBox('해결 요약', `✅ 문제: useEffect dependency로 인한 무한 루프
✅ 해결: 함수형 업데이트 또는 dependency 제거
✅ 소요 시간: 약 5분
✅ 참여 전문가: 2명`, colors.green);
    
    await delay(3000);

    // 10. 서비스 요약
    printHeader('연결이 서비스 요약');
    printProgress(8, 8, '완료!');
    
    console.log(`\n${colors.bright}🎉 시연이 완료되었습니다!${colors.reset}\n`);
    
    printBox('연결이의 장점', `• 빠른 전문가 매칭 (AI 기반)
• 실시간 그룹 채팅
• 다양한 관점의 협업 답변
• 문제 해결 히스토리 저장`);
    
    console.log(`\n${colors.cyan}이것이 연결이(Yeongyul)의 실제 동작 방식입니다!${colors.reset}`);
    
    // 연결 종료
    setTimeout(() => {
      Object.values(sockets).forEach(socket => socket.close());
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error(`\n${colors.red}❌ 오류 발생:${colors.reset}`, error.message);
    if (error.response) {
      console.error('상세:', error.response.data);
    }
    process.exit(1);
  }
}

// 서버 시작 및 데모 실행
console.log(`${colors.yellow}서버를 시작합니다...${colors.reset}`);

const { spawn } = require('child_process');
const serverProcess = spawn('node', ['src/server.js'], {
  cwd: process.cwd(),
  detached: false,
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
  if (!serverReady && data.toString().includes('Server running')) {
    serverReady = true;
    console.log(`${colors.green}✓ 서버 준비 완료${colors.reset}\n`);
    setTimeout(runVisualDemo, 2000);
  }
});

serverProcess.on('error', (error) => {
  console.error(`${colors.red}서버 시작 실패:${colors.reset}`, error);
  process.exit(1);
});

process.on('exit', () => {
  serverProcess.kill();
});