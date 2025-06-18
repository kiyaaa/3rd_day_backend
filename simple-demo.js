const axios = require('axios');

const API_URL = 'http://localhost:3004/api';

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple demo to test the basic flow
async function runSimpleDemo() {
  try {
    console.log('=== 연결이 간단 데모 시작 ===\n');

    // 1. 서버 상태 확인
    console.log('1. 서버 상태 확인...');
    const health = await axios.get('http://localhost:3004/health');
    console.log('✅ 서버 정상 작동:', health.data);
    await delay(1000);

    // 2. 사용자 등록
    console.log('\n2. 사용자 등록...');
    
    // 질문자 등록
    try {
      const alexReg = await axios.post(`${API_URL}/auth/register`, {
        email: 'demo_alex@example.com',
        password: 'password123',
        name: 'Demo Alex',
        role: 'user'
      });
      console.log('✅ 질문자 등록 성공:', alexReg.data.user.name);
    } catch (e) {
      console.log('ℹ️ 질문자 이미 등록됨');
    }

    // 전문가 등록
    try {
      const sarahReg = await axios.post(`${API_URL}/auth/register`, {
        email: 'demo_sarah@example.com',
        password: 'password123',
        name: 'Demo Sarah',
        role: 'expert'
      });
      console.log('✅ 전문가 등록 성공:', sarahReg.data.user.name);
    } catch (e) {
      console.log('ℹ️ 전문가 이미 등록됨');
    }
    await delay(1000);

    // 3. 로그인
    console.log('\n3. 사용자 로그인...');
    const alexLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'demo_alex@example.com',
      password: 'password123'
    });
    const alexToken = alexLogin.data.token;
    console.log('✅ 질문자 로그인 성공');

    const sarahLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'demo_sarah@example.com',
      password: 'password123'
    });
    const sarahToken = sarahLogin.data.token;
    console.log('✅ 전문가 로그인 성공');
    await delay(1000);

    // 4. 질문 등록
    console.log('\n4. 질문 등록...');
    const questionRes = await axios.post(`${API_URL}/questions`, {
      title: 'JavaScript 비동기 처리 질문',
      content: 'Promise와 async/await의 차이점이 무엇인가요?',
      category: 'JavaScript',
      urgency: 'normal'
    }, {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    const questionId = questionRes.data.question.id;
    console.log('✅ 질문 등록 완료:', questionRes.data.question.title);
    console.log('   질문 ID:', questionId);
    await delay(1000);

    // 5. 질문 상태를 matched로 변경 (RAG 매칭 시뮬레이션)
    console.log('\n5. RAG 매칭 시뮬레이션...');
    await axios.put(`${API_URL}/questions/${questionId}`, {
      status: 'matched'
    }, {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    console.log('✅ 질문 상태를 matched로 변경');
    await delay(1000);

    // 6. 채팅방 생성
    console.log('\n6. 채팅방 생성...');
    const chatRoomRes = await axios.post(`${API_URL}/chat/rooms`, {
      questionId
    }, {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    const roomId = chatRoomRes.data.chatRoom.id;
    console.log('✅ 채팅방 생성 완료');
    console.log('   채팅방 ID:', roomId);
    await delay(1000);

    // 7. 채팅방 정보 조회
    console.log('\n7. 채팅방 정보 조회...');
    const roomInfo = await axios.get(`${API_URL}/chat/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    console.log('✅ 채팅방 정보:');
    console.log('   질문:', roomInfo.data.chatRoom.question_title);
    console.log('   참여자:', roomInfo.data.chatRoom.participants.length, '명');
    await delay(1000);

    // 8. 메시지 전송 시뮬레이션 (REST API로)
    console.log('\n8. 메시지 교환 (WebSocket 대신 데이터베이스에 직접 저장)...');
    
    // 메시지는 WebSocket을 통해서만 전송 가능하므로
    // 실제 메시지 전송은 WebSocket 연결이 필요합니다
    console.log('💬 실제 메시지 전송은 WebSocket 연결이 필요합니다');
    console.log('   데모에서는 채팅방 생성까지만 진행했습니다');
    
    // 9. 요약
    console.log('\n=== 데모 완료 ===');
    console.log('✅ 사용자 등록 및 로그인');
    console.log('✅ 질문 등록 및 매칭');
    console.log('✅ 채팅방 생성');
    console.log('💡 실제 서비스에서는 WebSocket으로 실시간 채팅이 진행됩니다');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    if (error.response) {
      console.error('응답 데이터:', error.response.data);
    }
  }
}

// Start server and run demo
console.log('서버 시작 중...\n');

const { spawn } = require('child_process');
const serverProcess = spawn('node', ['src/server.js'], {
  cwd: process.cwd(),
  detached: false
});

serverProcess.stdout.on('data', (data) => {
  if (data.toString().includes('Server running')) {
    console.log('✅ 서버 시작됨\n');
    setTimeout(() => {
      runSimpleDemo().then(() => {
        console.log('\n서버 종료 중...');
        serverProcess.kill();
        process.exit(0);
      });
    }, 2000);
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('서버 에러:', data.toString());
});

serverProcess.on('error', (error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});