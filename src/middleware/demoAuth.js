// 데모용 자동 인증 미들웨어
const jwt = require('jsonwebtoken');
const config = require('../config');

// 데모 사용자 정보
const demoUsers = {
  'alex@demo.com': { id: 1, name: 'Alex Kim', role: 'user' },
  'sarah@demo.com': { id: 2, name: 'Sarah Lee', role: 'expert' },
  'mike@demo.com': { id: 3, name: 'Mike Park', role: 'expert' }
};

// 데모 모드에서 자동 토큰 생성
const generateDemoToken = (email) => {
  const user = demoUsers[email];
  if (!user) return null;
  
  return jwt.sign(
    { userId: user.id },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
};

// 데모 인증 미들웨어
const demoAuthMiddleware = (req, res, next) => {
  // /demo 경로의 API 요청에 대해 자동 인증
  if (req.path.startsWith('/demo/api/')) {
    const email = req.headers['x-demo-user'] || 'alex@demo.com';
    const user = demoUsers[email];
    
    if (user) {
      req.user = user;
      req.userId = user.id;
      return next();
    }
  }
  
  next();
};

module.exports = {
  demoAuthMiddleware,
  generateDemoToken,
  demoUsers
};