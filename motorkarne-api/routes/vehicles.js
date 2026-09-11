const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireApiKey } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { logAudit } = require('../middleware/audit');

// GET /api/vehicles — tüm araçları listeler (opsiyonel ?brand=Toyota, ?limit, ?offset ile)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM vehicles';
    const params = [];
    if (req.query.brand) {
      query += ' WHERE brand = ?';
      params.push(req.query.brand);
    }
    query += ' ORDER BY brand, name';
    if (req.query.limit) {
      const limit = Math.min(parseInt(req.query.limit, 10) || 0, 500);
      const offset = parseInt(req.query.offset, 10) || 0;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Araçlar listelenirken hata oluştu.' });
  }
});

// GET /api/vehicles/:id — tek bir aracı, bağlı motoruyla birlikte getirir
router.get('/:id', async (req, res) => {
  try {
    const [[vehicle]] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) return res.status(404).json({ error: 'Araç bulunamadı.' });
    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Araç getirilirken hata oluştu.' });
  }
});

// POST /api/vehicles — yeni araç ekler (x-api-key gerektirir)
router.post('/', writeLimiter, requireApiKey, async (req, res) => {
  const v = req.body;
  if (!v.id || !v.name || !v.brand) {
    return res.status(400).json({ error: 'id, name ve brand zorunludur.' });
  }
  try {
    await pool.query(
      `INSERT INTO vehicles (id, name, brand, description, score, engine, motor_id, img, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.id, v.name, v.brand, v.desc || null, v.score ?? null, v.engine || null,
       v.motorId || null, v.img || null, v.note || null]
    );
    const [[created]] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [v.id]);
    await logAudit({ action: 'create', entityType: 'vehicle', entityId: v.id, ip: req.ip, snapshot: created });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `id '${v.id}' zaten kullanılıyor.` });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: `motorId '${v.motorId}' geçerli bir motor değil.` });
    }
    res.status(500).json({ error: 'Araç eklenirken hata oluştu.' });
  }
});

// PUT /api/vehicles/:id — mevcut aracı günceller (x-api-key gerektirir)
router.put('/:id', writeLimiter, requireApiKey, async (req, res) => {
  const v = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE vehicles SET name=?, brand=?, description=?, score=?, engine=?, motor_id=?, img=?, note=?
       WHERE id=?`,
      [v.name, v.brand, v.desc || null, v.score ?? null, v.engine || null,
       v.motorId || null, v.img || null, v.note || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Araç bulunamadı.' });
    const [[updated]] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    await logAudit({ action: 'update', entityType: 'vehicle', entityId: req.params.id, ip: req.ip, snapshot: updated });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Araç güncellenirken hata oluştu.' });
  }
});

// DELETE /api/vehicles/:id — aracı siler (x-api-key gerektirir)
router.delete('/:id', writeLimiter, requireApiKey, async (req, res) => {
  try {
    const [[beforeDelete]] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    const [result] = await pool.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Araç bulunamadı.' });
    await logAudit({ action: 'delete', entityType: 'vehicle', entityId: req.params.id, ip: req.ip, snapshot: beforeDelete });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Araç silinirken hata oluştu.' });
  }
});

module.exports = router;
