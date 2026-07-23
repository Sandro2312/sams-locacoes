import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);
const [rows] = await conn.query(
  'SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME'
);
let total = 0;
rows.forEach(r => {
  const n = r.TABLE_ROWS || 0;
  total += n;
  if (n > 0) console.log(r.TABLE_NAME.padEnd(35), n, 'linhas');
});
console.log('---');
console.log('Total tabelas:', rows.length, '| Total registros (aprox):', total);
await conn.end();
process.exit(0);
