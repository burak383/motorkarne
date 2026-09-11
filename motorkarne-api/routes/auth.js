const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth } = require('../middleware/authToken');
const { writeLimiter } = require('../middleware/rateLimit');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL = '30d';

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Şifre hash'i ve diğer dahili alanları asla mobil istemciye göndermiyoruz —
// her yanıt bu fonksiyondan geçerek "dışa açık" alanlara indirgeniyor.
function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || undefined,
    createdAt: row.created_at,
    provider: row.provider,
    providerId: row.provider_id || undefined,
    isAdmin: !!row.is_admin,
  };
}

// POST /api/auth/register
router.post('/register', writeLimiter, async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  const password = String(req.body.password || '').trim();

  if (!fullName) return res.status(400).json({ error: 'Ad Soyad alanı zorunludur.' });
  if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });

  try {
    const [existing] = await pool.query('SELECT id FROM members WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta adresiyle zaten bir üyelik mevcut.' });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO members (id, full_name, email, phone, password_hash, provider) VALUES (?, ?, ?, ?, ?, 'email')`,
      [id, fullName, email, phone, passwordHash]
    );

    const [[row]] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
    res.status(201).json({ token: signToken(id), user: toPublicUser(row) });
  } catch (err) {
    console.error('Kayıt hatası:', err.message);
    res.status(500).json({ error: 'Kayıt sırasında bir sunucu hatası oluştu.' });
  }
});

// POST /api/auth/login
router.post('/login', writeLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  try {
    const [[row]] = await pool.query('SELECT * FROM members WHERE email = ? LIMIT 1', [email]);
    if (!row) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }
    if (!row.password_hash) {
      const providerLabel = row.provider === 'google' ? 'Google' : row.provider === 'apple' ? 'Apple' : row.provider;
      return res.status(400).json({
        error: `Bu hesap ${providerLabel} ile oluşturulmuş, şifresi yok. Lütfen "${providerLabel} ile devam et" seçeneğini kullanın.`,
      });
    }
    const matches = await bcrypt.compare(password, row.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }
    res.json({ token: signToken(row.id), user: toPublicUser(row) });
  } catch (err) {
    console.error('Giriş hatası:', err.message);
    res.status(500).json({ error: 'Giriş sırasında bir sunucu hatası oluştu.' });
  }
});

// POST /api/auth/social-login — önce (provider, provider_id) eşleşmesine bakar
// (aynı sosyal hesapla önceki girişleri bulmak için — Apple ikinci girişte
// e-posta/ad döndürmediğinden bu adım ZORUNLU), sonra e-postaya göre mevcut bir
// üye varsa onu kullanır (aynı e-postayla e-posta/şifre yöntemiyle kayıt
// olunmuşsa hesaplar birleşir), yoksa sosyal profil bilgisiyle yeni bir üye
// oluşturur (yeni hesap için e-posta + ad-soyad zorunludur).
router.post('/social-login', writeLimiter, async (req, res) => {
  const provider = ['google', 'apple'].includes(req.body.provider) ? req.body.provider : null;
  const providerId = String(req.body.providerId || '').trim();
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
  const fullName = req.body.fullName ? String(req.body.fullName).trim() : '';

  if (!provider || !providerId) {
    return res.status(400).json({ error: 'Eksik veya geçersiz sosyal giriş bilgisi.' });
  }

  try {
    const [[byProviderId]] = await pool.query(
      'SELECT * FROM members WHERE provider = ? AND provider_id = ? LIMIT 1',
      [provider, providerId]
    );
    if (byProviderId) {
      return res.json({ token: signToken(byProviderId.id), user: toPublicUser(byProviderId) });
    }

    if (email) {
      const [[byEmail]] = await pool.query('SELECT * FROM members WHERE email = ? LIMIT 1', [email]);
      if (byEmail) {
        return res.json({ token: signToken(byEmail.id), user: toPublicUser(byEmail) });
      }
    }

    if (!EMAIL_REGEX.test(email) || !fullName) {
      return res.status(400).json({
        error: 'Bu sosyal hesapla ilk kez giriş yapıyorsunuz ama gerekli bilgiler eksik. Lütfen tekrar deneyin.',
      });
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO members (id, full_name, email, password_hash, provider, provider_id) VALUES (?, ?, ?, NULL, ?, ?)`,
      [id, fullName, email, provider, providerId]
    );
    const [[row]] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
    res.status(201).json({ token: signToken(id), user: toPublicUser(row) });
  } catch (err) {
    console.error('Sosyal giriş hatası:', err.message);
    res.status(500).json({ error: 'Giriş sırasında bir sunucu hatası oluştu.' });
  }
});

