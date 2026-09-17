const crypto = require('crypto');
const db = require('../config/db');
const { validatePercentages } = require('../utils/percentages');

function makeToken() {
  return crypto.randomBytes(12).toString('hex');
}

async function createSplit(req, res) {
  try {
    const { projectName, totalAmount, currency, participants } = req.body || {};

    if (!projectName || !totalAmount || !currency || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Project name, total amount, currency, and participants are required.' });
    }

    validatePercentages(participants);

    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ error: 'Total amount must be greater than zero.' });
    }

    const splitResult = await db.query(
      `INSERT INTO splits (owner_user_id, project_name, total_amount, currency, status, share_link_token)
       VALUES ($1, $2, $3, $4, 'ready', $5)
       RETURNING *`,
      [req.user.id, String(projectName).trim(), total, String(currency).toUpperCase(), makeToken()]
    );

    const split = splitResult.rows[0];
    const participantRows = participants.map((participant) => ({
      splitId: split.id,
      userId: participant.userId || null,
      name: String(participant.name || '').trim(),
      percentage: Number(participant.percentage),
      shareAmount: Number(((total * Number(participant.percentage)) / 100).toFixed(2)),
    }));

    for (const participant of participantRows) {
      if (!participant.name) {
        return res.status(400).json({ error: 'Each participant must have a name.' });
      }

      await db.query(
        `INSERT INTO split_participants (split_id, user_id, name, percentage, share_amount, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [participant.splitId, participant.userId, participant.name, participant.percentage, participant.shareAmount]
      );
    }

    res.status(201).json({
      message: 'Split created successfully.',
      split: {
        id: split.id,
        projectName: split.project_name,
        totalAmount: split.total_amount,
        currency: split.currency,
        status: split.status,
        shareLinkToken: split.share_link_token,
      },
    });
  } catch (error) {
    console.error('Create split error:', error);
    if (error.message && error.message.includes('percent')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Unable to create split.' });
  }
}

async function getSplits(req, res) {
  try {
    const result = await db.query(
      `SELECT s.*, json_agg(sp) AS participants
       FROM splits s
       LEFT JOIN split_participants sp ON sp.split_id = s.id
       WHERE s.owner_user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json({ splits: result.rows });
  } catch (error) {
    console.error('Get splits error:', error);
    res.status(500).json({ error: 'Unable to fetch splits.' });
  }
}

async function getSplitById(req, res) {
  try {
    const { id } = req.params;

    const splitResult = await db.query(
      `SELECT * FROM splits WHERE id = $1 AND owner_user_id = $2`,
      [id, req.user.id]
    );

    if (splitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Split not found.' });
    }

    const participantResult = await db.query(
      `SELECT * FROM split_participants WHERE split_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({ split: splitResult.rows[0], participants: participantResult.rows });
  } catch (error) {
    console.error('Get split by id error:', error);
    res.status(500).json({ error: 'Unable to fetch split.' });
  }
}

async function confirmSplitParticipant(req, res) {
  try {
    const { id } = req.params;
    const { participantId } = req.body || {};

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required.' });
    }

    const participantResult = await db.query(
      `SELECT * FROM split_participants WHERE id = $1 AND split_id = $2`,
      [participantId, id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    const participant = participantResult.rows[0];
    if (participant.user_id && participant.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only confirm your own participant share.' });
    }

    await db.query(
      `UPDATE split_participants
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE id = $1`,
      [participantId]
    );

    const allParticipants = await db.query(
      `SELECT * FROM split_participants WHERE split_id = $1`,
      [id]
    );

    const allConfirmed = allParticipants.rows.length > 0 && allParticipants.rows.every((row) => row.status === 'confirmed');

    if (allConfirmed) {
      await db.query(
        `UPDATE splits SET status = 'ready' WHERE id = $1`,
        [id]
      );
    }

    res.json({ message: 'Participant confirmed successfully.' });
  } catch (error) {
    console.error('Confirm split participant error:', error);
    res.status(500).json({ error: 'Unable to confirm participant status.' });
  }
}

async function createShareLink(req, res) {
  try {
    const { id } = req.params;
    const token = makeToken();

    await db.query(
      `UPDATE splits SET share_link_token = $1, status = 'ready' WHERE id = $2 AND owner_user_id = $3`,
      [token, id, req.user.id]
    );

    res.json({
      message: 'Share link generated successfully.',
      link: `/split-link.html?token=${token}`,
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Unable to generate share link.' });
  }
}

module.exports = { createSplit, getSplits, getSplitById, confirmSplitParticipant, createShareLink };
