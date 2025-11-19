// team.controller.js
const db = require('../db');
const jwttoken = require('../utils/jwttoken.utils');
const { getIo } = require('../websocket');

// POST / 새 팀 결성
exports.createTeam = async (req, res) => {
  // 팀 확인
  if (req.user.teamId) return res.status(400).json({ message: '팀이 이미 존재합니다.' });

  const { userId, username } = req.user;
  const { teamName } = req.body;

  // REFACTOR: node-postgres(pg)의 트랜잭션 처리
  const client = await db.connect(); // DB 풀에서 커넥션 가져오기

  try {
    await client.query('BEGIN'); // 트랜잭션 시작

    // 1. 팀 생성
    const teamQuery = 'INSERT INTO teams (name, owner_userid) VALUES ($1, $2) RETURNING team_id';
    const resultTeam = await client.query(teamQuery, [teamName, userId]);
    const newTeamId = resultTeam.rows[0].team_id;

    // 2. 유저 정보에 팀 ID 업데이트
    const userQuery = 'UPDATE users SET team_id = $1 WHERE user_id = $2';
    await client.query(userQuery, [newTeamId, userId]);

    await client.query('COMMIT'); // 2개 모두 성공 시 확정

    // 3. 새 정보로 토큰 재발급
    const updatedUser = { userId, username, teamId: newTeamId };
    const token = jwttoken.generateToken(updatedUser);

    res.status(201).json({
      // 201 Created가 더 적절합니다.
      message: '팀 생성 완료!',
      token: token,
    });
  } catch (err) {
    await client.query('ROLLBACK'); // 하나라도 실패 시 모두 되돌리기
    console.error('팀 생성 중 에러:', err);
    // REFACTOR: 500 에러 반환
    res.status(500).json({ message: '팀 생성에 실패했습니다.' });
  } finally {
    client.release(); // 커넥션 반납 (필수!)
  }
};

// GET / 내가 속한 팀의 팀원 가져오기
exports.getTeam = async (req, res) => {
  const { teamId } = req.user;

  try {
    const query = 'SELECT user_id, username FROM users WHERE team_id = $1';
    const resultTeam = await db.query(query, [teamId]);

    const teamQuery = 'SELECT owner_userid FROM teams WHERE team_id = $1';
    const teamResult = await db.query(teamQuery, [teamId]);
    const ownerId = teamResult.rows[0]?.owner_userid;

    res.status(200).json({
      message: '팀 정보 완료',
      teamId: teamId,
      ownerId: ownerId,
      members: resultTeam.rows,
    });
  } catch (err) {
    console.error('팀원 찾기 중 에러:', err);
    res.status(500).json({ message: '팀 찾기 실패' });
  }
};

// GET / 내 팀 id 가져오기
exports.findTeamId = async (req, res) => {
  if (req.user.teamId) return res.status(200).json({ teamId: req.user.teamId });
  else {
    const { userId, username } = req.user;
    try {
      const query = 'SELECT team_id FROM users WHERE user_id = $1';
      const resultTeam = await db.query(query, [userId]);

      const teamId = resultTeam.rows[0]?.team_id || null;
      const updatedUser = { userId, username, teamId };
      const token = jwttoken.generateToken(updatedUser);

      res.status(200).json({
        message: '팀 정보 동기화 완료',
        token: token,
      });
    } catch (err) {
      console.error('팀 id 가져오기 에러:', err);
      res.status(500).json({ message: '팀 찾기 실패' });
    }
  }
};

// POST /change 왕위계승
exports.changeTeamOwner = async (req, res) => {
  // 팀오너 확인 완료
  const { teamId } = req.user;
  const { userId: newOwnerId } = req.body;

  try {
    const query = 'UPDATE teams SET owner_userid = $1 WHERE team_id = $2 RETURNING *';
    const resultTeam = await db.query(query, [newOwnerId, teamId]);

    res.status(200).json(resultTeam.rows[0]);
  } catch (err) {
    console.error('팀 소유주 변경 에러:', err);
    res.status(500).json({ message: '팀 소유주 변경 실패' });
  }
};

