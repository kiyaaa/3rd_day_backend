const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3003/api';
const WS_URL = 'http://localhost:3003';

// User credentials
const users = {
  questioner: {
    email: 'alex@example.com',
    password: 'password123',
    name: 'Alex (질문자)'
  },
  expert1: {
    email: 'sarah@example.com',
    password: 'password123',
    name: 'Sarah (React 전문가)'
  },
  expert2: {
    email: 'mike@example.com',
    password: 'password123',
    name: 'Mike (Node.js 전문가)'
  }
};

// Token storage
const tokens = {};
const sockets = {};
const expertProfiles = {};

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to print events
const log = (user, message, data = {}) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${user}: ${message}`);
  if (Object.keys(data).length > 0) {
    console.log('  └─>', JSON.stringify(data, null, 2));
  }
};

// Register users
async function registerUsers() {
  log('System', '=== 사용자 등록 시작 ===');
  
  for (const [key, user] of Object.entries(users)) {
    try {
      await axios.post(`${API_URL}/auth/register`, {
        ...user,
        role: key.includes('expert') ? 'expert' : 'user'
      });
      log('System', `✅ ${user.name} 등록 완료`);
    } catch (error) {
      if (error.response?.status === 409) {
        log('System', `ℹ️ ${user.name} 이미 등록됨`);
      } else {
        log('System', `❌ ${user.name} 등록 실패: ${error.message}`);
      }
    }
    await delay(500);
  }
}

// Login users
async function loginUsers() {
  log('System', '=== 사용자 로그인 시작 ===');
  
  for (const [key, user] of Object.entries(users)) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: user.email,
        password: user.password
      });
      tokens[key] = response.data.token;
      log('System', `✅ ${user.name} 로그인 성공`);
    } catch (error) {
      log('System', `❌ ${user.name} 로그인 실패: ${error.message}`);
    }
    await delay(500);
  }
}

// Set up expert profiles
async function setupExpertProfiles() {
  log('System', '=== 전문가 프로필 설정 ===');
  
  // Get expert users
  for (const key of ['expert1', 'expert2']) {
    try {
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${tokens[key]}` }
      });
      
      const user = response.data.user;
      if (user.specialties) {
        expertProfiles[key] = {
          expertId: user.id, // This should be the expert table ID
          userId: user.id,
          name: user.name
        };
        log('System', `✅ ${users[key].name} 전문가 프로필 확인됨`);
      }
    } catch (error) {
      log('System', `❌ ${users[key].name} 프로필 조회 실패: ${error.message}`);
    }
  }
}

// Create expert matches manually (simulating RAG matching)
async function createExpertMatches(questionId) {
  log('System', '🤖 전문가 매칭 시뮬레이션...');
  
  // Get the database instance to manually create matches
  try {
    // Since we can't directly access the database from here,
    // we'll update the question status through a custom endpoint
    // For demo purposes, we'll just update the question status
    
    // First, let's get the question details
    const questionResponse = await axios.get(`${API_URL}/questions/${questionId}`);
    const question = questionResponse.data.question;
    
    // Update question status to 'matched'
    await axios.put(`${API_URL}/questions/${questionId}`, {
      status: 'matched'
    }, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });
    
    log('System', '✅ 질문 상태를 matched로 업데이트했습니다');
    
  } catch (error) {
    log('System', `❌ 매칭 시뮬레이션 실패: ${error.message}`);
  }
}

// Connect WebSocket clients
async function connectWebSockets() {
  log('System', '=== WebSocket 연결 시작 ===');
  
  for (const [key, user] of Object.entries(users)) {
    const socket = io(WS_URL, {
      auth: { token: tokens[key] }
    });

    sockets[key] = socket;

    socket.on('connect', () => {
      log(user.name, '✅ WebSocket 연결됨');
    });

    socket.on('new_message', (message) => {
      log(user.name, `💬 새 메시지: ${message.sender_name}`, {
        content: message.content
      });
    });

    socket.on('user_joined', (data) => {
      log(user.name, `👋 ${data.userName}님이 참여했습니다`);
    });

    socket.on('expert_matched', (data) => {
      log(user.name, `🎯 전문가 매칭: ${data.expertName}`);
    });

    socket.on('room_created', (data) => {
      log(user.name, `🏠 채팅방이 생성되었습니다 (Room ID: ${data.roomId})`);
    });

    socket.on('error', (error) => {
      log(user.name, `❌ 에러: ${error.message}`);
    });

    await delay(500);
  }
}

