const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireApiKey } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { logAudit } = require('../middleware/audit');

// Yardımcı: tek bir motoru, ilişkili tüm verileriyle (marka, artı, eksi, kronik) birlikte getirir.
async function fetchFullMotor(conn, motorId) {
  const [[motor]] = await conn.query('SELECT * FROM motors WHERE id = ?', [motorId]);
  if (!motor) return null;

  const [brands] = await conn.query(
    'SELECT brand_name FROM motor_brands WHERE motor_id = ?', [motorId]
  );
  const [pros] = await conn.query(
    'SELECT text FROM motor_pros WHERE motor_id = ? ORDER BY sort_order', [motorId]
  );
  const [cons] = await conn.query(
    'SELECT text FROM motor_cons WHERE motor_id = ? ORDER BY sort_order', [motorId]
  );
  const [chronic] = await conn.query(
    'SELECT title, risk, description, solution FROM chronic_issues WHERE motor_id = ? ORDER BY sort_order',
    [motorId]
  );

  return {
    ...motor,
    brands: brands.map((b) => b.brand_name),
    pros: pros.map((p) => p.text),
    cons: cons.map((c) => c.text),
    chronic: chronic.map((c) => ({
      title: c.title, risk: c.risk, desc: c.description, solution: c.solution,
    })),
  };
}

// GET /api/motors  — tüm motorları, ilişkili verilerle birlikte listeler (toplu sorgularla, hızlı)
// ?limit ve ?offset opsiyonel (verilmezse tüm liste döner, geriye dönük uyumlu)
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 0, 500) : null;
    const offset = parseInt(req.query.offset, 10) || 0;

    let motorQuery = 'SELECT * FROM motors ORDER BY name';
    if (limit) motorQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    const [motorRows] = await pool.query(motorQuery);
    const [brandRows] = await pool.query('SELECT motor_id, brand_name FROM motor_brands');
    const [proRows] = await pool.query('SELECT motor_id, text FROM motor_pros ORDER BY motor_id, sort_order');
    const [conRows] = await pool.query('SELECT motor_id, text FROM motor_cons ORDER BY motor_id, sort_order');
    const [chronicRows] = await pool.query(
      'SELECT motor_id, title, risk, description, solution FROM chronic_issues ORDER BY motor_id, sort_order'
    );

    // Bellekte, motor_id'ye göre grupluyoruz — böylece motor başına ayrı sorgu atmıyoruz.
    const groupBy = (rows) => rows.reduce((acc, r) => {
      (acc[r.motor_id] = acc[r.motor_id] || []).push(r);
      return acc;
    }, {});

    const brandsByMotor = groupBy(brandRows);
    const prosByMotor = groupBy(proRows);
    const consByMotor = groupBy(conRows);
    const chronicByMotor = groupBy(chronicRows);

    const motors = motorRows.map((m) => ({
      ...m,
      brands: (brandsByMotor[m.id] || []).map((b) => b.brand_name),
      pros: (prosByMotor[m.id] || []).map((p) => p.text),
      cons: (consByMotor[m.id] || []).map((c) => c.text),
      chronic: (chronicByMotor[m.id] || []).map((c) => ({
        title: c.title, risk: c.risk, desc: c.description, solution: c.solution,
      })),
    }));

    res.json(motors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Motorlar listelenirken hata oluştu.' });
  }
});

// GET /api/motors/:id — tek bir motoru getirir
router.get('/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const motor = await fetchFullMotor(conn, req.params.id);
      if (!motor) return res.status(404).json({ error: 'Motor bulunamadı.' });
      res.json(motor);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Motor getirilirken hata oluştu.' });
  }
});

// POST /api/motors — yeni motor ekler (x-api-key gerektirir)
router.post('/', writeLimiter, requireApiKey, async (req, res) => {
  const m = req.body;
  if (!m.id || !m.name || !m.riskLevel) {
    return res.status(400).json({ error: 'id, name ve riskLevel zorunludur.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO motors (id, name, code, fuel, power, torque, transmission, consumption, score, risk, risk_level, note, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.name, m.code || null, m.fuel || null, m.power || null, m.torque || null,
       m.transmission || null, m.consumption || null, m.score ?? null, m.risk || null,
       m.riskLevel, m.note || null, m.imageUrl || null]
    );

    for (const brand of m.brands || []) {
      await conn.query('INSERT INTO motor_brands (motor_id, brand_name) VALUES (?, ?)', [m.id, brand]);
    }
    for (let i = 0; i < (m.pros || []).length; i++) {
      await conn.query('INSERT INTO motor_pros (motor_id, text, sort_order) VALUES (?, ?, ?)', [m.id, m.pros[i], i]);
    }
    for (let i = 0; i < (m.cons || []).length; i++) {
      await conn.query('INSERT INTO motor_cons (motor_id, text, sort_order) VALUES (?, ?, ?)', [m.id, m.cons[i], i]);
    }
    for (let i = 0; i < (m.chronic || []).length; i++) {
      const c = m.chronic[i];
      await conn.query(
        'INSERT INTO chronic_issues (motor_id, title, risk, description, solution, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [m.id, c.title, c.risk || null, c.desc || null, c.solution || null, i]
      );
    }

    await conn.commit();
    const created = await fetchFullMotor(conn, m.id);
    await logAudit({ action: 'create', entityType: 'motor', entityId: m.id, ip: req.ip, snapshot: created });
    res.status(201).json(created);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `id '${m.id}' zaten kullanılıyor.` });
    }
    res.status(500).json({ error: 'Motor eklenirken hata oluştu.' });
  } finally {
    conn.release();
  }
});

