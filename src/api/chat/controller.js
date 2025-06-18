const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../../models/database');
const { AppError, asyncHandler } = require('../../middleware/errorHandler');

const createChatRoom = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { questionId } = req.body;
  const userId = req.user.id;

  const questionResult = await query(
    'SELECT user_id, status FROM questions WHERE id = $1',
    [questionId]
  );

  if (questionResult.rows.length === 0) {
    throw new AppError('Question not found', 404);
  }

  const question = questionResult.rows[0];

  if (question.status !== 'matched') {
    throw new AppError('Question must be matched with experts first', 400);
  }

  const existingRoom = await query(
    'SELECT * FROM chat_rooms WHERE question_id = $1 AND status = $2',
    [questionId, 'active']
  );

  if (existingRoom.rows.length > 0) {
    throw new AppError('Active chat room already exists for this question', 400);
  }

  const result = await transaction(async (client) => {
    const roomResult = await client.query(
      'INSERT INTO chat_rooms (question_id) VALUES ($1) RETURNING *',
      [questionId]
    );

    const room = roomResult.rows[0];

    await client.query(
      `INSERT INTO room_participants (room_id, user_id, role) VALUES ($1, $2, $3)`,
      [room.id, question.user_id, 'questioner']
    );

    const acceptedExperts = await client.query(
      `SELECT e.user_id 
       FROM expert_matches em 
       JOIN experts e ON em.expert_id = e.id 
       WHERE em.question_id = $1 AND em.status = 'accepted'`,
      [questionId]
    );

    for (const expert of acceptedExperts.rows) {
      await client.query(
        `INSERT INTO room_participants (room_id, user_id, role) VALUES ($1, $2, $3)`,
        [room.id, expert.user_id, 'expert']
      );
    }

    await client.query(
      `UPDATE questions SET status = 'in_progress' WHERE id = $1`,
      [questionId]
    );

    return room;
  });

  if (req.io) {
    req.io.emit('room_created', {
      roomId: result.id,
      questionId
    });
  }

  res.status(201).json({
    success: true,
    chatRoom: result
  });
});

const getChatRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const roomResult = await query(
    `SELECT cr.*, q.title as question_title, q.content as question_content, q.category
     FROM chat_rooms cr
     JOIN questions q ON cr.question_id = q.id
     WHERE cr.id = $1`,
    [id]
  );

  if (roomResult.rows.length === 0) {
    throw new AppError('Chat room not found', 404);
  }

  const participantCheck = await query(
    'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (participantCheck.rows.length === 0) {
    throw new AppError('Not authorized to access this chat room', 403);
  }

  const participants = await query(
    `SELECT rp.*, u.name, u.email 
     FROM room_participants rp
     JOIN users u ON rp.user_id = u.id
     WHERE rp.room_id = $1 AND rp.left_at IS NULL`,
    [id]
  );

  const room = roomResult.rows[0];
  room.participants = participants.rows;

  res.json({
    success: true,
    chatRoom: room
  });
});

const getChatMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, before } = req.query;
  const userId = req.user.id;

  const participantCheck = await query(
    'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (participantCheck.rows.length === 0) {
    throw new AppError('Not authorized to access this chat room', 403);
  }

  let queryText = `
    SELECT m.*, u.name as sender_name 
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.room_id = $1
  `;
  
  const params = [id];

  if (before) {
    queryText += ' AND m.created_at < $2';
    params.push(before);
  }

  queryText += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await query(queryText, params);

  res.json({
    success: true,
    messages: result.rows.reverse(),
    hasMore: result.rows.length === parseInt(limit)
  });
});

const joinChatRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const roomResult = await query(
    'SELECT * FROM chat_rooms WHERE id = $1 AND status = $2',
    [id, 'active']
  );

  if (roomResult.rows.length === 0) {
    throw new AppError('Chat room not found or inactive', 404);
  }

  const existingParticipant = await query(
    'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (existingParticipant.rows.length > 0) {
    if (existingParticipant.rows[0].left_at) {
      await query(
        'UPDATE room_participants SET left_at = NULL WHERE room_id = $1 AND user_id = $2',
        [id, userId]
      );
    } else {
      throw new AppError('Already in chat room', 400);
    }
  } else {
    await query(
      'INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );
  }

  if (req.io) {
    req.io.to(`room:${id}`).emit('user_joined', {
      userId,
      userName: req.user.name
    });
  }

  res.json({
    success: true,
    message: 'Joined chat room successfully'
  });
});

const leaveChatRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await query(
    'UPDATE room_participants SET left_at = CURRENT_TIMESTAMP WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL RETURNING *',
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Not in this chat room', 404);
  }

  if (req.io) {
    req.io.to(`room:${id}`).emit('user_left', {
      userId,
      userName: req.user.name
    });
  }

  res.json({
    success: true,
    message: 'Left chat room successfully'
  });
});

const closeChatRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const roomResult = await query(
    `SELECT cr.*, q.user_id as questioner_id 
     FROM chat_rooms cr
     JOIN questions q ON cr.question_id = q.id
     WHERE cr.id = $1 AND cr.status = 'active'`,
    [id]
  );

  if (roomResult.rows.length === 0) {
    throw new AppError('Chat room not found or already closed', 404);
  }

  const room = roomResult.rows[0];

  if (room.questioner_id !== userId) {
    throw new AppError('Only questioner can close the chat room', 403);
  }

  await transaction(async (client) => {
    await client.query(
      'UPDATE chat_rooms SET status = $1, closed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['closed', id]
    );

    await client.query(
      'UPDATE questions SET status = $1 WHERE id = $2',
      ['resolved', room.question_id]
    );
  });

  if (req.io) {
    req.io.to(`room:${id}`).emit('room_closed', {
      roomId: id
    });
  }

  res.json({
    success: true,
    message: 'Chat room closed successfully'
  });
});

const validateCreateChatRoom = [
  body('questionId').isInt().withMessage('Valid question ID required')
];

module.exports = {
  createChatRoom,
  getChatRoom,
  getChatMessages,
  joinChatRoom,
  leaveChatRoom,
  closeChatRoom,
  validateCreateChatRoom
};