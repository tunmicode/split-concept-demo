const express = require('express');
const { createSplit, getSplits, getSplitById, confirmSplitParticipant, createShareLink } = require('../controllers/split.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', createSplit);
router.get('/', getSplits);
router.get('/:id', getSplitById);
router.post('/:id/confirm', confirmSplitParticipant);
router.post('/:id/share-link', createShareLink);

module.exports = router;
