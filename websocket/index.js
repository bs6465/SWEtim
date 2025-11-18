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

  // 2. 인증 미들웨어
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

  // 3. 'connection' 이벤트 처리
  io.on('connection', async (socket) => {
    console.log(`새로운 유저 접속: ${socket.id}`);

    // 공통 방 입장
    socket.join(socket.teamId);
    socket.join(socket.userId);

    const socketsInRoom = await io.in(socket.teamId).fetchSockets();
    // 각 소켓에 우리가 저장해둔 userId만 뽑아서 리스트 생성
    const onlineUserIds = socketsInRoom.map((s) => s.userId);

    // 방금 접속한 '나'에게만 현재 온라인 유저 목록 전송
    socket.emit('initialUserStatus', onlineUserIds);

    // 4. 불러온 핸들러들을 등록!
    //    각 핸들러는 io와 현재 연결된 socket 객체를 인자로 받음
    registerStatusHandlers(io, socket);
    registerChatHandlers(io, socket);
  });
}

// getIo 함수
function getIo() {
  if (!io) {
    throw new Error('Socket.io 서버가 초기화되지 않았습니다.');
  }
  return io;
}

module.exports = { initSocketIO, getIo };
