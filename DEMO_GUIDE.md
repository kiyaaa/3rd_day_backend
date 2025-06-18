# 🚀 연결이(Yeongyul) 실시간 시연 가이드

## 📋 시연 준비사항

### 1. 필요한 도구
- **터미널 4개** (또는 탭 4개)
- **웹 브라우저** (선택사항)
- **Postman 또는 curl** (API 테스트용)

### 2. 서버 실행
```bash
# 터미널 1에서 백엔드 서버 실행
cd /data/data/com.termux/files/home/prj/3rd_day_backend
node src/server.js
```

## 🎯 시연 시나리오 (UI/UX 데모 재현)

### 📌 Step 1: 사용자 준비 (3개 터미널에서 각각 실행)

#### 터미널 2 - Alex (질문자)
```bash
# 1. 사용자 등록
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@demo.com",
    "password": "password123",
    "name": "Alex Kim",
    "role": "user"
  }'

# 2. 로그인
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@demo.com",
    "password": "password123"
  }'

# 토큰을 ALEX_TOKEN 변수에 저장
export ALEX_TOKEN="받은_토큰_값"
```

#### 터미널 3 - Sarah (React 전문가)
```bash
# 1. 전문가 등록
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@demo.com",
    "password": "password123",
    "name": "Sarah Lee",
    "role": "expert"
  }'

# 2. 로그인
export SARAH_TOKEN="받은_토큰_값"
```

#### 터미널 4 - Mike (Node.js 전문가)
```bash
# 1. 전문가 등록 및 로그인
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mike@demo.com",
    "password": "password123",
    "name": "Mike Park",
    "role": "expert"
  }'

export MIKE_TOKEN="받은_토큰_값"
```

### 📌 Step 2: WebSocket 클라이언트 실행

각 터미널에서 WebSocket 클라이언트 스크립트 실행:

```bash
# alex-client.js 생성 및 실행 (터미널 2)
node clients/alex-client.js

# sarah-client.js 생성 및 실행 (터미널 3)
node clients/sarah-client.js

# mike-client.js 생성 및 실행 (터미널 4)
node clients/mike-client.js
```

### 📌 Step 3: 시나리오 진행

#### 1️⃣ Alex가 질문 등록 (터미널 2)
```
> /question React useEffect 무한 루프 문제가 있습니다
```

#### 2️⃣ 시스템이 전문가 매칭 (자동)
- Sarah와 Mike에게 알림이 전송됨

#### 3️⃣ 전문가들이 수락 (터미널 3, 4)
```
# Sarah 터미널
> /accept

# Mike 터미널  
> /accept
```

#### 4️⃣ 채팅방 생성 (터미널 2)
```
> /create-room
```

#### 5️⃣ 모두 채팅방 입장
```
# 각 터미널에서
> /join 1
```

#### 6️⃣ 실시간 대화
```
# Alex (터미널 2)
> 안녕하세요! useEffect 무한 루프 문제로 도움이 필요합니다.

# Sarah (터미널 3)
> 안녕하세요! 코드를 보여주실 수 있나요?

# Alex (터미널 2)
> useEffect(() => { setCount(count + 1); }, [count]);

# Sarah (터미널 3)
> 문제를 찾았습니다! dependency array에 count가 있어서 무한 루프가 발생하네요.

# Mike (터미널 4)
> 맞습니다. count가 변경될 때마다 useEffect가 실행되고, 또 count를 변경하니 무한 반복이죠.

# Sarah (터미널 3)
> 해결 방법: 1) 빈 배열 사용 [], 2) 함수형 업데이트 setCount(prev => prev + 1)

# Alex (터미널 2)
> 아하! 이해했습니다. 감사합니다! 👍
```

## 🛠️ WebSocket 클라이언트 스크립트

