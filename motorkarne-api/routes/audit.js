const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireApiKey } = require('../middleware/auth');

// GET /api/audit — son değişiklik geçmişini listeler (x-api-key gerektirir; operasyonel geçmiş hassas kabul edilir)
router.get('/', requireApiKey, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const [rows] = await pool.query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Denetim günlüğü okunurken hata oluştu.' });
  }
});

module.exports = router;
