const { verifyToken } = require('../middleware/auth');
const { query } = require('../models/database');
const logger = require('../utils/logger');
const redisService = require('../services/redis');

const setupSocketHandlers = (io) => {
  const authenticateSocket = async (socket, next) => {
    try {
      // Check if it's a demo connection
      if (socket.handshake.auth.demo === 'true') {
        const demoUser = socket.handshake.auth.demoUser || 'alex@demo.com';
        const demoUsers = {
          'alex@demo.com': { id: 1, email: 'alex@demo.com', name: 'Alex Kim', role: 'user' },
          'sarah@demo.com': { id: 2, email: 'sarah@demo.com', name: 'Sarah Lee', role: 'expert' },
          'mike@demo.com': { id: 3, email: 'mike@demo.com', name: 'Mike Park', role: 'expert' }
        };
        
        const user = demoUsers[demoUser];
        if (user) {
          socket.userId = user.id;
          socket.user = user;
          return next();
        }
      }
      
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication failed'));
      }

      const decoded = verifyToken(token);
      const result = await query(
        'SELECT id, email, name, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.userId = result.rows[0].id;
      socket.user = result.rows[0];
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  };

  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    logger.info(`User ${socket.user.name} connected`);
    
    await redisService.addToOnlineUsers(socket.userId, socket.id);

    socket.on('join_room', async (data) => {
      const { roomId } = data;

      try {
        const participantCheck = await query(
          'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
          [roomId, socket.userId]
        );

        if (participantCheck.rows.length === 0) {
          socket.emit('error', { message: 'Not authorized to join this room' });
          return;
        }

        socket.join(`room:${roomId}`);
        socket.currentRoom = roomId;

        socket.to(`room:${roomId}`).emit('user_joined', {
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: new Date()
        });

        socket.emit('joined_room', {
          roomId,
          message: 'Successfully joined room'
        });

        logger.info(`User ${socket.user.name} joined room ${roomId}`);
      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave_room', (data) => {
      const { roomId } = data;

      if (socket.currentRoom === roomId) {
        socket.leave(`room:${roomId}`);
        socket.currentRoom = null;

        socket.to(`room:${roomId}`).emit('user_left', {
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: new Date()
        });

        socket.emit('left_room', {
          roomId,
          message: 'Successfully left room'
        });

        logger.info(`User ${socket.user.name} left room ${roomId}`);
      }
    });

    socket.on('send_message', async (data) => {
      const { roomId, content, type = 'text' } = data;

      try {
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          socket.emit('error', { message: 'Not in this room' });
          return;
        }

        const participantCheck = await query(
          'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL',
          [roomId, socket.userId]
        );

        if (participantCheck.rows.length === 0) {
          socket.emit('error', { message: 'Not authorized to send messages' });
          return;
        }

        const result = await query(
          'INSERT INTO messages (room_id, sender_id, content, type) VALUES ($1, $2, $3, $4) RETURNING *',
          [roomId, socket.userId, content, type]
        );

        const message = result.rows[0];
        message.sender_name = socket.user.name;

        io.to(`room:${roomId}`).emit('new_message', message);

        await redisService.publish('chat:message', {
          roomId,
          message
        });

        logger.info(`Message sent in room ${roomId} by ${socket.user.name}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', (data) => {
      const { roomId } = data;

      if (socket.currentRoom === roomId) {
        socket.to(`room:${roomId}`).emit('typing_indicator', {
          userId: socket.userId,
          userName: socket.user.name,
          isTyping: true
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { roomId } = data;

      if (socket.currentRoom === roomId) {
        socket.to(`room:${roomId}`).emit('typing_indicator', {
          userId: socket.userId,
          userName: socket.user.name,
          isTyping: false
        });
      }
    });

    socket.on('accept_question', async (data) => {
      const { questionId } = data;

      if (socket.user.role !== 'expert') {
        socket.emit('error', { message: 'Only experts can accept questions' });
        return;
      }

      try {
        const expertResult = await query(
          'SELECT id FROM experts WHERE user_id = $1',
          [socket.userId]
        );

        if (expertResult.rows.length === 0) {
          socket.emit('error', { message: 'Expert profile not found' });
          return;
        }

        io.emit('expert_matched', {
          questionId,
          expertId: expertResult.rows[0].id,
          expertName: socket.user.name
        });

        socket.emit('question_accepted', {
          questionId,
          message: 'Question accepted successfully'
        });
      } catch (error) {
        logger.error('Error accepting question:', error);
        socket.emit('error', { message: 'Failed to accept question' });
      }
    });

    socket.on('reject_question', async (data) => {
      const { questionId } = data;

      if (socket.user.role !== 'expert') {
        socket.emit('error', { message: 'Only experts can reject questions' });
        return;
      }

      socket.emit('question_rejected', {
        questionId,
        message: 'Question rejected'
      });
    });

    // Demo events
    socket.on('notify_experts', (data) => {
      // Broadcast to all experts
      io.emit('notify_experts', data);
    });
    
    socket.on('create_room', (data) => {
      // Broadcast room creation to all clients
      io.emit('create_room', data);
    });

    socket.on('disconnect', async () => {
      if (socket.currentRoom) {
        socket.to(`room:${socket.currentRoom}`).emit('user_disconnected', {
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: new Date()
        });
      }

      await redisService.removeFromOnlineUsers(socket.userId);
      
      logger.info(`User ${socket.user.name} disconnected`);
    });
  });
};

module.exports = setupSocketHandlers;