# 연결이(Yeongyul) - 실시간 지식 매칭 서비스 프로젝트 컨텍스트

## 프로젝트 개요

**연결이**는 질문자와 전문가를 실시간으로 매칭하여 연결해주는 지식 공유 플랫폼입니다. 
사용자가 기술적 질문을 등록하면 RAG(Retrieval-Augmented Generation) 시스템이 가장 적합한 전문가를 찾아 매칭하고, 실시간 채팅으로 문제를 해결할 수 있도록 지원합니다.

## 핵심 기능

### 1. 질문자 기능
- 기술적 질문 등록 (카테고리, 긴급도 설정)
- RAG 기반 자동 전문가 매칭 (3-5명 추천)
- 실시간 채팅을 통한 문제 해결
- 전문가 답변에 대한 피드백 제공

### 2. 전문가 기능
- 전문 분야 등록 및 프로필 관리
- 실시간 질문 알림 수신
- 질문 수락/거절 기능
- 그룹 채팅방 참여 및 협업 답변

### 3. 시스템 기능
- RAG 기반 지능형 전문가 매칭
- WebSocket 실시간 양방향 통신
- 다중 전문가 참여 그룹 채팅
- 지식 DB 자동 구축 및 강화

## 기술 스택

### Backend
```
- Node.js + Express.js (REST API)
- Socket.io (WebSocket 실시간 통신)
- PostgreSQL (주 데이터베이스)
- Redis (세션 관리, Pub/Sub, 캐싱)
- Elasticsearch (전문가 검색)
- Vector DB (Pinecone/Weaviate) - 임베딩 저장
```

### Frontend
```
- React.js or Vue.js (SPA)
- Socket.io-client (실시간 통신)
- Redux/Vuex (상태 관리)
- Tailwind CSS (스타일링)
```

### AI/ML
```
- OpenAI/Claude API (임베딩 생성)
- RAG System (전문가 매칭)
- Vector Search (유사도 검색)
```

## 프로젝트 구조

```
fancyQaChat/
├── backend/                    # 백엔드 서버
│   ├── src/
│   │   ├── api/               # REST API 엔드포인트
│   │   │   ├── auth/          # 인증 관련
│   │   │   ├── questions/     # 질문 관리
│   │   │   ├── experts/       # 전문가 관리
│   │   │   └── chat/          # 채팅 관리
│   │   ├── websocket/         # WebSocket 서버
│   │   │   ├── handlers/      # 이벤트 핸들러
│   │   │   └── middleware/    # WebSocket 미들웨어
│   │   ├── services/          # 비즈니스 로직
│   │   │   ├── rag/           # RAG 매칭 시스템
│   │   │   ├── matching/      # 전문가 매칭 알고리즘
│   │   │   └── notification/  # 알림 서비스
│   │   ├── models/            # 데이터베이스 모델
│   │   ├── middleware/        # Express 미들웨어
│   │   └── utils/             # 유틸리티 함수
│   ├── config/                # 설정 파일
│   ├── migrations/            # DB 마이그레이션
│   └── tests/                 # 테스트 코드
├── frontend/                  # 프론트엔드
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── services/         # API 서비스
│   │   ├── store/            # 상태 관리
│   │   └── utils/            # 유틸리티
│   └── public/               # 정적 파일
├── docs/                     # 문서
│   ├── architecture.md       # 시스템 아키텍처
│   └── implementation-guide.md # 구현 가이드
└── demo/                     # 데모 파일
    ├── chatbot.html          # 일반 챗봇 UI
    ├── yeongyul-demo.html    # 4창 데모 UI
    └── *.js                  # 관련 JS 파일
```

## 주요 API 엔드포인트

