const pool = require('../db');

// Her yazma işleminden sonra çağrılır; entity'nin son halini (snapshot) ve
// isteği yapan IP adresini kaydeder. Bu tablo salt-okunur bir geçmiş — hiçbir
// endpoint buraya yazma dışında müdahale etmiyor, silinen bir kaydın geçmişi
// audit_log'da kalmaya devam eder.
async function logAudit({ action, entityType, entityId, ip, snapshot }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, ip_address, snapshot) VALUES (?, ?, ?, ?, ?)`,
      [action, entityType, entityId, ip || null, snapshot ? JSON.stringify(snapshot) : null]
    );
  } catch (err) {
    // Denetim kaydı başarısız olursa asıl işlemi engellemeyelim, sadece logla.
    console.error('Denetim kaydı yazılamadı:', err.message);
  }
}

module.exports = { logAudit };
