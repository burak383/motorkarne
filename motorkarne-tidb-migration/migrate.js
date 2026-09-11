// MotorKarne verisini TiDB Serverless'e aktaran betik.
// Çalıştırmadan önce: npm install, sonra .env dosyasını doldur.
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const motors = JSON.parse(fs.readFileSync(path.join(__dirname, 'motors.json'), 'utf-8'));
  const vehicles = JSON.parse(fs.readFileSync(path.join(__dirname, 'vehicles.json'), 'utf-8'));

  console.log(`Okundu: ${motors.length} motor, ${vehicles.length} araç. Bağlanılıyor...`);

  const connection = await mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl: { minVersion: 'TLSv1.2' }, // TiDB Cloud SSL bağlantı gerektirir
  });

  console.log('Bağlantı başarılı. Veri aktarımı başlıyor...');

  // --- 1) MOTORLAR ---
  for (const m of motors) {
    await connection.execute(
      `INSERT INTO motors (id, name, code, fuel, power, torque, transmission, consumption, score, risk, risk_level, note, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), code=VALUES(code), fuel=VALUES(fuel), power=VALUES(power),
         torque=VALUES(torque), transmission=VALUES(transmission), consumption=VALUES(consumption),
         score=VALUES(score), risk=VALUES(risk), risk_level=VALUES(risk_level),
         note=VALUES(note), image_url=VALUES(image_url)`,
      [
        m.id, m.name, m.code || null, m.fuel || null, m.power || null,
        m.torque || null, m.transmission || null, m.consumption || null,
        m.score ?? null, m.risk || null, m.riskLevel, m.note || null, m.imageUrl || null,
      ]
    );

    // Marka ilişkileri (many-to-many) — önce eskisini temizle, sonra ekle (idempotent hale getirmek için)
    await connection.execute(`DELETE FROM motor_brands WHERE motor_id = ?`, [m.id]);
    for (const brand of m.brands || []) {
      await connection.execute(
        `INSERT INTO motor_brands (motor_id, brand_name) VALUES (?, ?)`,
        [m.id, brand]
      );
    }

    // Artılar
    await connection.execute(`DELETE FROM motor_pros WHERE motor_id = ?`, [m.id]);
    for (let i = 0; i < (m.pros || []).length; i++) {
      await connection.execute(
        `INSERT INTO motor_pros (motor_id, text, sort_order) VALUES (?, ?, ?)`,
        [m.id, m.pros[i], i]
      );
    }

    // Eksiler
    await connection.execute(`DELETE FROM motor_cons WHERE motor_id = ?`, [m.id]);
    for (let i = 0; i < (m.cons || []).length; i++) {
      await connection.execute(
        `INSERT INTO motor_cons (motor_id, text, sort_order) VALUES (?, ?, ?)`,
        [m.id, m.cons[i], i]
      );
    }

    // Kronik sorunlar
    await connection.execute(`DELETE FROM chronic_issues WHERE motor_id = ?`, [m.id]);
    for (let i = 0; i < (m.chronic || []).length; i++) {
      const c = m.chronic[i];
      await connection.execute(
        `INSERT INTO chronic_issues (motor_id, title, risk, description, solution, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [m.id, c.title, c.risk || null, c.desc || null, c.solution || null, i]
      );
    }

    console.log(`  ✓ Motor: ${m.id}`);
  }

  // --- 2) ARAÇLAR ---
  for (const v of vehicles) {
    await connection.execute(
      `INSERT INTO vehicles (id, name, brand, description, score, engine, motor_id, img, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), brand=VALUES(brand), description=VALUES(description),
         score=VALUES(score), engine=VALUES(engine), motor_id=VALUES(motor_id),
         img=VALUES(img), note=VALUES(note)`,
      [
        v.id, v.name, v.brand, v.desc || null, v.score ?? null,
        v.engine || null, v.motorId || null, v.img || null, v.note || null,
      ]
    );
    console.log(`  ✓ Araç: ${v.id}`);
  }

  console.log(`\nTamamlandı! ${motors.length} motor ve ${vehicles.length} araç TiDB'ye aktarıldı.`);
  await connection.end();
}

main().catch((err) => {
  console.error('HATA:', err);
  process.exit(1);
});
