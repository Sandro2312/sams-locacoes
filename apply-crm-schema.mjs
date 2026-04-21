import mysql from 'mysql2/promise';
import fs from 'fs';

const sql = fs.readFileSync('/home/ubuntu/sams-locacoes/drizzle/crm-schema.sql', 'utf8');

// Split por ; mas ignorar dentro de strings e comentários
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SET FOREIGN_KEY_CHECKS'));

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Desabilitar FK checks temporariamente
await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

let ok = 0, skip = 0, err = 0;
for (const stmt of statements) {
  if (!stmt || stmt.startsWith('--')) { skip++; continue; }
  try {
    await conn.execute(stmt);
    ok++;
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.message.includes('already exists') || e.message.includes('Duplicate key name')) {
      skip++;
    } else {
      console.error('ERR:', e.message.substring(0, 120));
      console.error('SQL:', stmt.substring(0, 80));
      err++;
    }
  }
}

await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
await conn.end();
console.log(`✅ Done: ${ok} executed, ${skip} skipped, ${err} errors`);
