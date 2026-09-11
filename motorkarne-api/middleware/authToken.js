// Kullanıcı oturumu (JWT) doğrulaması. Bu, admin panelin kullandığı x-api-key
// korumasından (bkz. middleware/auth.js) TAMAMEN AYRI bir mekanizma: o, tek bir
// paylaşılan admin anahtarını korurken; bu middleware, her mobil kullanıcının
// KENDİ hesabına ait uç noktaları (profil, şifre değiştirme, hesap silme) korur.
require('dotenv').config();
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.header('authorization') || req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Oturum bulunamadı. Lütfen giriş yapın.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.' });
  }
}

module.exports = { requireAuth };
