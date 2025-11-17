// websocket/index.js (수정된 버전)
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// 1. 핸들러 파일들 불러오기
const registerChatHandlers = require('./handlers/chatHandler');
const registerStatusHandlers = require('./handlers/statusHandler');

let io;

function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // 2. 인증 미들웨어 (동일)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.userId = decoded.userId;
      socket.teamId = decoded.teamId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // 3. 'connection' 이벤트 처리 (★ 아주 깔끔해짐)
  io.on('connection', async (socket) => {
    console.log(`새로운 유저 접속: ${socket.id}`);

    // 공통 방 입장
    socket.join(socket.teamId);
    socket.join(socket.userId);

    // --- 👇 [신규] 이 블록을 추가하세요 ---
    // 이 팀 방(teamId)에 현재 연결된 모든 소켓 정보를 가져옴
    const socketsInRoom = await io.in(socket.teamId).fetchSockets();
    // 각 소켓에 우리가 저장해둔 userId만 뽑아서 리스트 생성
    const onlineUserIds = socketsInRoom.map((s) => s.userId);

    // [중요] 방금 접속한 '나'에게만 현재 온라인 유저 목록 전송
    socket.emit('initialUserStatus', onlineUserIds);
    // --- 👆 [신규] 여기까지 ---

    // 4. 불러온 핸들러들을 등록!
    //    각 핸들러는 io와 현재 연결된 socket 객체를 인자로 받음
    registerStatusHandlers(io, socket);
    registerChatHandlers(io, socket);

    // 나중에 '일정' 기능이 추가되면?
    // const registerScheduleHandlers = require('./handlers/scheduleHandler');
    // registerScheduleHandlers(io, socket);
    // -> 이렇게 한 줄만 추가하면 됩니다.
  });
}

// getIo 함수 (동일)
function getIo() {
  if (!io) {
    throw new Error('Socket.io 서버가 초기화되지 않았습니다.');
  }
  return io;
}

module.exports = { initSocketIO, getIo };
