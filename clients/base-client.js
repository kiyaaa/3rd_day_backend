const io = require('socket.io-client');
const readline = require('readline');
const axios = require('axios');

const API_URL = 'http://localhost:3004/api';
const WS_URL = 'http://localhost:3004';

class ChatClient {
  constructor(credentials, userName, isExpert = false) {
    this.credentials = credentials;
    this.userName = userName;
    this.isExpert = isExpert;
    this.token = null;
    this.socket = null;
    this.currentRoom = null;
    this.questionId = null;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${userName}> `
    });
  }

  async init() {
    console.log(`🚀 ${this.userName} 클라이언트 시작...\n`);
    
    // 로그인
    try {
      const res = await axios.post(`${API_URL}/auth/login`, this.credentials);
      this.token = res.data.token;
      console.log('✅ 로그인 성공!\n');
    } catch (e) {
      // 등록 시도
      try {
        await axios.post(`${API_URL}/auth/register`, {
          ...this.credentials,
          name: this.userName,
          role: this.isExpert ? 'expert' : 'user'
        });
        const loginRes = await axios.post(`${API_URL}/auth/login`, this.credentials);
        this.token = loginRes.data.token;
        console.log('✅ 등록 및 로그인 성공!\n');
      } catch (err) {
        console.error('❌ 로그인 실패:', err.message);
        process.exit(1);
      }
    }
    
    // WebSocket 연결
    this.socket = io(WS_URL, {
      auth: { token: this.token }
    });
    
    this.setupSocketListeners();
    this.setupCommands();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket 연결됨\n');
      this.showHelp();
    });
    
    this.socket.on('new_message', (msg) => {
      if (msg.sender_name !== this.userName) {
        const time = new Date(msg.created_at).toLocaleTimeString('ko-KR');
        console.log(`\n💬 [${time}] ${msg.sender_name}: ${msg.content}`);
        this.rl.prompt();
      }
    });
    
    this.socket.on('user_joined', (data) => {
      if (data.userName !== this.userName) {
        console.log(`\n👋 ${data.userName}님이 입장했습니다`);
        this.rl.prompt();
      }
    });
    
    this.socket.on('user_left', (data) => {
      console.log(`\n👋 ${data.userName}님이 나갔습니다`);
      this.rl.prompt();
    });
    
    this.socket.on('typing_indicator', (data) => {
      if (data.isTyping && data.userName !== this.userName) {
        console.log(`\n✍️ ${data.userName}님이 입력 중...`);
        this.rl.prompt();
      }
    });
    
    this.socket.on('expert_matched', (data) => {
      console.log(`\n🎯 전문가 매칭: ${data.expertName}`);
      this.rl.prompt();
    });
    
    this.socket.on('room_created', (data) => {
      console.log(`\n🏠 채팅방 생성됨 (ID: ${data.roomId})`);
      this.rl.prompt();
    });
    
    this.socket.on('question_assigned', (data) => {
      console.log(`\n📱 새로운 질문이 배정되었습니다!`);
      console.log(`   제목: ${data.title}`);
      console.log(`   내용: ${data.content}`);
      console.log(`   긴급도: ${data.urgency}`);
      console.log(`   /accept 또는 /reject로 응답하세요\n`);
      this.questionId = data.questionId;
      this.rl.prompt();
    });
    
    this.socket.on('error', (error) => {
      console.error(`\n❌ 에러: ${error.message}`);
      this.rl.prompt();
    });
  }

  setupCommands() {
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }
      
      // 명령어 처리
      if (trimmed === '/help') {
        this.showHelp();
      }
      else if (trimmed.startsWith('/question ') && !this.isExpert) {
        await this.createQuestion(trimmed.substring(10));
      }
      else if (trimmed === '/create-room' && !this.isExpert) {
        await this.createChatRoom();
      }
      else if (trimmed.startsWith('/join ')) {
        const roomId = trimmed.split(' ')[1];
        this.joinRoom(roomId);
      }
      else if (trimmed === '/leave') {
        this.leaveRoom();
      }
      else if (trimmed === '/accept' && this.isExpert) {
        await this.acceptQuestion();
      }
      else if (trimmed === '/reject' && this.isExpert) {
        await this.rejectQuestion();
      }
      else if (trimmed.startsWith('/typing')) {
        this.sendTypingIndicator();
      }
      else if (!trimmed.startsWith('/')) {
        this.sendMessage(trimmed);
      }
      else {
        console.log('❌ 알 수 없는 명령어입니다. /help를 입력하세요.');
      }
      
      this.rl.prompt();
    });
    
    this.rl.prompt();
  }

  showHelp() {
    console.log('📌 사용 가능한 명령어:');
    console.log('  /help - 도움말 표시');
    if (!this.isExpert) {
      console.log('  /question <내용> - 질문 등록');
      console.log('  /create-room - 채팅방 생성');
    } else {
      console.log('  /accept - 질문 수락');
      console.log('  /reject - 질문 거절');
    }
    console.log('  /join <room-id> - 채팅방 입장');
    console.log('  /leave - 채팅방 나가기');
    console.log('  /typing - 타이핑 표시');
    console.log('  그 외 - 메시지 전송\n');
  }

  async createQuestion(content) {
    try {
      const res = await axios.post(`${API_URL}/questions`, {
        title: content.split('.')[0].substring(0, 50),
        content: content,
        category: 'React',
        urgency: 'high'
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      this.questionId = res.data.question.id;
      console.log(`✅ 질문 등록됨 (ID: ${this.questionId})`);
      
      // 데모를 위해 자동으로 matched 상태로 변경
      setTimeout(async () => {
        await axios.put(`${API_URL}/questions/${this.questionId}`, {
          status: 'matched'
        }, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
        console.log('🤖 AI가 전문가를 매칭했습니다!');
      }, 2000);
      
    } catch (e) {
      console.error('❌ 질문 등록 실패:', e.response?.data?.error?.message || e.message);
    }
  }

  async createChatRoom() {
    try {
      if (!this.questionId) {
        console.log('❌ 먼저 질문을 등록하세요');
        return;
      }
      
      const res = await axios.post(`${API_URL}/chat/rooms`, {
        questionId: this.questionId
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      const roomId = res.data.chatRoom.id;
      console.log(`✅ 채팅방 생성됨 (ID: ${roomId})`);
      
      // 자동으로 입장
      setTimeout(() => {
        this.joinRoom(roomId.toString());
      }, 1000);
      
    } catch (e) {
      console.error('❌ 채팅방 생성 실패:', e.response?.data?.error?.message || e.message);
    }
  }

  joinRoom(roomId) {
    this.socket.emit('join_room', { roomId });
    this.currentRoom = roomId;
    console.log(`✅ 채팅방 ${roomId}에 입장했습니다`);
  }

  leaveRoom() {
    if (this.currentRoom) {
      this.socket.emit('leave_room', { roomId: this.currentRoom });
      console.log('👋 채팅방을 나갔습니다');
      this.currentRoom = null;
    } else {
      console.log('❌ 현재 채팅방에 없습니다');
    }
  }

  sendMessage(content) {
    if (!this.currentRoom) {
      console.log('❌ 먼저 채팅방에 입장하세요');
      return;
    }
    
    this.socket.emit('send_message', {
      roomId: this.currentRoom,
      content: content,
      type: 'text'
    });
    
    const time = new Date().toLocaleTimeString('ko-KR');
    console.log(`[${time}] 나: ${content}`);
  }

  sendTypingIndicator() {
    if (!this.currentRoom) {
      console.log('❌ 먼저 채팅방에 입장하세요');
      return;
    }
    
    this.socket.emit('typing_start', { roomId: this.currentRoom });
    console.log('✍️ 타이핑 시작...');
    
    setTimeout(() => {
      this.socket.emit('typing_stop', { roomId: this.currentRoom });
    }, 3000);
  }

  async acceptQuestion() {
    if (!this.questionId) {
      console.log('❌ 수락할 질문이 없습니다');
      return;
    }
    
    this.socket.emit('accept_question', { questionId: this.questionId });
    console.log('✅ 질문을 수락했습니다');
  }

  async rejectQuestion() {
    if (!this.questionId) {
      console.log('❌ 거절할 질문이 없습니다');
      return;
    }
    
    this.socket.emit('reject_question', { questionId: this.questionId });
    console.log('❌ 질문을 거절했습니다');
    this.questionId = null;
  }
}

module.exports = ChatClient;