// GET /api/auth/check-email?email=... — "Şifremi Unuttum" akışında, bir e-postanın
// kayıtlı olup olmadığını (şifre sıfırlama denemeden önce) kontrol etmek için.
router.get('/check-email', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
  }
  try {
    const [rows] = await pool.query('SELECT id FROM members WHERE email = ? LIMIT 1', [email]);
    res.json({ taken: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/auth/reset-password
// GÜVENLİK NOTU: Bu uç nokta e-postanın gerçekten o kişiye ait olduğunu doğrulamaz
// (kod/link göndermez) — sadece e-posta + yeni şifre alır. Bu, uygulamanın önceki
// tamamen cihaz-yerel sürümündeki davranışın aynısıdır (bkz. mobil taraftaki
// SifremiUnuttumScreen.tsx içindeki güvenlik notu). Gerçek bir doğrulama için
// e-posta gönderme altyapısı (örn. SendGrid) ve tek kullanımlık kod/link akışı
// eklenmesi gerekir — bu, kapsamı aşan ayrı bir iş.
router.put('/reset-password', writeLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const newPassword = String(req.body.newPassword || '').trim();

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }

  try {
    const [[row]] = await pool.query('SELECT id FROM members WHERE email = ? LIMIT 1', [email]);
    if (!row) {
      return res.status(404).json({ error: 'Bu e-posta adresiyle kayıtlı bir üyelik bulunamadı.' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE members SET password_hash = ? WHERE id = ?', [newHash, row.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Şifre sıfırlama hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM members WHERE id = ?', [req.userId]);
    if (!row) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json({ user: toPublicUser(row) });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/auth/me
router.put('/me', writeLimiter, requireAuth, async (req, res) => {
  try {
    const [[current]] = await pool.query('SELECT * FROM members WHERE id = ?', [req.userId]);
    if (!current) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    const fullName = req.body.fullName !== undefined ? String(req.body.fullName).trim() : current.full_name;
    if (!fullName) return res.status(400).json({ error: 'Ad Soyad alanı zorunludur.' });

    const email = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : current.email;
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });

    if (email !== current.email) {
      const [dupe] = await pool.query('SELECT id FROM members WHERE email = ? AND id != ?', [email, req.userId]);
      if (dupe.length > 0) return res.status(400).json({ error: 'Bu e-posta adresiyle zaten bir üyelik mevcut.' });
    }

    const phone = req.body.phone !== undefined ? String(req.body.phone).trim() : current.phone;

    await pool.query('UPDATE members SET full_name = ?, email = ?, phone = ? WHERE id = ?', [fullName, email, phone, req.userId]);
    const [[row]] = await pool.query('SELECT * FROM members WHERE id = ?', [req.userId]);
    res.json({ user: toPublicUser(row) });
  } catch (err) {
    console.error('Profil güncelleme hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/auth/me/password
router.put('/me/password', writeLimiter, requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '').trim();
  const newPassword = String(req.body.newPassword || '').trim();

  if (newPassword.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
  if (newPassword === currentPassword) return res.status(400).json({ error: 'Yeni şifre, mevcut şifreyle aynı olamaz.' });

  try {
    const [[row]] = await pool.query('SELECT password_hash FROM members WHERE id = ?', [req.userId]);
    if (!row || !row.password_hash) return res.status(400).json({ error: 'Mevcut şifreniz yanlış.' });

    const matches = await bcrypt.compare(currentPassword, row.password_hash);
    if (!matches) return res.status(400).json({ error: 'Mevcut şifreniz yanlış.' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE members SET password_hash = ? WHERE id = ?', [newHash, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Şifre değiştirme hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/auth/me
router.delete('/me', writeLimiter, requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM members WHERE id = ?', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Hesap silme hatası:', err.message);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
