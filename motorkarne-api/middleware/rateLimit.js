const rateLimit = require('express-rate-limit');

// Genel okuma trafiği için: dakikada 100 istek/IP — normal kullanım için bol,
// kötüye kullanımı (bot/otomatik tarama) engellemek için yeterince sıkı.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' },
});

// Yazma işlemleri (ekle/düzenle/sil) için daha sıkı: dakikada 20 istek/IP.
// Bu, API anahtarı sızsa bile toplu/otomatik silme saldırılarını yavaşlatır.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla yazma isteği. Lütfen bir dakika sonra tekrar deneyin.' },
});

module.exports = { readLimiter, writeLimiter };
