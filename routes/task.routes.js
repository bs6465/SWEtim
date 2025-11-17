const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, checkAuthAndTeam } = require('../middleware/authMiddleware'); // 미들웨어 경로

// POST /scheduleId 일정의 새 체크리스트 만들기
router.post('/:scheduleId', [verifyToken, checkAuthAndTeam], taskController.createTask);

// GET /scheduleId 일정의 등록된 체크리스트 가져오기
router.get('/:scheduleId', [verifyToken, checkAuthAndTeam], taskController.getTasks);

// PUT /taskID 체크리스트 완료/미완료 체크하기
router.put('/:taskId/', [verifyToken, checkAuthAndTeam], taskController.complete);

// DELETE /taskID 체크리스트 제거
router.delete('/:taskId', [verifyToken, checkAuthAndTeam], taskController.delete);

module.exports = router;
