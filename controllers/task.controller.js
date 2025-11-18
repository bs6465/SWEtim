const db = require('../db');
const { getIo } = require('../websocket');

// POST /scheduleId 일정의 새 체크리스트 만들기
exports.createTask = async (req, res) => {
  const { teamId } = req.user;
  const { scheduleId } = req.params;
  const { title, managerId, due_date } = req.body;

  if (!title) {
    return res.status(400).json({ message: '제목(title)은 필수입니다.' });
  }

  try {
    const query =
      'INSERT INTO tasks (schedule_id, title, manager_id, due_date) VALUES ($1, $2, $3, $4) RETURNING *';
    const result = await db.query(query, [scheduleId, title, managerId, due_date]);

    const io = getIo();
    io.to(teamId).emit('createTask', {
      message: '체크리스트 생성.',
      scheduleId: scheduleId,
      taskId: result.rows[0].task_id,
      title: title,
      managerId: managerId,
      due_date: due_date,
    });

    res.status(201).json({
      message: '체크리스트 생성 완료',
      task: result.rows[0], //
    });
  } catch (err) {
    console.error('createTask 에러:', err);
    res.status(500).json({ message: '체크리스트 생성에 실패했습니다.' });
  }
};

// GET /scheduleId 일정의 등록된 체크리스트 가져오기
exports.getTasks = async (req, res) => {
  const { scheduleId } = req.params;

  try {
    const query = 'SELECT * FROM tasks WHERE schedule_id = $1';
    const result = await db.query(query, [scheduleId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getTasks 에러:', err);
    res.status(500).json({ message: '체크리스트 조회에 실패했습니다.' });
  }
};

// PUT /taskID 체크리스트 완료/미완료 체크하기
exports.complete = async (req, res) => {
  const { teamId } = req.user;
  const { taskId } = req.params;
  const { isCompleted } = req.body;

  try {
    const query = 'UPDATE tasks SET is_completed = $1 WHERE task_id = $2 RETURNING *';
    const result = await db.query(query, [isCompleted, taskId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '해당 태스크를 찾을 수 없습니다.' });
    }

    const io = getIo();
    io.to(teamId).emit('isTaskCompletedChanged', {
      message: '체크리스트 상태가 변경되었습니다.',
      taskId: taskId,
      isCompleted: isCompleted,
    });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    // 에러 로깅 및 500 상태 코드
    console.error('complete Task 에러:', err);
    res.status(500).json({ message: '체크리스트 변경에 실패했습니다.' });
  }
};

// DELETE /taskID 체크리스트 제거
exports.delete = async (req, res) => {
  const { teamId } = req.user;
  const { taskId } = req.params;

  try {
    const query = 'DELETE FROM tasks WHERE task_id = $1';
    const result = await db.query(query, [taskId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: '삭제할 태스크를 찾을 수 없습니다.' });
    }

    const io = getIo();
    io.to(teamId).emit('deleteTask', {
      message: '체크리스트 제거',
      taskId: taskId,
    });

    res.status(200).json({ message: '체크리스트가 성공적으로 삭제되었습니다.' });
  } catch (err) {
    console.error('delete Task 에러:', err);
    res.status(500).json({ message: '체크리스트 삭제에 실패했습니다.' });
  }
};
