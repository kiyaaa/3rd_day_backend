# Q&A Expert 챗봇 UI

전문가 Q&A API를 테스트하고 사용할 수 있는 챗봇 UI 애플리케이션입니다.

## 구성 요소

1. **API 테스터** (`index.html`) - API 엔드포인트를 직접 테스트
2. **인터랙티브 데모** (`demo.html`) - 시나리오 기반 데모
3. **챗봇 UI** (`chatbot.html`) - 실제 사용 가능한 챗봇 인터페이스

## 설치 및 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. API 서버 설정
`config.js` 파일을 열어 API 서버 주소를 변경하세요:

```javascript
const API_CONFIG = {
    // Base URL configuration
    BASE_URL: process.env.API_BASE_URL || 'https://your-api-server.com',
    
    // API version (필요시 변경)
    API_VERSION: 'v1',
    
    // API endpoints (필요시 추가/수정)
    ENDPOINTS: {
        REGISTER_SPECIALTY: '/register-specialty',
        GET_MY_SPECIALTY: '/my-specialty/{userId}',
        // ... 기타 엔드포인트
    }
};
```

환경 변수를 사용하여 설정할 수도 있습니다:
```bash
API_BASE_URL=https://your-api-server.com npm start
```

만약 실제 API 서버를 사용한다면, `app.js`의 `makeAPICall` 함수를 다음과 같이 수정하세요:

```javascript
async function makeAPICall(method, endpoint, body) {
    const url = BASE_URL + endpoint;
    
    try {
        addChatMessage('🔄 요청 전송 중...', 'system');
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        // 실제 API 호출
        const response = await fetch(url, options);
        const data = await response.json();
        
        // Store questionId if returned
        if (data.questionId) {
            currentQuestionId = data.questionId;
        }
        
        addChatMessage(formatJSON(data), 'response', response.ok);
        
        // Simulate WebSocket events
        simulateWsEvents(endpoint, data);
        
    } catch (error) {
        addChatMessage(`❌ 오류 발생: ${error.message}`, 'error');
    }
}
```

### 3. 서버 실행
```bash
npm start
# 또는
node server.js
```

### 4. 브라우저에서 접속
- API 테스터: http://localhost:3000
- 데모: http://localhost:3000/demo
- 챗봇: http://localhost:3000/chatbot

## API 엔드포인트

### 전문 분야 관리
- `POST /api/v1/register-specialty` - 전문 분야 등록
- `GET /api/v1/my-specialty/{userId}` - 내 전문 분야 조회

### 질문하기
- `POST /api/v1/ask-question` - 질문 등록
- `GET /api/v1/my-questions/{userId}` - 내 질문 조회

### 답변하기
- `GET /api/v1/assigned-questions/{userId}` - 할당된 질문 조회
- `POST /api/v1/submit-answer` - 답변 제출
- `GET /api/v1/question-answers/{questionId}` - 답변 확인

## 주요 기능

### 챗봇 UI (`/chatbot`)
- 음성 입력
- 파일 첨부
- 이모지 지원
- 메시지 관리 (복사/삭제/고정)
- 대화 내보내기
- 실시간 알림

### API 테스터 (`/`)
- 모든 API 엔드포인트 테스트
- 요청/응답 시각화
- WebSocket 이벤트 모니터링

### 데모 (`/demo`)
- 전문가 등록 시나리오
- 질문자 시나리오
- 전체 플로우 시나리오

## 커스터마이징

### 테마 색상 변경
`chatbot.html`의 CSS 변수를 수정하세요:
```css
:root {
    --primary-color: #3b82f6;
    --secondary-color: #8b5cf6;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
}
```

### 사용자 정보 변경
`chatbot.js`에서 기본 사용자 정보를 수정하세요:
```javascript
let currentUser = {
    id: 'U123456',
    name: '김삼성',
    level: 3,
    specialties: ['CMP 공정', '스크래치 불량 분석', '표면 결함 검사']
};
```

## 문제 해결

### CORS 오류
API 서버에서 CORS를 허용해야 합니다. 서버에 다음 헤더를 추가하세요:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### WebSocket 연결 실패
현재는 WebSocket 이벤트를 시뮬레이션합니다. 실제 WebSocket 서버를 사용하려면 `app.js`의 `initWebSocket` 함수를 수정하세요.

## 라이센스
MIT