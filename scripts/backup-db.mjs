/**
 * Script de Backup do Banco de Dados - SAMS Locações
 * Compatível com TiDB Serverless (Manus)
 *
 * Uso:
 *   node scripts/backup-db.mjs              → backup completo
 *   node scripts/backup-db.mjs --list       → listar backups
 *   node scripts/backup-db.mjs --restore <arquivo.sql.gz>  → restaurar
 *   node scripts/backup-db.mjs --clean      → remover backups antigos
 */

import { execSync, spawn } from 'child_process';
import { createWriteStream, createReadStream, existsSync, mkdirSync,
         readdirSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// ─── Configurações ──────────────────────────────────────────────────────────
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(PROJECT_ROOT, 'backups', 'database');
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30');
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ DATABASE_URL não encontrada no ambiente');
  process.exit(1);
}

const dbUrl = new URL(DB_URL);
const DB_HOST = dbUrl.hostname;
const DB_PORT = dbUrl.port || '4000';
const DB_USER = decodeURIComponent(dbUrl.username);
const DB_PASS = decodeURIComponent(dbUrl.password);
const DB_NAME = dbUrl.pathname.replace('/', '');

// ─── Utilitários ─────────────────────────────────────────────────────────────
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const ok  = (msg) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`);
const err = (msg) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`);

const fmtBytes = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
const fmtMs    = (ms) => ms < 1000 ? ms+'ms' : ms < 60000 ? (ms/1000).toFixed(1)+'s' : Math.floor(ms/60000)+'m '+Math.floor((ms%60000)/1000)+'s';

