const db = require('../db');
const { getIo } = require('../websocket');

// POST / 새 일정 만들기
exports.createSchedule = async (req, res) => {
  const { userId, teamId } = req.user;
  const { title, description, start_time, end_time } = req.body;
  let { color } = req.body;

  if (!title) {
    return res.status(400).json({ message: '제목(title)은 필수입니다.' });
  }

  try {
    color = color.toUpperCase();

    const query =
      'INSERT INTO schedules (user_id, team_id, title, description, start_time, end_time, color) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const result = await db.query(query, [
      userId,
      teamId,
      title,
      description,
      start_time,
      end_time,
      color,
    ]);

    const io = getIo();
    io.to(teamId).emit('scheduleAdded', {
      message: '새로운 일정이 추가되었습니다.',
      schedule: result.rows[0],
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createSchedule 에러:', err);
    res.status(500).json({ message: '일정 생성에 실패했습니다.' });
  }
};

// GET / 모든 팀 일정 가져오기
exports.getSchedules = async (req, res) => {
  const { teamId } = req.user;

  try {
    const query = 'SELECT * FROM schedules WHERE team_id = $1';
    const result = await db.query(query, [teamId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getSchedules 에러:', err);
    res.status(500).json({ message: '일정 조회에 실패했습니다.' });
  }
};

// GET /month 해당 월 일정 가져오기
exports.getSchedulesByMonth = async (req, res) => {
  //    (예: /:schedulesId?year=2025&month=3)
  const { teamId } = req.user;
  const { year, month } = req.query; // '2025'와 '3' (문자열)

  if (!year || !month) {
    return res.status(400).json({ message: 'year와 month는 필수입니다.' });
  }

  try {
    // 검색할 월의 첫날(monthStart)과 마지막 날(monthEnd)을 계산

    // parseInt로 숫자로 변경
    // JS의 Date 객체는 월이 0부터 시작하므로 (0=1월, 1=2월...) month - 1을 해줍니다.
    const yearNum = parseInt(year);
    const monthNum = parseInt(month); // 1-based (예: 3월은 3)

    // 캘린더 화면상 이전 달/다음 달 일부가 보일 수 있으므로 여유 있게 검색 범위를 잡습니다.
    // (예: 해당 월 1일 - 7일 ~ 해당 월 말일 + 7일)
    const searchStart = new Date(yearNum, monthNum - 1, -6);
    const searchEnd = new Date(yearNum, monthNum, 7);

    // 월의 첫날 (예: 2025년 3월 1일 00:00:00)
    const monthStart = new Date(yearNum, monthNum - 1, 1);

    // 월의 마지막 날 (예: 2025년 3월 31일 23:59:59)
    // (다음 달 1일에서 0일을 가져오면 이번 달의 마지막 날이 됨)
    const monthEnd = new Date(yearNum, monthNum, 0);
    // 만약 end_time이 TIMESTAMP(시간 포함)라면,
    // 마지막 날의 23시 59분 59초로 설정해야 그날 끝나는 일정도 포함됩니다.
    monthEnd.setHours(23, 59, 59, 999);

    // [핵심 수정] schedules 테이블과 tasks 테이블을 조인하여 진행률 계산
    const query = `
      SELECT 
        s.*,
        COALESCE(COUNT(t.task_id), 0) AS total_tasks,
        COALESCE(SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END), 0) AS completed_tasks
      FROM schedules s
      LEFT JOIN tasks t ON s.schedule_id = t.schedule_id
      WHERE s.team_id = $1 
      AND s.end_time >= $2 
      AND s.start_time <= $3
      GROUP BY s.schedule_id
      ORDER BY s.start_time ASC
    `;

    const result = await db.query(query, [teamId, searchStart, searchEnd]);

    // 숫자로 변환 (COUNT 결과는 문자열로 올 수 있음)
    const schedules = result.rows.map((row) => ({
      ...row,
      total_tasks: parseInt(row.total_tasks),
      completed_tasks: parseInt(row.completed_tasks),
    }));

    res.status(200).json(schedules);
  } catch (err) {
    console.error('일정 조회 에러:', err);
    res.status(500).json({ message: '일정 조회에 실패했습니다.' });
  }
};

// PUT /:scheduleId 일정 수정
exports.updateSchedule = async (req, res) => {
  const { scheduleId } = req.params;
  const { title, description, notes, start_time, end_time } = req.body;
  let { color } = req.body;

  color = color.toUpperCase();

  try {
    const query = `
      UPDATE schedules 
      SET title=$1, description=$2, notes=$3, start_time=$4, end_time=$5, color=$6
      WHERE schedule_id = $7
      RETURNING *
    `;

    // (참고: start_time, end_time은 프론트에서 toISOString()으로 보낸다고 가정)
    const result = await db.query(query, [
      title,
      description,
      notes,
      start_time,
      end_time,
      color,
      scheduleId,
    ]);

    if (result.rowCount === 0) return res.status(404).json({ message: '일정 없음' });

    const io = getIo();
    // 수정된 일정 정보를 소켓으로 전송 (캘린더 갱신용)
    io.to(req.user.teamId).emit('scheduleUpdated', {
      message: '일정이 수정되었습니다.',
      schedule: result.rows[0],
    });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('일정 수정 에러:', err);
    res.status(500).json({ message: '일정 수정 실패' });
  }
};

// DELETE /scheduleId 스케쥴 제거
exports.deleteSchedule = async (req, res) => {
  const { teamId } = req.user;
  const { scheduleId } = req.params;

  try {
    const query = 'DELETE FROM schedules WHERE schedule_id = $1';
    const result = await db.query(query, [scheduleId]);

    // 삭제된 행이 없는 경우 404 반환
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '삭제할 일정을 찾을 수 없습니다.' });
    }

    const io = getIo();
    io.to(teamId).emit('scheduleRemoved', {
      message: '일정이 삭제되었습니다.',
      schedule: scheduleId,
    });

    res.status(200).json({ message: '일정이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    console.error('deleteSchedule 에러:', err);
    res.status(500).json({ message: '일정 삭제에 실패했습니다.' });
  }
};
