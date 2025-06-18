# 연결이 Knowledge Matching Service - 시스템 아키텍처

## 1. 시스템 개요

실시간 질문자-전문가 매칭 및 채팅 서비스를 위한 아키텍처 설계

### 핵심 기능
- 질문자가 질문 등록
- RAG API를 통한 전문가 매칭
- 실시간 알림 및 채팅
- 다중 전문가 참여 그룹 채팅

## 2. 기술 스택

### Backend
- **Node.js + Express**: REST API 서버
- **Socket.io**: WebSocket 통신
- **Redis**: 세션 관리, 실시간 데이터 캐싱
- **PostgreSQL**: 주 데이터베이스
- **Elasticsearch**: 전문가 검색 및 매칭

### Frontend
- **React/Vue.js**: SPA 프레임워크
- **Socket.io Client**: 실시간 통신
- **Redux/Vuex**: 상태 관리

### AI/ML
- **RAG (Retrieval-Augmented Generation)**: 전문가 매칭
- **Vector Database (Pinecone/Weaviate)**: 임베딩 저장
- **OpenAI/Claude API**: 자연어 처리

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (Nginx)                     │
└─────────────────┬───────────────────────────┬───────────────────┘
                  │                           │
        ┌─────────▼─────────┐       ┌─────────▼─────────┐
        │   API Server      │       │  WebSocket Server │
        │   (Express)       │       │   (Socket.io)     │
        └─────────┬─────────┘       └─────────┬─────────┘
                  │                           │
        ┌─────────▼───────────────────────────▼─────────┐
        │                 Redis Cluster                  │
        │         (Session + Pub/Sub + Cache)           │
        └─────────┬───────────────────────────┬─────────┘
                  │                           │
        ┌─────────▼─────────┐       ┌─────────▼─────────┐
        │   PostgreSQL      │       │   Elasticsearch   │
        │   (Main DB)       │       │  (Search Engine)  │
        └───────────────────┘       └───────────────────┘
                  │
        ┌─────────▼─────────┐
        │    RAG System     │
        │  (Vector DB +     │
        │   LLM API)        │
        └───────────────────┘
```

## 4. 핵심 컴포넌트

### 4.1 API Server
- 사용자 인증/인가
- 질문 등록 및 관리
- 전문가 프로필 관리
- 채팅방 생성 및 관리

### 4.2 WebSocket Server
- 실시간 메시지 전송
- 온라인 상태 관리
- 알림 푸시
- 타이핑 인디케이터

### 4.3 RAG System
- 질문 분석 및 임베딩
- 전문가 매칭 알고리즘
- 유사도 스코어링
- 전문 분야 카테고리화

### 4.4 Message Queue
- 비동기 작업 처리
- 알림 발송 큐
- RAG 처리 큐

## 5. 데이터베이스 스키마

### Users 테이블
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    role ENUM('questioner', 'expert', 'both'),
    created_at TIMESTAMP
);
```

### Experts 테이블
```sql
CREATE TABLE experts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    specialties JSONB,
    experience_years INTEGER,
    rating DECIMAL(3,2),
    total_answers INTEGER DEFAULT 0,
    embedding_vector VECTOR(1536)
);
```

### Questions 테이블
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content TEXT,
    category VARCHAR(50),
    urgency ENUM('low', 'medium', 'high'),
    status ENUM('pending', 'matched', 'in_progress', 'resolved'),
    created_at TIMESTAMP
);
```

### ChatRooms 테이블
```sql
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY,
    question_id UUID REFERENCES questions(id),
    created_at TIMESTAMP,
    status ENUM('active', 'closed')
);
```

### Messages 테이블
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id),
    sender_id UUID REFERENCES users(id),
    content TEXT,
    type ENUM('text', 'file', 'system'),
    created_at TIMESTAMP
);
```

## 6. API 엔드포인트

### REST API
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/users/profile
PUT    /api/users/profile

POST   /api/questions
GET    /api/questions/:id
PUT    /api/questions/:id/status

GET    /api/experts/search
GET    /api/experts/:id
POST   /api/experts/specialties

POST   /api/chat-rooms
GET    /api/chat-rooms/:id
POST   /api/chat-rooms/:id/invite
POST   /api/chat-rooms/:id/messages
```

### WebSocket Events
```javascript
// Client -> Server
socket.emit('join_room', { roomId, userId })
socket.emit('leave_room', { roomId, userId })
socket.emit('send_message', { roomId, message })
socket.emit('typing_start', { roomId, userId })
socket.emit('typing_stop', { roomId, userId })
socket.emit('accept_question', { questionId, expertId })

// Server -> Client
socket.on('new_message', { message, sender })
socket.on('user_joined', { userId, userName })
socket.on('user_left', { userId })
socket.on('typing_indicator', { userId, isTyping })
socket.on('question_assigned', { question })
socket.on('expert_matched', { experts })
```

## 7. 실시간 통신 플로우

### 질문 등록 및 매칭
```
1. 질문자가 질문 등록
   POST /api/questions
   
2. RAG 시스템으로 질문 분석
   - 질문 임베딩 생성
   - Vector DB에서 유사 전문가 검색
   - 매칭 스코어 계산
   
3. 상위 3-5명 전문가 선정
   - 전문 분야 매칭률
   - 평점 및 응답률
   - 온라인 상태
   
4. 선정된 전문가에게 실시간 알림
   socket.emit('question_assigned', data)
   
5. 전문가 수락/거절
   socket.emit('accept_question', data)
   
6. 채팅방 생성 및 참여자 초대
   POST /api/chat-rooms
```

## 8. 보안 고려사항

### 인증/인가
- JWT 토큰 기반 인증
- Role-based Access Control (RBAC)
- WebSocket 연결 시 토큰 검증

### 데이터 보안
- HTTPS/WSS 암호화 통신
- SQL Injection 방지
- XSS 방지 (메시지 sanitization)
- Rate Limiting

## 9. 확장성 고려사항

### 수평 확장
- Stateless API 서버
- Redis Pub/Sub for WebSocket clustering
- Database read replicas

### 성능 최적화
- Redis 캐싱 전략
- Message pagination
- Lazy loading for chat history
- CDN for static assets

## 10. 모니터링 및 로깅

### 모니터링
- Prometheus + Grafana
- Application Performance Monitoring (APM)
- Real-time dashboard

### 로깅
- ELK Stack (Elasticsearch, Logstash, Kibana)
- 구조화된 로깅
- 에러 추적 (Sentry)

## 11. 배포 전략

### 컨테이너화
```dockerfile
# API Server Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 오케스트레이션
- Kubernetes for container orchestration
- Helm charts for deployment
- CI/CD pipeline (GitHub Actions)

## 12. 예상 시스템 요구사항

### 초기 단계 (사용자 1,000명)
- API Server: 2 instances (2 vCPU, 4GB RAM)
- WebSocket Server: 2 instances (2 vCPU, 4GB RAM)
- PostgreSQL: 1 instance (4 vCPU, 8GB RAM)
- Redis: 1 instance (2 vCPU, 4GB RAM)

### 성장 단계 (사용자 10,000명)
- API Server: 4-6 instances
- WebSocket Server: 4-6 instances
- PostgreSQL: Primary + 2 Read Replicas
- Redis Cluster: 3 nodes
- Elasticsearch Cluster: 3 nodes