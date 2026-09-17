const { Server } = require('socket.io');
const { verifyToken } = require('./utils/jwt');
const db = require('./config/db');

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...value] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(value.join('='));
    return acc;
  }, {});
}

function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      const token = cookies.jwt;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      const userResult = await db.query(
        `SELECT id, username, full_name, is_active FROM users WHERE id = $1`,
        [decoded.userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return next(new Error('User is not active'));
      }

      socket.user = userResult.rows[0];
      next();
    } catch (error) {
      next(new Error('Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_conversation', async (conversationId) => {
      try {
        const authCheck = await db.query(
          `SELECT * FROM chat_conversations WHERE id = $1 AND (participant_a_id = $2 OR participant_b_id = $2)`,
          [conversationId, socket.user.id]
        );

        if (authCheck.rows.length === 0) {
          socket.emit('chat_error', 'You are not allowed to access this conversation.');
          return;
        }

        socket.join(conversationId);
        socket.emit('joined_conversation', { conversationId });
      } catch (error) {
        socket.emit('chat_error', 'Unable to join conversation.');
      }
    });

    socket.on('send_message', async ({ conversationId, messageText }) => {
      try {
        const message = String(messageText || '').trim();
        if (!conversationId || !message) {
          return socket.emit('chat_error', 'Conversation ID and message text are required.');
        }

        const authCheck = await db.query(
          `SELECT * FROM chat_conversations WHERE id = $1 AND (participant_a_id = $2 OR participant_b_id = $2)`,
          [conversationId, socket.user.id]
        );

        if (authCheck.rows.length === 0) {
          return socket.emit('chat_error', 'You are not allowed to send messages in this conversation.');
        }

        const msgResult = await db.query(
          `INSERT INTO chat_messages (conversation_id, sender_user_id, message_text)
           VALUES ($1, $2, $3)
           RETURNING *, (SELECT username FROM users WHERE id = $2) AS sender_username`,
          [conversationId, socket.user.id, message]
        );

        await db.query(
          `UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`,
          [conversationId]
        );

        io.to(conversationId).emit('new_message', msgResult.rows[0]);
      } catch (error) {
        console.error('Socket send_message error:', error);
        socket.emit('chat_error', 'Unable to send message.');
      }
    });
  });

  return io;
}

module.exports = createSocketServer;
