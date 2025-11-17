// 접속/종료, 온라인 상태 등과 관련된 이벤트를 처리하는 핸들러
function registerStatusHandlers(io, socket) {
  
  // 1. [접속 시] 팀원들에게 온라인 알림
  socket.broadcast.to(socket.teamId).emit('userOnline', {
    userId: socket.userId,
  });

  // 2. [종료 시] 팀원들에게 오프라인 알림
  const handleDisconnect = () => {
    console.log(`🔌 유저 접속 해제: ${socket.id}`);
    io.to(socket.teamId).emit('userOffline', {
      userId: socket.userId,
    });
  };

  // 이 소켓에 대해 실제 이벤트 리스너 등록
  socket.on('disconnect', handleDisconnect);
}

module.exports = registerStatusHandlers;