// Main simulation
async function runSimulation() {
  try {
    // 1. Register and login users
    await registerUsers();
    await delay(1000);
    
    await loginUsers();
    await delay(1000);
    
    await setupExpertProfiles();
    await delay(1000);

    // 2. Connect WebSockets
    await connectWebSockets();
    await delay(2000);

    // 3. Alex creates a question
    log('System', '=== 질문 등록 시나리오 ===');
    log(users.questioner.name, '💭 React useEffect 관련 질문을 등록합니다...');
    
    const questionResponse = await axios.post(`${API_URL}/questions`, {
      title: 'React useEffect 무한 루프 문제',
      content: 'useEffect 안에서 state를 업데이트하면 무한 루프가 발생합니다. 어떻게 해결해야 하나요?',
      category: 'React',
      urgency: 'high'
    }, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });

    const questionId = questionResponse.data.question.id;
    log(users.questioner.name, `✅ 질문 등록 완료 (ID: ${questionId})`);
    await delay(2000);

    // 4. Simulate expert matching
    log('System', '=== RAG 매칭 시뮬레이션 ===');
    await createExpertMatches(questionId);
    await delay(2000);

    // 5. Create chat room
    log('System', '=== 채팅방 생성 ===');
    const chatRoomResponse = await axios.post(`${API_URL}/chat/rooms`, {
      questionId
    }, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });

    const roomId = chatRoomResponse.data.chatRoom.id;
    log(users.questioner.name, `✅ 채팅방 생성됨 (ID: ${roomId})`);
    await delay(1000);

    // 6. Everyone joins the chat room
    log('System', '=== 채팅방 입장 ===');
    for (const [key, user] of Object.entries(users)) {
      sockets[key].emit('join_room', { roomId });
      log(user.name, '🚪 채팅방에 입장했습니다');
      await delay(1000);
    }

    // 7. Simulate chat conversation
    log('System', '=== 채팅 시작 ===');
    await delay(2000);

    // Alex asks the question
    sockets.questioner.emit('send_message', {
      roomId,
      content: '안녕하세요! useEffect에서 state를 업데이트하면 계속 재실행되는 문제가 있어요.',
      type: 'text'
    });
    await delay(3000);

    // Sarah responds
    sockets.expert1.emit('typing_start', { roomId });
    await delay(2000);
    sockets.expert1.emit('typing_stop', { roomId });
    
    sockets.expert1.emit('send_message', {
      roomId,
      content: '안녕하세요! useEffect의 dependency array를 확인해보셨나요? state를 dependency에 넣으면 state가 변경될 때마다 재실행됩니다.',
      type: 'text'
    });
    await delay(3000);

    // Mike adds
    sockets.expert2.emit('send_message', {
      roomId,
      content: '맞습니다. 해결 방법은 1) dependency array를 비우거나 2) useCallback으로 함수를 메모이제이션하는 방법이 있습니다.',
      type: 'text'
    });
    await delay(3000);

    // Alex responds
    sockets.questioner.emit('send_message', {
      roomId,
      content: '아하! dependency array가 문제였군요. 감사합니다!',
      type: 'text'
    });
    await delay(2000);

    // Sarah provides code example
    sockets.expert1.emit('send_message', {
      roomId,
      content: `useEffect(() => {
  // 초기 로드 시 한 번만 실행
  fetchData();
}, []); // 빈 배열로 설정`,
      type: 'code'
    });
    await delay(3000);

    log(users.questioner.name, '🎉 문제가 해결되었습니다!');
    await delay(2000);

    // 8. Get chat messages to show the conversation
    log('System', '=== 채팅 내역 확인 ===');
    const messagesResponse = await axios.get(`${API_URL}/chat/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });
    
    log('System', `총 ${messagesResponse.data.messages.length}개의 메시지가 교환되었습니다`);
    
    // 9. Close chat room
    log('System', '=== 채팅 종료 ===');
    await axios.post(`${API_URL}/chat/rooms/${roomId}/close`, {}, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });
    log(users.questioner.name, '✅ 채팅방을 종료했습니다');

    await delay(2000);
    log('System', '🎊 시뮬레이션 완료!');
    
    // Show summary
    log('System', '\n=== 시뮬레이션 요약 ===');
    log('System', '1. 3명의 사용자 등록 및 로그인');
    log('System', '2. 질문 등록 및 전문가 매칭');
    log('System', '3. 실시간 채팅방 생성 및 대화');
    log('System', '4. 문제 해결 및 채팅 종료');
    log('System', '\n💡 이것이 연결이(Yeongyul)의 기본 동작 흐름입니다!');

    // Cleanup
    setTimeout(() => {
      Object.values(sockets).forEach(socket => socket.close());
      process.exit(0);
    }, 3000);

  } catch (error) {
    console.error('Simulation error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the simulation
console.log('🚀 연결이(Yeongyul) 데모 시뮬레이션 시작\n');
runSimulation();