// DELETE /delete-team 팀 제거
exports.deleteTeam = async (req, res) => {
  // 팀오너 확인 완료
  const { teamId } = req.user;
  try {
    const query = 'DELETE FROM teams WHERE team_id = $1';
    const resultTeam = await db.query(query, [teamId]);
    res.status(200).json({ message: '팀 삭제 완료' });
  } catch (err) {
    console.error('팀 삭제 에러:', err);
    res.status(500).json({ message: '팀 삭제 실패' });
  }
};

// POST /members 새 팀원 추가
exports.addMember = async (req, res) => {
  // 팀오너 확인 완료
  const { teamId } = req.user;
  const { addUserId } = req.body;

  if (!addUserId) {
    return res.status(400).json({ message: '추가할 유저의 ID가 필요합니다.' });
  }

  try {
    const query = 'UPDATE users SET team_id = $1 WHERE username = $2 RETURNING *';
    const resultTeam = await db.query(query, [teamId, addUserId]);

    const io = getIo();
    io.to(teamId).emit('userAdded', {
      message: '새 팀원이 추가되었습니다.',
      user: resultTeam.rows[0].user_id,
      username: resultTeam.rows[0].username,
    });

    res.status(200).json({ message: '팀원 추가 완료' });
  } catch (err) {
    console.error('팀원 추가 에러:', err);
    res.status(500).json({ message: '팀원 추가 실패' });
  }
};

// DELETE /me 팀 나가기
exports.leaveTeam = async (req, res) => {
  const { userId, username, teamId } = req.user;

  try {
    // 팀장(Owner)인지 먼저 확인
    const teamQuery = 'SELECT owner_userid FROM teams WHERE team_id = $1';
    const teamResult = await db.query(teamQuery, [teamId]);

    if (teamResult.rows.length > 0) {
      const ownerId = teamResult.rows[0].owner_userid;
      if (ownerId === userId) {
        return res.status(400).json({
          message: '팀 소유주는 나갈 수 없습니다. 팀을 삭제하거나 소유권을 이전하세요.',
        });
      }
    }

    const query = 'UPDATE users SET team_id = NULL WHERE user_id = $1 RETURNING *';
    const resultTeam = await db.query(query, [userId]);

    const updatedUser = { userId, username, teamId: resultTeam.rows[0].team_id };
    const token = jwttoken.generateToken(updatedUser);

    const io = getIo();
    io.to(teamId).emit('removeUser', {
      message: '팀원 나감',
      user: userId,
    });

    res.status(200).json({
      message: '팀 나감 완료',
      token: token,
    });
  } catch (err) {
    console.error('팀원 나감 에러:', err);
    res.status(500).json({ message: '팀 나감 실패' });
  }
};

// DELETE /members 팀원 퇴출
exports.removeMember = async (req, res) => {
  // 팀오너 확인 완료
  const { userId: ownerId } = req.user;
  const { deleteUserId } = req.body;

  if (!deleteUserId) {
    return res.status(400).json({ message: '퇴출할 유저의 ID가 필요합니다.' });
  }

  // REFACTOR: 소유주는 자기 자신을 퇴출시킬 수 없음
  if (deleteUserId === ownerId) {
    return res
      .status(400)
      .json({ message: '팀 소유주는 자신을 퇴출시킬 수 없습니다. (팀 삭제 이용)' });
  }

  try {
    const query = 'UPDATE users SET team_id = NULL WHERE user_id = $1';
    const resultTeam = await db.query(query, [deleteUserId]);

    // 실제로 유저가 업데이트 되었는지 확인
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '해당 유저를 찾을 수 없습니다.' });
    }

    const io = getIo();
    io.to(teamId).emit('removeUser', {
      message: '팀원 퇴출 완료',
      user: deleteUserId,
    });

    res.status(200).json({ message: '팀원 퇴출 완료' });
  } catch (err) {
    console.error('팀원 퇴출 에러:', err);
    res.status(500).json({ message: '팀원 퇴출 실패' });
  }
};
