const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const {
  verifyToken,
  checkAuth,
  checkTeamOwner,
  checkAuthAndTeam,
} = require('../middleware/authMiddleware'); // 미들웨어 경로

// POST / 새 팀 결성
router.post('/', [verifyToken, checkAuth], teamController.createTeam);

// GET / 내가 속한 팀 가져오기
router.get('/', [verifyToken, checkAuthAndTeam], teamController.getTeam);

// GET /get-team-id 내 팀 id 가져오기
router.get('/get-team-id', [verifyToken, checkAuth], teamController.findTeamId);

// POST /change 왕위계승
router.post('/change', [verifyToken, checkTeamOwner], teamController.changeTeamOwner);

// DELETE /delete-team 팀 제거
router.delete('/delete-team', [verifyToken, checkTeamOwner], teamController.deleteTeam);

// POST /members 새 팀원 추가
router.post('/members', [verifyToken, checkTeamOwner], teamController.addMember);

// DELETE /me 팀 나가기
router.delete('/me', [verifyToken, checkAuthAndTeam], teamController.leaveTeam);

// DELETE /members 팀원 퇴출
router.delete('/members', [verifyToken, checkTeamOwner], teamController.removeMember);

module.exports = router;
