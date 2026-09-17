function normalizePercent(value) {
  return Number(value);
}

function validatePercentages(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error('At least one participant is required.');
  }

  const total = participants.reduce((sum, participant) => {
    const percent = normalizePercent(participant.percentage);
    if (!Number.isFinite(percent) || percent <= 0) {
      throw new Error('Each participant must have a valid percentage greater than zero.');
    }
    return sum + percent;
  }, 0);

  if (Math.abs(total - 100) > 0.01) {
    throw new Error('Participant percentages must add up to 100%.');
  }

  return true;
}

module.exports = { validatePercentages };
