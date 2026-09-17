const express = require('express');
const { getConversations, getConversationMessages } = require('../controllers/chat.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getConversationMessages);

module.exports = router;
