require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { readLimiter } = require('./middleware/rateLimit');

const motorsRouter = require('./routes/motors');
const vehiclesRouter = require('./routes/vehicles');
const auditRouter = require('./routes/audit');
const authRouter = require('./routes/auth');

const app = express();
// Railway (ve genel olarak çoğu PaaS), istekleri kendi ters proxy'sinden geçirip
// gerçek istemci IP'sini "X-Forwarded-For" başlığında iletir. Bu ayar olmadan
// Express, req.ip'i proxy'nin kendi IP'si sanır — bu hem express-rate-limit'in
// "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR" hatası vermesine hem de (daha önemlisi)
// rate limiting'in kullanıcı başına değil, tüm trafik tek bir IP'den geliyormuş
// gibi YANLIŞ çalışmasına yol açar. "1" değeri, yalnızca ilk (en yakın) proxy
// atlamasına güvenileceğini belirtir — Railway'in kendi altyapısı için doğru ayar budur.
app.set('trust proxy', 1);
// CORS bilinçli olarak açık bırakıldı: GET endpoint'leri sadece halka açık, kişisel
// olmayan otomotiv referans verisi (motor/araç bilgisi) döndürüyor — hassas değil.
// Yazma endpoint'leri zaten x-api-key ile korunuyor. Kısıtlama eklemek, admin panelin
// yerel dosya (file://) olarak açılmasını ve mobil web önizlemesini karmaşıklaştırırdı.
// /api/auth altındaki uç noktalar ise kişisel veri içeriyor, ama bunlar CORS ile değil
// (mobil uygulama zaten tarayıcı değil) JWT + bcrypt ile korunuyor.
app.use(cors());
app.use(express.json());
app.use(readLimiter); // Tüm endpoint'lere genel bir üst sınır; yazma rotaları kendi içinde ayrıca daha sıkı bir limit uyguluyor.

app.get('/', (req, res) => {
  res.json({ status: 'MotorKarne API çalışıyor', version: '1.0.0' });
});

// Bağlantı ve veri sağlığını hızlıca kontrol etmek için
app.get('/health', async (req, res) => {
  try {
    const [[{ motor_count }]] = await pool.query('SELECT COUNT(*) AS motor_count FROM motors');
    const [[{ vehicle_count }]] = await pool.query('SELECT COUNT(*) AS vehicle_count FROM vehicles');
    res.json({ status: 'ok', motor_count, vehicle_count });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/motors', motorsRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/auth', authRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Bulunamadı.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MotorKarne API http://localhost:${PORT} üzerinde çalışıyor`);
  console.log(`Sağlık kontrolü: http://localhost:${PORT}/health`);
});
