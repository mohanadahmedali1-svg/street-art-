require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

async function initDB() {
  pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit:    10,
  });

  const conn = await pool.getConnection();
  console.log(' Connected to MySQL');
  conn.release();

  return pool;
}

function getDB() {
  return pool;
}

module.exports = { initDB, getDB };
