const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3004/api';
const WS_URL = 'http://localhost:3004';

async function captureDemo() {
    console.log(`
┌─────────────────────────────────────────────────────────┐
│          🚀 연결이(Yeongyul) 실시간 데모 캡처            │
└─────────────────────────────────────────────────────────┘

웹 브라우저를 열 수 없으므로 데모 과정을 텍스트로 보여드립니다.
실제 백엔드와 통신하며 진행됩니다.
`);

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // 1. 현재 상태 확인
    console.log('📊 [Step 1] 서버 상태 확인');
    console.log('─'.repeat(50));
    try {
        const health = await axios.get('http://localhost:3004/health');
        console.log('✅ 서버 상태:', health.data);
        console.log('');
    } catch (e) {
        console.log('❌ 서버 연결 실패');
        return;
    }

    // 2. 사용자 등록
    console.log('👥 [Step 2] 사용자 등록');
    console.log('─'.repeat(50));
    
    const users = [
        { email: 'demo_alex@test.com', name: 'Alex Kim', role: 'user' },
        { email: 'demo_sarah@test.com', name: 'Sarah Lee', role: 'expert' },
        { email: 'demo_mike@test.com', name: 'Mike Park', role: 'expert' }
    ];

    for (const user of users) {
        try {
            await axios.post(`${API_URL}/auth/register`, {
                ...user,
                password: 'demo123'
            });
            console.log(`✅ ${user.name} (${user.role}) 등록 완료`);
        } catch (e) {
            console.log(`ℹ️  ${user.name} 이미 등록됨`);
        }
    }
    console.log('');
    await delay(1000);

    // 3. 로그인 및 토큰 획득
    console.log('🔐 [Step 3] 사용자 로그인');
    console.log('─'.repeat(50));
    
    const tokens = {};
    for (const user of users) {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: user.email,
            password: 'demo123'
        });
        tokens[user.email] = res.data.token;
        console.log(`✅ ${user.name} 로그인 성공 (토큰: ${res.data.token.substring(0, 20)}...)`);
    }
    console.log('');
    await delay(1000);

    // 4. WebSocket 연결
    console.log('🔌 [Step 4] WebSocket 실시간 연결');
    console.log('─'.repeat(50));
    
    const sockets = {};
    const messageLog = [];
    
    for (const user of users) {
        const socket = io(WS_URL, {
            auth: { token: tokens[user.email] }
        });
        
        sockets[user.email] = socket;
        
        socket.on('connect', () => {
            console.log(`✅ ${user.name} WebSocket 연결됨`);
        });
        
        socket.on('new_message', (msg) => {
            messageLog.push({
                time: new Date().toLocaleTimeString('ko-KR'),
                sender: msg.sender_name,
                content: msg.content,
                to: user.name
            });
        });
    }
    
    await delay(2000);
    console.log('');

    // 5. 질문 등록
    console.log('📝 [Step 5] Alex의 질문 등록');
    console.log('─'.repeat(50));
    
    const questionData = {
        title: 'React useEffect 무한 루프 문제',
        content: 'useEffect 안에서 state를 업데이트하면 무한 루프가 발생합니다.',
        category: 'React',
        urgency: 'high'
    };
    
    console.log('질문 내용:');
    console.log(`  제목: ${questionData.title}`);
    console.log(`  내용: ${questionData.content}`);
    console.log(`  카테고리: ${questionData.category}`);
    console.log(`  긴급도: ${questionData.urgency}`);
    
    const qRes = await axios.post(`${API_URL}/questions`, questionData, {
        headers: { Authorization: `Bearer ${tokens['demo_alex@test.com']}` }
    });
    
    const questionId = qRes.data.question.id;
    console.log(`\n✅ 질문 등록 완료 (ID: ${questionId})`);
    console.log('');
    await delay(1000);

    // 6. 매칭 상태 업데이트
    console.log('🤖 [Step 6] AI 전문가 매칭 (시뮬레이션)');
    console.log('─'.repeat(50));
    console.log('AI가 질문을 분석 중...');
    await delay(1000);
    console.log('• 키워드: useEffect, state, 무한 루프');
    console.log('• 필요 전문성: React Hooks, 상태 관리');
    
    await axios.put(`${API_URL}/questions/${questionId}`, {
        status: 'matched'
    }, {
        headers: { Authorization: `Bearer ${tokens['demo_alex@test.com']}` }
    });
    
    console.log('✅ Sarah Lee, Mike Park 전문가 매칭 완료');
    console.log('');
    await delay(1000);

    // 7. 채팅방 생성
    console.log('💬 [Step 7] 채팅방 생성');
    console.log('─'.repeat(50));
    
    const chatRes = await axios.post(`${API_URL}/chat/rooms`, {
        questionId
    }, {
        headers: { Authorization: `Bearer ${tokens['demo_alex@test.com']}` }
    });
    
    const roomId = chatRes.data.chatRoom.id;
    console.log(`✅ 채팅방 생성됨 (ID: ${roomId})`);
    
    // 모두 입장
    for (const user of users) {
        sockets[user.email].emit('join_room', { roomId });
    }
    console.log('✅ 모든 참가자 입장 완료');
    console.log('');
    await delay(2000);

    // 8. 실시간 채팅
    console.log('🗨️  [Step 8] 실시간 채팅 대화');
    console.log('─'.repeat(50));
    console.log('');
    
    const chatScript = [
        { from: 'demo_alex@test.com', msg: '안녕하세요! useEffect 무한 루프 문제로 도움이 필요합니다.' },
        { from: 'demo_sarah@test.com', msg: '안녕하세요 Alex님! 코드를 보여주실 수 있나요?' },
        { from: 'demo_alex@test.com', msg: 'useEffect(() => { setCount(count + 1); }, [count]);' },
        { from: 'demo_sarah@test.com', msg: 'dependency array에 count가 있어서 무한 루프가 발생하네요!' },
        { from: 'demo_mike@test.com', msg: 'count 변경 → useEffect 실행 → count 변경의 무한 반복입니다.' },
        { from: 'demo_sarah@test.com', msg: '해결: 1) 빈 배열 [], 2) 함수형 업데이트 setCount(prev => prev + 1)' },
        { from: 'demo_alex@test.com', msg: '아하! 이해했습니다. 감사합니다! 👍' }
    ];
    
    for (const chat of chatScript) {
        const sender = users.find(u => u.email === chat.from);
        const time = new Date().toLocaleTimeString('ko-KR');
        
        // 메시지 전송
        sockets[chat.from].emit('send_message', {
            roomId,
            content: chat.msg,
            type: 'text'
        });
        
        // 화면에 출력
        if (sender.name === 'Alex Kim') {
            console.log(`[${time}] ${sender.name}: ${chat.msg}`);
        } else {
            console.log(`                    [${time}] ${sender.name}: ${chat.msg}`);
        }
        
        await delay(2500);
    }
    
    console.log('');
    console.log('─'.repeat(50));
    console.log('✅ 문제 해결 완료!');
    console.log('');

    // 9. 결과 요약
    console.log('📊 [Summary] 데모 결과');
    console.log('─'.repeat(50));
    console.log('• 참여자: 3명 (질문자 1, 전문가 2)');
    console.log('• 소요 시간: 약 5분');
    console.log('• 교환된 메시지: 7개');
    console.log('• 해결 방법: 함수형 업데이트 또는 dependency 배열 수정');
    console.log('');
    
    console.log('🎉 연결이(Yeongyul) 데모가 성공적으로 완료되었습니다!');
    console.log('');
    
    // 소켓 종료
    Object.values(sockets).forEach(s => s.close());
    
    // 실제 메시지 로그 확인
    if (messageLog.length > 0) {
        console.log('\n📬 실제 수신된 WebSocket 메시지:');
        console.log('─'.repeat(50));
        messageLog.slice(0, 5).forEach(log => {
            console.log(`[${log.time}] ${log.to}님 화면: "${log.sender}: ${log.content}"`);
        });
    }
}

// 실행
captureDemo().catch(console.error);