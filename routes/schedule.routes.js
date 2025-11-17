const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { verifyToken, checkAuthAndTeam } = require('../middleware/authMiddleware'); // 미들웨어 경로

// POST / 새 일정 만들기
router.post('/', [verifyToken, checkAuthAndTeam], scheduleController.createSchedule);

// GET / 모든 팀 일정 가져오기
router.get('/', [verifyToken, checkAuthAndTeam], scheduleController.getSchedules);

// GET /month 해당 월 일정 가져오기
router.get('/month', [verifyToken, checkAuthAndTeam], scheduleController.getSchedulesByMonth);

// DELETE /scheduleId 스케쥴 제거
router.delete('/:scheduleId', [verifyToken, checkAuthAndTeam], scheduleController.deleteSchedule);

module.exports = router;
