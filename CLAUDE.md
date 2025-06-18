# 연결이(Yeongyul) 프로젝트 - Claude Code 작업 가이드

## 프로젝트 요약
**연결이**는 질문자와 전문가를 실시간으로 매칭하는 지식 공유 플랫폼입니다. RAG 시스템으로 최적의 전문가를 찾아 WebSocket 기반 실시간 채팅으로 연결합니다.

## 현재 프로젝트 상태
- ✅ UI/UX 데모 완성 (메신저 스타일)
- ✅ 시스템 아키텍처 설계 완료
- ✅ 데이터베이스 스키마 설계 완료
- ⏳ 백엔드 API 구현 필요
- ⏳ WebSocket 서버 구현 필요
- ⏳ RAG 매칭 시스템 구현 필요

## 주요 파일 위치
```
/data/data/com.termux/files/home/prj/fancyQaChat/
├── PROJECT_CONTEXT.md      # 전체 프로젝트 상세 컨텍스트
├── architecture.md         # 시스템 아키텍처 문서
├── implementation-guide.md # 구현 가이드
├── yeongyul-demo.html     # 4창 데모 UI
├── chatbot.html           # 단일 채팅 UI
└── server.js              # 현재 데모 서버
```

## 기술 스택
- **Backend**: Node.js, Express, Socket.io, PostgreSQL, Redis
- **Frontend**: React/Vue, Socket.io-client, Tailwind CSS
- **AI/ML**: OpenAI API, Vector DB (Pinecone), RAG System

## 다음 단계 작업
1. **백엔드 기본 구조 생성**
   - Express 서버 설정
   - PostgreSQL 연결
   - JWT 인증 시스템

2. **WebSocket 서버 구현**
   - Socket.io 서버 설정
   - 실시간 이벤트 핸들러
   - Redis Pub/Sub 연동

3. **RAG 매칭 시스템**
   - OpenAI 임베딩 생성
   - Vector DB 연동
   - 매칭 알고리즘 구현

4. **프론트엔드 개발**
   - React 앱 생성
   - 실시간 채팅 컴포넌트
   - 상태 관리 (Redux)

## 작업 시 참고사항
- 모든 API는 JWT 인증 필요
- WebSocket 연결 시 토큰 검증
- 메시지는 PostgreSQL에 저장
- Redis는 실시간 데이터만 캐싱
- 확장성을 위해 마이크로서비스 구조 고려

## 테스트 방법
```bash
# 현재 데모 서버 실행
node server.js

# 데모 페이지 접속
http://localhost:3000/yeongyul-demo.html
```

상세한 내용은 PROJECT_CONTEXT.md 파일을 참조하세요.