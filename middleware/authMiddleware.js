const jwt = require('jsonwebtoken');
const db = require('../db');

/*
JWT 토큰을 바탕으로 user_id, username 가져오기
auth.controller.js 의 getMe 부분과 auth.routes.js의 getMe 참조
*/

exports.verifyToken = (req, res, next) => {
  // 1. 헤더에서 토큰 가져오기
  //    (클라이언트가 'Authorization': 'Bearer YOUR_TOKEN' 형태로 보냄)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 'Bearer ' 제거

  if (token == null) {
    return res.status(401).json({ message: '토큰이 없습니다.' });
  }
  
  // 2. 토큰 검증
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      // console.error('JWT 검증 오류:', err.name, ':', err.message);
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }

    // 3. 검증 성공! req 객체에 사용자 정보(payload)를 심어줌
    //    이제 이 요청을 처리하는 모든 라우터는 'req.user'로
    //    로그인한 사용자의 ID (payload)에 접근할 수 있습니다.
    req.user = user;
    next(); // 다음 미들웨어 또는 라우터 핸들러로 이동
  });
};

// 1. 로그인(인증) 여부만 확인하는 미들웨어 (기존과 동일)
exports.checkAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '인증 정보가 없습니다. (토큰 누락 또는 만료)' });
  }
  // 인증 통과!
  next();
};

// 2. checkAuth를 재사용하는 미들웨어
exports.checkAuthAndTeam = (req, res, next) => {
  exports.checkAuth(req, res, () => {
    // 2단계: checkAuth가 next()를 호출하면(즉, 통과하면) 이 함수가 실행됩니다.
    //         이제 여기서는 req.user가 존재함이 보장됩니다.
    if (!req.user.teamId) {
      return res.status(400).json({ message: '팀 ID가 필요합니다.' });
    }

    // 3단계: 팀 ID 체크도 통과하면, 라우터의 다음 단계로 넘어갑니다.
    next();
  });
};

// DB를 조회하여 맞는 팀인지 확인하기 => JWT에 teamId가 저장되므로 쓸 일이 없다
exports.chechRightTeam = (req, res, next) => {
  exports.checkAuthAndTeam(req, res, async () => {
    const { userId } = req.user; // 인증된 유저의 ID
    const { teamId } = req.user;
    try {
      const query = 'SELECT team_id FROM users WHERE user_id = $1';
      const userTeam = await db.query(query, [userId]);
      if (userTeam.rows.length === 0) {
        return res.status(404).json({ message: '해당 유저를 찾을 수 없습니다.' });
      }

      const userTeamId = userResult.rows.team_id;
      if (userTeamId !== teamId) {
        return res.status(403).json({ message: '권한이 없습니다. (팀원이 아님)' });
      }

      next();
    } catch (err) {
      console.error('팀 소유주 확인 중 에러:', err);
      res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
  });
};

// 2. 이 사람이 "팀 소유주"인지 확인하는 미들웨어
exports.checkTeamOwner = (req, res, next) => {
  exports.checkAuthAndTeam(req, res, async () => {
    try {
      const { userId, teamId } = req.user; // 인증된 유저의 ID

      const query = 'SELECT owner_userid FROM teams WHERE team_id = $1';
      const teamResult = await db.query(query, [teamId]);

      if (teamResult.rows.length === 0) {
        return res.status(404).json({ message: '해당 팀을 찾을 수 없습니다.' });
      }

      const ownerId = teamResult.rows[0].owner_userid;

      if (ownerId !== userId) {
        return res.status(403).json({ message: '권한이 없습니다. (팀 소유주가 아님)' });
      }

      // 모든 검증 통과! 다음 단계로
      next();
    } catch (err) {
      console.error('팀 소유주 확인 중 에러:', err);
      res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
  });
};
