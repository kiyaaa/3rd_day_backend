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

// Register experts with specialties
async function registerExperts() {
  log('System', '=== 전문가 프로필 설정 ===');
  
  const expertProfiles = {
    expert1: {
      specialties: ['React', 'Frontend', 'JavaScript'],
      experienceYears: 5,
      bio: 'React 및 프론트엔드 전문가입니다.'
    },
    expert2: {
      specialties: ['Node.js', 'Backend', 'Database'],
      experienceYears: 7,
      bio: 'Node.js 백엔드 개발 전문가입니다.'
    }
  };

  for (const [key, profile] of Object.entries(expertProfiles)) {
    try {
      await axios.post(`${API_URL}/experts/register`, profile, {
        headers: { Authorization: `Bearer ${tokens[key]}` }
      });
      log('System', `✅ ${users[key].name} 전문가 프로필 설정 완료`);
    } catch (error) {
      log('System', `❌ ${users[key].name} 전문가 프로필 설정 실패: ${error.message}`);
    }
    await delay(500);
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
    
    await registerExperts();
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

    // 4. Simulate expert matching (in real app, this would be done by RAG)
    log('System', '=== RAG 매칭 시뮬레이션 ===');
    log('System', '🤖 AI가 질문을 분석하고 전문가를 매칭중...');
    
    // In real app, this would be done automatically by the matching service
    // For demo, we'll manually create expert matches
    const expertIds = [1, 2]; // Assuming expert IDs
    
    await delay(3000);
    log('System', '✅ 2명의 전문가가 매칭되었습니다');

    // 5. Experts accept the question
    log('System', '=== 전문가 수락 시나리오 ===');
    await delay(2000);
    
    for (const expertKey of ['expert1', 'expert2']) {
      log(users[expertKey].name, '📱 새로운 질문 알림을 받았습니다');
      await delay(1000);
      
      sockets[expertKey].emit('accept_question', { questionId });
      log(users[expertKey].name, '✅ 질문을 수락했습니다');
      await delay(1500);
    }

    // 6. Create chat room
    log('System', '=== 채팅방 생성 ===');
    const chatRoomResponse = await axios.post(`${API_URL}/chat/rooms`, {
      questionId
    }, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });

    const roomId = chatRoomResponse.data.chatRoom.id;
    log(users.questioner.name, `✅ 채팅방 생성됨 (ID: ${roomId})`);
    await delay(1000);

    // 7. Everyone joins the chat room
    log('System', '=== 채팅방 입장 ===');
    for (const [key, user] of Object.entries(users)) {
      sockets[key].emit('join_room', { roomId });
      log(user.name, '🚪 채팅방에 입장했습니다');
      await delay(1000);
    }

    // 8. Simulate chat conversation
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

    // 9. Close chat room
    log('System', '=== 채팅 종료 ===');
    await axios.post(`${API_URL}/chat/rooms/${roomId}/close`, {}, {
      headers: { Authorization: `Bearer ${tokens.questioner}` }
    });
    log(users.questioner.name, '✅ 채팅방을 종료했습니다');

    await delay(2000);
    log('System', '🎊 시뮬레이션 완료!');

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