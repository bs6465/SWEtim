// auth.controller.js
const db = require('../db'); // (db 연결 파일 경로)
const auth = require('../utils/password.utils'); // (auth 유틸 파일 경로)
const jwttoken = require('../utils/jwttoken.utils'); // (auth 유틸 파일 경로)
const { getIo } = require('../websocket');
/*
로그인, 회원가입 로직
*/

exports.getUsers = async (req, res) => {
  try {
    const query = 'SELECT user_id, username, team_id FROM public.users';
    const { rows } = await db.query(query);
    res.status(200).json({ message: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 'verifyToken' 미들웨어를 중간에 추가!
exports.getMe = async (req, res) => {
  const { userId } = req.user;
  try {
    const query = 'SELECT user_id, username, team_id FROM users WHERE user_id = $1';
    const userProfile = await db.query(query, [userId]);

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }
    res.status(200).json(userProfile.rows[0]);
  } catch (err) {
    console.error('GetMe 에러:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};

// 회원가입
exports.register = async (req, res) => {
  /*
    회원가입
    curl -d '{"username":"kcd", "password":"aa12"}' \
    -H "Content-Type: application/json" \
    -X POST [ip]/auth/register/
    */
  const { username, password } = req.body;
  let hashedPassword;
  try {
    hashedPassword = await auth.hashPassword(password);
  } catch (hashError) {
    console.error('Hashing Error:', hashError);
    return res.status(500).json({ message: 'Server Error during password processing' });
  }

  try {
    const query =
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id, username';
    const result = await db.query(query, [username, hashedPassword]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ message: '이미 사용 중인 ID입니다.' });
    } else {
      console.error('Server Error:', err);
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

// 2. 로그인 로직 (JWT 토큰까지)
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = 'SELECT user_id, username, password, team_id FROM users WHERE username = $1';
    // 1. DB에서 사용자 정보 가져오기
    const result = await db.query(query, [username]);

    // 2. 사용자가 존재하지 않는 경우
    if (result.rows.length === 0) {
      return res.status(401).json({ message: '아이디가 일치하지 않습니다.' });
    }

    const user = result.rows[0];
    const storedHashedPassword = user.password;

    // 3. 비밀번호 비교
    const isMatch = await auth.comparePassword(password, storedHashedPassword);

    if (!isMatch) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // 5. (중요) 로그인 성공
    try {
      const tokenPayload = {
        userId: user.user_id,
        username: user.username,
        teamId: user.team_id,
      };

      token = jwttoken.generateToken(tokenPayload);

      res.status(200).json({
        message: '로그인 성공!',
        token: token, // 클라이언트는 이 토큰을 저장합니다.
      });
    } catch (error) {
      console.error('Token Generation Error:', error);
      res.status(500).json({ message: 'Token Error' });
    }
  } catch (err) {
    console.error('Login Server Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
