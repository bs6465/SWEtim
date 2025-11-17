// 채팅 관련 이벤트(팀, 1:1)를 처리하는 핸들러
function registerChatHandlers(io, socket) {
  // 팀 채팅 핸들러
  const handleTeamMessage = (data) => {
    io.to(socket.teamId).emit('newTeamMessage', {
      from: socket.userId,
      text: data.msg,
      timestamp: new Date(),
    });
  };

  // 1:1 채팅 핸들러
  const handleDirectMessage = (data) => {
    const { toUserId, message } = data;
    const fromUserId = socket.userId;

    // 상대방에게 전송
    io.to(toUserId).emit('newDm', {
      from: fromUserId,
      text: message,
      timestamp: new Date(),
    });

    // 나에게도 전송 (동기화)
    io.to(fromUserId).emit('newDm', {
      to: toUserId,
      from: fromUserId,
      text: message,
      timestamp: new Date(),
    });
  };

  // 이 소켓에 대해 실제 이벤트 리스너 등록
  socket.on('sendTeamMessage', handleTeamMessage);
  socket.on('sendDm', handleDirectMessage);
}

module.exports = registerChatHandlers;
