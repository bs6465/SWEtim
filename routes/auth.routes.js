const express = require('express');
const router = express.Router(); // express의 라우터 기능을 사용합니다.

/*
로그인, 회원가입 routes
*/

// 1. 실제 로직이 담긴 '컨트롤러'를 임포트
const authController = require('../controllers/auth.controller');
const { verifyToken, checkAuth } = require('../middleware/authMiddleware'); // 미들웨어 경로

// 2. 경로와 컨트롤러 함수를 연결
// GET / 모든 유저 가져오기
router.get('/', authController.getUsers);

// GET /me 내 정보 가져오기
router.get('/me', [verifyToken, checkAuth], authController.getMe);

// POST /users/ (회원가입) -> authController.register 함수
router.post('/register', authController.register);

// POST /users/login (로그인) -> authController.login 함수
router.post('/login', authController.login);

// 3. 이 라우터를 밖으로 내보냅니다.
module.exports = router;
