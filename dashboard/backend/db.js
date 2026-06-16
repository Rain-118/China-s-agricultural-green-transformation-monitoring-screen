import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '666666',
  database: 'agriculture_green',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});

export default pool;
