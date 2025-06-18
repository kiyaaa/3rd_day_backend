const express = require('express');
const router = express.Router();
const { demoUsers, generateDemoToken } = require('../../middleware/demoAuth');

// 데모 로그인 - 단순히 토큰만 반환
router.post('/auth/login', (req, res) => {
  const { email } = req.body;
  const user = demoUsers[email];
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'Demo user not found' }
    });
  }
  
  const token = generateDemoToken(email);
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email,
      name: user.name,
      role: user.role
    }
  });
});

// 데모 사용자 정보
router.get('/auth/me', (req, res) => {
  const email = req.headers['x-demo-user'] || 'alex@demo.com';
  const user = demoUsers[email];
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'Demo user not found' }
    });
  }
  
  res.json({
    success: true,
    user: {
      id: user.id,
      email,
      name: user.name,
      role: user.role
    }
  });
});

module.exports = router;