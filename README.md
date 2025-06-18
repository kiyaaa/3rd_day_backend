# 연결이(Yeongyul) - Real-time Expert Matching Platform Backend

실시간 전문가 매칭 플랫폼의 백엔드 서버입니다.

## 🚀 주요 기능

- **실시간 전문가 매칭**: AI 기반 RAG 시스템으로 질문에 최적의 전문가 매칭
- **WebSocket 실시간 채팅**: Socket.io를 활용한 실시간 그룹 채팅
- **JWT 인증**: 안전한 사용자 인증 시스템
- **데모 모드**: 로그인 없이 바로 체험 가능

## 🛠️ 기술 스택

- **Backend**: Node.js, Express.js
- **WebSocket**: Socket.io
- **Database**: PostgreSQL (In-memory for demo)
- **Authentication**: JWT
- **Cache**: Redis (Mock for demo)

## 📦 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일 수정
```

### 3. 서버 실행
```bash
npm start
# 또는 개발 모드
npm run dev
```

### 4. 웹 데모 실행

브라우저에서 4개의 창을 열어주세요:
- http://localhost:3004/demo/alex.html (질문자)
- http://localhost:3004/demo/sarah.html (React 전문가)
- http://localhost:3004/demo/mike.html (Node.js 전문가)
- http://localhost:3004/demo/server-monitor.html (서버 모니터)

## 📁 프로젝트 구조

```
├── src/
│   ├── api/              # REST API 라우트
│   ├── middleware/       # Express 미들웨어
│   ├── models/           # 데이터베이스 모델
│   ├── services/         # 비즈니스 로직
│   ├── utils/            # 유틸리티 함수
│   ├── websocket/        # WebSocket 핸들러
│   └── server.js         # 메인 서버 파일
├── web-clients/          # 웹 데모 UI
├── clients/              # 터미널 클라이언트
└── package.json
```

## 🎮 데모 사용법

1. 각 브라우저 창을 세로로 길게 (폭 400px) 배치
2. Alex 창에서 "질문 등록" 버튼 클릭
3. Sarah, Mike 창에 나타난 알림에서 "수락" 클릭
4. Alex 창에서 "채팅방 생성하기" 클릭
5. 각 전문가 창에서 "채팅방 입장하기" 클릭
6. 실시간으로 대화 시작!

## 📚 API 문서

### Authentication
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 내 정보

### Questions
- `POST /api/questions` - 질문 등록
- `GET /api/questions` - 질문 목록
- `PUT /api/questions/:id` - 질문 수정

### Chat
- `POST /api/chat/rooms` - 채팅방 생성
- `GET /api/chat/rooms/:id/messages` - 메시지 조회

### WebSocket Events
- `join_room` - 채팅방 입장
- `send_message` - 메시지 전송
- `typing_start/stop` - 타이핑 인디케이터

## 🔗 관련 프로젝트

- [fancyQaChat](https://github.com/kiyaaa/fancyQaChat) - 프로젝트 설계 문서 및 데모

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License

## 👥 팀

- Backend Development: Claude & Human Collaboration
- UI/UX Design: 메신저 스타일 인터페이스
- System Architecture: 마이크로서비스 기반 설계

---

🔧 Developed with ❤️ using Claude Code Assistant