### clients/alex-client.js
```javascript
const io = require('socket.io-client');
const readline = require('readline');
const axios = require('axios');

const API_URL = 'http://localhost:3004/api';
const WS_URL = 'http://localhost:3004';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 로그인 정보
const credentials = {
  email: 'alex@demo.com',
  password: 'password123'
};

let socket;
let token;
let currentRoom;

async function init() {
  console.log('🚀 Alex 클라이언트 시작...\n');
  
  // 로그인
  try {
    const res = await axios.post(`${API_URL}/auth/login`, credentials);
    token = res.data.token;
    console.log('✅ 로그인 성공!\n');
  } catch (e) {
    console.error('❌ 로그인 실패:', e.message);
    process.exit(1);
  }
  
  // WebSocket 연결
  socket = io(WS_URL, {
    auth: { token }
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket 연결됨\n');
    console.log('명령어:');
    console.log('  /question <내용> - 질문 등록');
    console.log('  /create-room - 채팅방 생성');
    console.log('  /join <room-id> - 채팅방 입장');
    console.log('  /leave - 채팅방 나가기');
    console.log('  그 외 - 메시지 전송\n');
  });
  
  socket.on('new_message', (msg) => {
    if (msg.sender_name !== 'Alex Kim') {
      console.log(`\n💬 ${msg.sender_name}: ${msg.content}`);
      rl.prompt();
    }
  });
  
  socket.on('user_joined', (data) => {
    console.log(`\n👋 ${data.userName}님이 입장했습니다`);
    rl.prompt();
  });
  
  socket.on('expert_matched', (data) => {
    console.log(`\n🎯 전문가 매칭: ${data.expertName}`);
    rl.prompt();
  });
  
  socket.on('room_created', (data) => {
    console.log(`\n🏠 채팅방 생성됨 (ID: ${data.roomId})`);
    rl.prompt();
  });
  
  // 명령어 처리
  rl.on('line', async (input) => {
    if (input.startsWith('/question ')) {
      const content = input.substring(10);
      try {
        const res = await axios.post(`${API_URL}/questions`, {
          title: content.split('.')[0],
          content: content,
          category: 'React',
          urgency: 'high'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ 질문 등록됨 (ID: ${res.data.question.id})`);
        
        // 자동으로 matched 상태로 변경 (데모용)
        await axios.put(`${API_URL}/questions/${res.data.question.id}`, {
          status: 'matched'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error('❌ 질문 등록 실패:', e.response?.data?.error?.message || e.message);
      }
    }
    else if (input === '/create-room') {
      try {
        // 가장 최근 질문 ID 사용 (데모용 간소화)
        const res = await axios.post(`${API_URL}/chat/rooms`, {
          questionId: 1
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ 채팅방 생성됨 (ID: ${res.data.chatRoom.id})`);
      } catch (e) {
        console.error('❌ 채팅방 생성 실패:', e.response?.data?.error?.message || e.message);
      }
    }
    else if (input.startsWith('/join ')) {
      const roomId = input.split(' ')[1];
      socket.emit('join_room', { roomId });
      currentRoom = roomId;
      console.log(`✅ 채팅방 ${roomId}에 입장했습니다`);
    }
    else if (input === '/leave' && currentRoom) {
      socket.emit('leave_room', { roomId: currentRoom });
      console.log('👋 채팅방을 나갔습니다');
      currentRoom = null;
    }
    else if (currentRoom && !input.startsWith('/')) {
      socket.emit('send_message', {
        roomId: currentRoom,
        content: input,
        type: 'text'
      });
      console.log(`나: ${input}`);
    }
    
    rl.prompt();
  });
  
  rl.prompt();
}

init();
```

### clients/sarah-client.js (전문가용)
```javascript
// alex-client.js와 유사하지만 전문가 기능 추가
// credentials를 sarah@demo.com으로 변경
// 추가 명령어:
//   /accept - 질문 수락
//   /reject - 질문 거절

socket.on('question_assigned', (data) => {
  console.log(`\n📱 새로운 질문이 배정되었습니다!`);
  console.log(`   제목: ${data.title}`);
  console.log(`   긴급도: ${data.urgency}`);
  console.log(`   /accept 또는 /reject로 응답하세요\n`);
  rl.prompt();
});
```

## 🎬 전체 시연 흐름

### 1. 터미널 배치
```
┌─────────────┬─────────────┐
│ Terminal 1  │ Terminal 2  │
│ (서버 로그)  │ (Alex)      │
├─────────────┼─────────────┤
│ Terminal 3  │ Terminal 4  │
│ (Sarah)     │ (Mike)      │
└─────────────┴─────────────┘
```

### 2. 실행 순서
1. 서버 시작 (터미널 1)
2. 각 클라이언트 실행 (터미널 2,3,4)
3. Alex가 질문 등록
4. Sarah, Mike가 수락
5. Alex가 채팅방 생성
6. 모두 채팅방 입장
7. 실시간 대화 진행

### 3. 예상 결과
- 각 터미널에서 실시간으로 메시지가 표시됨
- 서버 로그에서 WebSocket 이벤트 확인 가능
- 데이터베이스에 모든 메시지 저장됨

## 🔧 문제 해결

### WebSocket 연결 실패
```bash
# 서버가 실행 중인지 확인
curl http://localhost:3004/health

# 포트 확인
lsof -i :3004
```

### 인증 오류
```bash
# 토큰이 올바른지 확인
echo $ALEX_TOKEN

# 새로 로그인
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@demo.com","password":"password123"}'
```

이 가이드를 따라 실제로 UI/UX 데모와 동일한 시나리오를 재현할 수 있습니다!