// PUT /api/motors/:id — mevcut motoru günceller (x-api-key gerektirir)
router.put('/:id', writeLimiter, requireApiKey, async (req, res) => {
  const motorId = req.params.id;
  const m = req.body;

  const conn = await pool.getConnection();
  try {
    const [[existing]] = await conn.query('SELECT id FROM motors WHERE id = ?', [motorId]);
    if (!existing) return res.status(404).json({ error: 'Motor bulunamadı.' });

    await conn.beginTransaction();

    await conn.query(
      `UPDATE motors SET name=?, code=?, fuel=?, power=?, torque=?, transmission=?, consumption=?,
       score=?, risk=?, risk_level=?, note=?, image_url=? WHERE id=?`,
      [m.name, m.code || null, m.fuel || null, m.power || null, m.torque || null,
       m.transmission || null, m.consumption || null, m.score ?? null, m.risk || null,
       m.riskLevel, m.note || null, m.imageUrl || null, motorId]
    );

    // İlişkili tabloları temizleyip yeniden yazıyoruz (en basit ve güvenli yol)
    await conn.query('DELETE FROM motor_brands WHERE motor_id = ?', [motorId]);
    await conn.query('DELETE FROM motor_pros WHERE motor_id = ?', [motorId]);
    await conn.query('DELETE FROM motor_cons WHERE motor_id = ?', [motorId]);
    await conn.query('DELETE FROM chronic_issues WHERE motor_id = ?', [motorId]);

    for (const brand of m.brands || []) {
      await conn.query('INSERT INTO motor_brands (motor_id, brand_name) VALUES (?, ?)', [motorId, brand]);
    }
    for (let i = 0; i < (m.pros || []).length; i++) {
      await conn.query('INSERT INTO motor_pros (motor_id, text, sort_order) VALUES (?, ?, ?)', [motorId, m.pros[i], i]);
    }
    for (let i = 0; i < (m.cons || []).length; i++) {
      await conn.query('INSERT INTO motor_cons (motor_id, text, sort_order) VALUES (?, ?, ?)', [motorId, m.cons[i], i]);
    }
    for (let i = 0; i < (m.chronic || []).length; i++) {
      const c = m.chronic[i];
      await conn.query(
        'INSERT INTO chronic_issues (motor_id, title, risk, description, solution, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [motorId, c.title, c.risk || null, c.desc || null, c.solution || null, i]
      );
    }

    await conn.commit();
    const updated = await fetchFullMotor(conn, motorId);
    await logAudit({ action: 'update', entityType: 'motor', entityId: motorId, ip: req.ip, snapshot: updated });
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Motor güncellenirken hata oluştu.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/motors/:id — motoru siler (x-api-key gerektirir)
router.delete('/:id', writeLimiter, requireApiKey, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const beforeDelete = await fetchFullMotor(conn, req.params.id); // silmeden önce anlık görüntüyü al
    const [result] = await conn.query('DELETE FROM motors WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Motor bulunamadı.' });
    await logAudit({ action: 'delete', entityType: 'motor', entityId: req.params.id, ip: req.ip, snapshot: beforeDelete });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Motor silinirken hata oluştu.' });
  } finally {
    conn.release();
  }
});

// GET /api/motors/export/backup — tüm motorları ilişkili verileriyle JSON olarak dışa aktarır
// (elle yedekleme amaçlı; x-api-key gerektirir çünkü toplu veri dökümü hassas kabul edilir)
router.get('/export/backup', requireApiKey, async (req, res) => {
  try {
    const [motorRows] = await pool.query('SELECT * FROM motors ORDER BY name');
    const [brandRows] = await pool.query('SELECT motor_id, brand_name FROM motor_brands');
    const [proRows] = await pool.query('SELECT motor_id, text FROM motor_pros ORDER BY motor_id, sort_order');
    const [conRows] = await pool.query('SELECT motor_id, text FROM motor_cons ORDER BY motor_id, sort_order');
    const [chronicRows] = await pool.query(
      'SELECT motor_id, title, risk, description, solution FROM chronic_issues ORDER BY motor_id, sort_order'
    );
    const groupBy = (rows) => rows.reduce((acc, r) => {
      (acc[r.motor_id] = acc[r.motor_id] || []).push(r);
      return acc;
    }, {});
    const brandsByMotor = groupBy(brandRows);
    const prosByMotor = groupBy(proRows);
    const consByMotor = groupBy(conRows);
    const chronicByMotor = groupBy(chronicRows);

    const motors = motorRows.map((m) => ({
      ...m,
      brands: (brandsByMotor[m.id] || []).map((b) => b.brand_name),
      pros: (prosByMotor[m.id] || []).map((p) => p.text),
      cons: (consByMotor[m.id] || []).map((c) => c.text),
      chronic: (chronicByMotor[m.id] || []).map((c) => ({
        title: c.title, risk: c.risk, desc: c.description, solution: c.solution,
      })),
    }));

    res.setHeader('Content-Disposition', `attachment; filename="motorkarne-yedek-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({ exportedAt: new Date().toISOString(), count: motors.length, motors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yedek dışa aktarılırken hata oluştu.' });
  }
});

module.exports = router;
