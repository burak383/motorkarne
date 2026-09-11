// Basit API anahtarı koruması. Sadece admin panelin bileceği bir anahtar.
// İstek başlığında (header) x-api-key olarak gönderilmesi gerekir.
require('dotenv').config();

function requireApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Yetkisiz erişim: geçersiz veya eksik x-api-key başlığı.' });
  }
  next();
}

module.exports = { requireApiKey };
