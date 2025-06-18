# 연결이 Knowledge Matching Service - 구현 가이드

## 1. 프로젝트 구조

```
fancyQaChat/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── questions/
│   │   │   ├── experts/
│   │   │   └── chat/
│   │   ├── websocket/
│   │   │   ├── handlers/
│   │   │   └── middleware/
│   │   ├── services/
│   │   │   ├── rag/
│   │   │   ├── matching/
│   │   │   └── notification/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   ├── config/
│   ├── migrations/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   └── public/
└── docker/
```

## 2. Backend 구현

### 2.1 WebSocket 서버 (websocket/server.js)
```javascript
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const redis = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Redis adapter for scaling
const pubClient = redis.createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const user = await verifyToken(token);
    socket.userId = user.id;
    socket.userRole = user.role;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  
  // Update online status
  updateUserOnlineStatus(socket.userId, true);
  
  // Event handlers
  socket.on('join_room', async (data) => {
    const { roomId } = data;
    const hasAccess = await checkRoomAccess(socket.userId, roomId);
    
    if (hasAccess) {
      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('user_joined', {
        userId: socket.userId,
        userName: socket.userName
      });
    }
  });
  
  socket.on('send_message', async (data) => {
    const { roomId, message } = data;
    
    // Save message to database
    const savedMessage = await saveMessage({
      roomId,
      senderId: socket.userId,
      content: message,
      type: 'text'
    });
    
    // Broadcast to room
    io.to(`room:${roomId}`).emit('new_message', {
      message: savedMessage,
      sender: { id: socket.userId, name: socket.userName }
    });
  });
  
  socket.on('accept_question', async (data) => {
    const { questionId } = data;
    
    // Create chat room
    const room = await createChatRoom(questionId, socket.userId);
    
    // Notify questioner
    const question = await getQuestion(questionId);
    io.to(`user:${question.userId}`).emit('expert_accepted', {
      expert: { id: socket.userId, name: socket.userName },
      roomId: room.id
    });
  });
  
  socket.on('disconnect', () => {
    updateUserOnlineStatus(socket.userId, false);
  });
});
```

### 2.2 RAG 매칭 서비스 (services/rag/matching.js)
```javascript
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

class ExpertMatchingService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.pinecone = new PineconeClient();
    this.initPinecone();
  }
  
  async initPinecone() {
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENV
    });
    this.index = this.pinecone.Index('expert-embeddings');
  }
  
  async findMatchingExperts(question, topK = 5) {
    // 1. Generate embedding for question
    const embedding = await this.generateEmbedding(question.content);
    
    // 2. Search similar experts in vector DB
    const queryResponse = await this.index.query({
      vector: embedding,
      topK: topK * 2, // Get more candidates for filtering
      includeMetadata: true
    });
    
    // 3. Filter and rank experts
    const experts = await this.filterAndRankExperts(
      queryResponse.matches,
      question
    );
    
    // 4. Get detailed expert info
    const expertDetails = await this.getExpertDetails(
      experts.slice(0, topK)
    );
    
    return expertDetails;
  }
  
  async generateEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    return response.data[0].embedding;
  }
  
  async filterAndRankExperts(matches, question) {
    const rankedExperts = [];
    
    for (const match of matches) {
      const expert = await getExpertById(match.id);
      
      // Calculate composite score
      const score = this.calculateMatchScore({
        similarityScore: match.score,
        expertRating: expert.rating,
        responseRate: expert.responseRate,
        isOnline: expert.isOnline,
        categoryMatch: this.checkCategoryMatch(
          expert.specialties,
          question.category
        )
      });
      
      rankedExperts.push({ ...expert, matchScore: score });
    }
    
    // Sort by composite score
    return rankedExperts.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  calculateMatchScore(factors) {
    const weights = {
      similarity: 0.4,
      rating: 0.2,
      responseRate: 0.2,
      online: 0.1,
      category: 0.1
    };
    
    return (
      factors.similarityScore * weights.similarity +
      factors.expertRating * weights.rating +
      factors.responseRate * weights.responseRate +
      (factors.isOnline ? 1 : 0) * weights.online +
      (factors.categoryMatch ? 1 : 0) * weights.category
    );
  }
}
```