### REST API
```
# 인증
POST   /api/auth/register      # 회원가입
POST   /api/auth/login         # 로그인
POST   /api/auth/logout        # 로그아웃

# 사용자
GET    /api/users/profile      # 프로필 조회
PUT    /api/users/profile      # 프로필 수정

# 질문
POST   /api/questions          # 질문 등록
GET    /api/questions/:id      # 질문 상세
PUT    /api/questions/:id      # 질문 수정
GET    /api/questions/my       # 내 질문 목록

# 전문가
GET    /api/experts            # 전문가 목록
GET    /api/experts/:id        # 전문가 상세
POST   /api/experts/register   # 전문가 등록
PUT    /api/experts/specialties # 전문 분야 수정

# 채팅
POST   /api/chat-rooms         # 채팅방 생성
GET    /api/chat-rooms/:id     # 채팅방 정보
GET    /api/chat-rooms/:id/messages # 메시지 내역
```

### WebSocket Events
```javascript
// Client → Server
'join_room'        // 채팅방 참여
'leave_room'       // 채팅방 나가기
'send_message'     // 메시지 전송
'typing_start'     // 타이핑 시작
'typing_stop'      // 타이핑 중지
'accept_question'  // 질문 수락
'reject_question'  // 질문 거절

// Server → Client
'new_message'      // 새 메시지
'user_joined'      // 사용자 참여
'user_left'        // 사용자 나감
'typing_indicator' // 타이핑 표시
'question_assigned' // 질문 배정 알림
'expert_matched'   // 전문가 매칭 완료
'room_created'     // 채팅방 생성됨
```

## 데이터베이스 스키마

### 주요 테이블
```sql
-- 사용자
users (id, email, password, name, role, created_at)

-- 전문가 정보
experts (id, user_id, specialties[], experience_years, rating, embedding_vector)

-- 질문
questions (id, user_id, content, category, urgency, status, created_at)

-- 채팅방
chat_rooms (id, question_id, created_at, status)

-- 채팅방 참여자
room_participants (room_id, user_id, joined_at, role)

-- 메시지
messages (id, room_id, sender_id, content, type, created_at)

-- 전문가 매칭 기록
expert_matches (id, question_id, expert_id, match_score, status)
```

## 핵심 플로우

### 1. 질문 등록 및 매칭 프로세스
```
1. 질문자가 질문 등록
2. RAG 시스템이 질문 분석 및 임베딩 생성
3. Vector DB에서 유사한 전문가 검색
4. 매칭 스코어 계산 (전문성 + 평점 + 응답률 + 온라인 상태)
5. 상위 3-5명 전문가 선정
6. WebSocket으로 전문가들에게 실시간 알림
7. 전문가 수락 시 채팅방 자동 생성
```

### 2. 실시간 채팅 플로우
```
1. 전문가가 질문 수락
2. 채팅방 생성 및 질문자 알림
3. 질문자와 전문가 채팅방 입장
4. 실시간 메시지 교환
5. 다른 전문가 추가 참여 가능
6. 문제 해결 후 채팅방 종료
```

## 환경 변수 설정

```env
# Server
NODE_ENV=development
PORT=3000
WS_PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yeongyul
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# AI/ML
OPENAI_API_KEY=your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENV=your-pinecone-env

# Frontend
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3001
```

## 개발 시작하기

### 1. 백엔드 설정
```bash
cd backend
npm install
npm run migrate        # DB 마이그레이션
npm run seed          # 초기 데이터
npm run dev           # 개발 서버 시작
```

### 2. 프론트엔드 설정
```bash
cd frontend
npm install
npm start             # 개발 서버 시작
```

### 3. Docker로 전체 실행
```bash
docker-compose up -d
```

## 주의사항

1. **보안**: JWT 토큰 검증, SQL Injection 방지, XSS 방지 필수
2. **확장성**: Redis Cluster, 마이크로서비스 아키텍처 고려
3. **성능**: 메시지 페이지네이션, 캐싱 전략 중요
4. **실시간성**: WebSocket 연결 관리, 재연결 로직 필수

## 참고 문서

- `architecture.md`: 상세 시스템 아키텍처
- `implementation-guide.md`: 구현 가이드 및 코드 예제
- `yeongyul-demo.html/js`: 작동 데모 (4개 창 버전)
- `chatbot.html/js`: 단일 채팅 인터페이스

이 컨텍스트를 기반으로 실제 서비스를 구현할 수 있습니다.