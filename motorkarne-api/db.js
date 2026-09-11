// TiDB bağlantı havuzu — tüm route'lar bunu kullanır.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: Number(process.env.TIDB_PORT),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: { minVersion: 'TLSv1.2' },
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
