const db = require('../config/db');

async function getConversations(req, res) {
  try {
    const result = await db.query(
      `SELECT c.*, u1.username AS participant_a_username, u2.username AS participant_b_username
       FROM split_demo.chat_conversations c
       JOIN split_demo.users u1 ON u1.id = c.participant_a_id
       JOIN split_demo.users u2 ON u2.id = c.participant_b_id
       WHERE c.participant_a_id = $1 OR c.participant_b_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST`,
      [req.user.id]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Unable to fetch conversations.' });
  }
}

async function getConversationMessages(req, res) {
  try {
    const { conversationId } = req.params;

    const conversationResult = await db.query(
      `SELECT * FROM split_demo.chat_conversations WHERE id = $1 AND (participant_a_id = $2 OR participant_b_id = $2)`,
      [conversationId, req.user.id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this conversation.' });
    }

    const messagesResult = await db.query(
      `SELECT cm.*, u.username AS sender_username
       FROM split_demo.chat_messages cm
       JOIN split_demo.users u ON u.id = cm.sender_user_id
       WHERE cm.conversation_id = $1
       ORDER BY cm.created_at ASC`,
      [conversationId]
    );

    res.json({ messages: messagesResult.rows });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Unable to fetch messages.' });
  }
}

module.exports = { getConversations, getConversationMessages };