### 2.3 API 엔드포인트 (api/questions/controller.js)
```javascript
const { ExpertMatchingService } = require('../../services/rag/matching');
const matchingService = new ExpertMatchingService();

async function createQuestion(req, res) {
  try {
    const { content, category, urgency } = req.body;
    const userId = req.user.id;
    
    // 1. Save question to database
    const question = await Question.create({
      userId,
      content,
      category,
      urgency,
      status: 'pending'
    });
    
    // 2. Find matching experts
    const experts = await matchingService.findMatchingExperts(question);
    
    // 3. Create notifications for experts
    await notifyExperts(experts, question);
    
    // 4. Update question status
    await question.update({ status: 'matched' });
    
    res.json({
      success: true,
      question: question,
      matchedExperts: experts
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
}

async function notifyExperts(experts, question) {
  const notifications = experts.map(expert => ({
    type: 'new_question',
    recipientId: expert.userId,
    data: {
      questionId: question.id,
      preview: question.content.substring(0, 100) + '...',
      category: question.category,
      urgency: question.urgency,
      matchScore: expert.matchScore
    }
  }));
  
  // Send via WebSocket
  for (const notification of notifications) {
    io.to(`user:${notification.recipientId}`).emit(
      'question_assigned',
      notification.data
    );
  }
  
  // Save to database for persistence
  await Notification.bulkCreate(notifications);
}
```

## 3. Frontend 구현

### 3.1 WebSocket 연결 관리 (services/socket.js)
```javascript
import { io } from 'socket.io-client';
import store from '../store';

class SocketService {
  constructor() {
    this.socket = null;
  }
  
  connect(token) {
    this.socket = io(process.env.REACT_APP_WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      store.dispatch({ type: 'SET_CONNECTED', payload: true });
    });
    
    this.socket.on('disconnect', () => {
      store.dispatch({ type: 'SET_CONNECTED', payload: false });
    });
    
    this.socket.on('question_assigned', (data) => {
      store.dispatch({ type: 'NEW_QUESTION_ASSIGNED', payload: data });
      this.showNotification('새로운 질문이 배정되었습니다!');
    });
    
    this.socket.on('new_message', (data) => {
      store.dispatch({ type: 'ADD_MESSAGE', payload: data });
    });
    
    this.socket.on('user_joined', (data) => {
      store.dispatch({ type: 'USER_JOINED_ROOM', payload: data });
    });
  }
  
  joinRoom(roomId) {
    this.socket.emit('join_room', { roomId });
  }
  
  sendMessage(roomId, message) {
    this.socket.emit('send_message', { roomId, message });
  }
  
  acceptQuestion(questionId) {
    this.socket.emit('accept_question', { questionId });
  }
  
  showNotification(message) {
    if (Notification.permission === 'granted') {
      new Notification('연결이', {
        body: message,
        icon: '/logo.png'
      });
    }
  }
}

export default new SocketService();
```

### 3.2 채팅 컴포넌트 (components/ChatRoom.jsx)
```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import socketService from '../services/socket';

function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messages = useSelector(state => state.chat.messages[roomId] || []);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    socketService.joinRoom(roomId);
    loadChatHistory(roomId);
    
    return () => {
      socketService.leaveRoom(roomId);
    };
  }, [roomId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = () => {
    if (message.trim()) {
      socketService.sendMessage(roomId, message);
      setMessage('');
    }
  };
  
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(roomId);
      
      setTimeout(() => {
        setIsTyping(false);
        socketService.stopTyping(roomId);
      }, 1000);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="chat-room">
      <div className="messages-container">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
}
```

## 4. 데이터 흐름 시퀀스

```mermaid
sequenceDiagram
    participant Q as 질문자
    participant API as API Server
    participant RAG as RAG System
    participant WS as WebSocket Server
    participant E1 as 전문가1
    participant E2 as 전문가2
    participant DB as Database

    Q->>API: POST /api/questions
    API->>DB: Save Question
    API->>RAG: Find Matching Experts
    RAG->>RAG: Generate Embedding
    RAG->>RAG: Vector Search
    RAG-->>API: Return Top Experts
    API->>WS: Notify Experts
    WS->>E1: question_assigned event
    WS->>E2: question_assigned event
    
    E1->>WS: accept_question
    WS->>API: Create Chat Room
    API->>DB: Save Chat Room
    WS->>Q: expert_accepted event
    
    Q->>WS: join_room
    E1->>WS: join_room
    
    Q->>WS: send_message
    WS->>DB: Save Message
    WS->>E1: new_message event
    
    E2->>WS: accept_question
    WS->>Q: expert_joined event
    E2->>WS: join_room
```

## 5. 보안 구현

### JWT 인증 미들웨어
```javascript
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const questionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 questions per window
  message: '너무 많은 질문을 등록했습니다. 잠시 후 다시 시도해주세요.'
});

app.use('/api/questions', questionLimiter);
```

## 6. 배포 스크립트

### Docker Compose (docker-compose.yml)
```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/yeongyul
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  websocket:
    build: ./backend
    command: node src/websocket/server.js
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - api
      - websocket

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=yeongyul
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - api
      - websocket

volumes:
  postgres_data:
  redis_data:
```

이 아키텍처로 실제 서비스를 구현하면 데모에서 보여준 기능들을 모두 실현할 수 있습니다.