async function calcChecksum(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

// ─── Backup ──────────────────────────────────────────────────────────────────
async function doBackup() {
  const t0 = Date.now();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sqlGz  = path.join(BACKUP_DIR, `db-backup-${ts}.sql.gz`);
  const jsonMf = path.join(BACKUP_DIR, `db-backup-${ts}.json`);

  log('Iniciando backup do banco de dados (TiDB Serverless)...');
  log(`Host: ${DB_HOST}:${DB_PORT} | DB: ${DB_NAME}`);
  log(`Destino: ${sqlGz}`);

  mkdirSync(BACKUP_DIR, { recursive: true });

  // Flags compatíveis com TiDB Serverless:
  // - sem --single-transaction (causa erro SAVEPOINT no TiDB)
  // - --skip-lock-tables (TiDB não suporta LOCK TABLES)
  // - --no-tablespaces (TiDB não suporta TABLESPACE)
  // - --ssl-mode=PREFERRED
  const dumpArgs = [
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    `--password=${DB_PASS}`,
    `--ssl-mode=PREFERRED`,
    `--no-tablespaces`,
    `--skip-lock-tables`,
    `--add-drop-table`,
    `--create-options`,
    `--extended-insert`,
    `--complete-insert`,
    `--hex-blob`,
    DB_NAME
  ];

  log('Executando mysqldump com compressão gzip...');
  await new Promise((resolve, reject) => {
    const dump   = spawn('mysqldump', dumpArgs);
    const gzip   = createGzip({ level: 9 });
    const output = createWriteStream(sqlGz);

    dump.stdout.pipe(gzip).pipe(output);

    let stderrBuf = '';
    dump.stderr.on('data', (d) => { stderrBuf += d; });

    output.on('finish', resolve);
    output.on('error', reject);
    dump.on('error', reject);
    dump.on('close', (code) => {
      // Ignorar avisos de senha e erros não-fatais do TiDB
      const fatalErrors = stderrBuf.split('\n').filter(l =>
        l.includes('[ERROR]') && !l.includes('password') && !l.includes('SAVEPOINT')
      );
      if (fatalErrors.length > 0) {
        reject(new Error(`mysqldump falhou (código ${code}):\n${fatalErrors.join('\n')}`));
      }
    });
  });

  const stats = statSync(sqlGz);
  if (stats.size === 0) throw new Error('Arquivo de backup vazio!');

  const checksum = await calcChecksum(sqlGz);

  // Contar tabelas no backup
  let tableCount = 0;
  try {
    const result = execSync(`zcat "${sqlGz}" | grep -c "^CREATE TABLE" || true`, { encoding: 'utf8' });
    tableCount = parseInt(result.trim()) || 0;
  } catch { tableCount = 0; }

  const manifest = {
    version: '1.0',
    created_at: new Date().toISOString(),
    database: DB_NAME,
    host: DB_HOST,
    file: path.basename(sqlGz),
    size_bytes: stats.size,
    size_human: fmtBytes(stats.size),
    checksum_sha256: checksum,
    duration_ms: Date.now() - t0,
    duration_human: fmtMs(Date.now() - t0),
    table_count: tableCount,
    compressed: true,
    format: 'mysqldump+gzip',
    engine: 'TiDB Serverless'
  };
  writeFileSync(jsonMf, JSON.stringify(manifest, null, 2));

  ok(`Backup concluído!`);
  ok(`Arquivo: ${path.basename(sqlGz)}`);
  ok(`Tamanho: ${fmtBytes(stats.size)}`);
  ok(`Tabelas: ${tableCount}`);
  ok(`SHA256:  ${checksum.slice(0, 16)}...`);
  ok(`Duração: ${fmtMs(Date.now() - t0)}`);

  await cleanOldBackups();
  return { file: sqlGz, manifest };
}

// ─── Restore ─────────────────────────────────────────────────────────────────
async function doRestore(backupFile) {
  if (!existsSync(backupFile)) {
    err(`Arquivo não encontrado: ${backupFile}`);
    process.exit(1);
  }

  const t0 = Date.now();
  log(`Iniciando restore...`);
  log(`Arquivo: ${backupFile}`);

  // Verificar checksum
  const jsonMf = backupFile.replace('.sql.gz', '.json');
  if (existsSync(jsonMf)) {
    const mf = JSON.parse(readFileSync(jsonMf, 'utf8'));
    log(`Verificando integridade (SHA256)...`);
    const checksum = await calcChecksum(backupFile);
    if (checksum !== mf.checksum_sha256) {
      err(`Checksum inválido! Arquivo corrompido.`);
      err(`Esperado:   ${mf.checksum_sha256}`);
      err(`Encontrado: ${checksum}`);
      process.exit(1);
    }
    ok(`Integridade OK: ${checksum.slice(0, 16)}...`);
    log(`Backup criado em: ${mf.created_at} | ${mf.table_count} tabelas`);
  }

  log('Descomprimindo e restaurando...');
  const mysqlArgs = [
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    `--password=${DB_PASS}`,
    `--ssl-mode=PREFERRED`,
    DB_NAME
  ];

  await new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const input  = createReadStream(backupFile);
    const mysql  = spawn('mysql', mysqlArgs);

    input.pipe(gunzip).pipe(mysql.stdin);

    let stderrBuf = '';
    mysql.stderr.on('data', (d) => { stderrBuf += d; });
    mysql.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mysql falhou (código ${code}): ${stderrBuf.slice(0, 300)}`));
    });
    mysql.on('error', reject);
  });

  ok(`Restore concluído em ${fmtMs(Date.now() - t0)}!`);
}

// ─── Listar backups ───────────────────────────────────────────────────────────
async function listBackups() {
  if (!existsSync(BACKUP_DIR)) {
    log('Nenhum backup encontrado (diretório não existe ainda)');
    return [];
  }

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => {
      const fp = path.join(BACKUP_DIR, f);
      const st = statSync(fp);
      let mf = null;
      const mfp = fp.replace('.sql.gz', '.json');
      if (existsSync(mfp)) { try { mf = JSON.parse(readFileSync(mfp, 'utf8')); } catch {} }
      return { file: f, path: fp, size: st.size, created: st.mtime, manifest: mf };
    })
    .sort((a, b) => b.created - a.created);

  log(`\n📦 Backups disponíveis (${files.length}):`);
  files.forEach((f, i) => {
    const date  = f.created.toLocaleString('pt-BR');
    const tbls  = f.manifest?.table_count ? ` | ${f.manifest.table_count} tabelas` : '';
    const chk   = f.manifest?.checksum_sha256 ? ` | SHA256: ${f.manifest.checksum_sha256.slice(0,12)}...` : '';
    log(`  ${i + 1}. ${f.file} (${fmtBytes(f.size)}${tbls}${chk}) — ${date}`);
  });

  return files;
}

// ─── Limpar backups antigos ───────────────────────────────────────────────────
async function cleanOldBackups() {
  if (!existsSync(BACKUP_DIR)) return;
  const cutoff = Date.now() - (RETENTION_DAYS * 86400000);
  let removed = 0;
  for (const f of readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql.gz'))) {
    const fp = path.join(BACKUP_DIR, f);
    if (statSync(fp).mtime.getTime() < cutoff) {
      unlinkSync(fp);
      const mfp = fp.replace('.sql.gz', '.json');
      if (existsSync(mfp)) unlinkSync(mfp);
      removed++;
      log(`🗑️ Removido: ${f}`);
    }
  }
  if (removed > 0) ok(`${removed} backup(s) antigo(s) removido(s)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
try {
  if (args.includes('--list'))    await listBackups();
  else if (args.includes('--restore')) {
    const idx = args.indexOf('--restore');
    const file = args[idx + 1];
    if (!file) { err('Informe o arquivo: --restore <arquivo.sql.gz>'); process.exit(1); }
    await doRestore(file);
  }
  else if (args.includes('--clean')) await cleanOldBackups();
  else await doBackup();
} catch (e) {
  err(e.message);
  process.exit(1);
}
