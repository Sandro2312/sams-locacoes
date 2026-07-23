# 🔒 Guia Completo de Backup e Restore - SAMS Locações

## 📋 Visão Geral

O sistema SAMS Locações possui três camadas críticas que precisam de backup:

1. **Código-fonte** (GitHub)
2. **Banco de dados** (MySQL/TiDB)
3. **Arquivos estáticos** (S3 - imagens, documentos)

---

## 1️⃣ BACKUP DO CÓDIGO-FONTE

### Opção A: Via GitHub (Recomendado)

O código está sincronizado automaticamente com GitHub. Todos os commits são backups imutáveis.

**Verificar status:**
```bash
cd /home/ubuntu/sams-locacoes
git remote -v
git log --oneline -5
```

**Fazer commit e push manual:**
```bash
git add .
git commit -m "Backup manual - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
```

**Restaurar de uma versão anterior:**
```bash
# Ver histórico
git log --oneline

# Restaurar para um commit específico
git checkout <commit-hash>

# Ou restaurar um arquivo específico
git checkout <commit-hash> -- <caminho-arquivo>
```

### Opção B: Backup Local (Complementar)

```bash
# Criar arquivo ZIP do código
cd /home/ubuntu
tar -czf sams-locacoes-backup-$(date +%Y%m%d-%H%M%S).tar.gz sams-locacoes/

# Listar backups
ls -lh sams-locacoes-backup-*.tar.gz

# Restaurar de um backup
tar -xzf sams-locacoes-backup-20260723-143000.tar.gz
```

---

## 2️⃣ BACKUP DO BANCO DE DADOS

### Informações de Conexão

```
HOST: Obtido via Management UI → Database → Settings (bottom-left)
PORT: 3306 (padrão MySQL)
DATABASE: sams_locacoes (ou nome configurado)
USER: root (ou usuário configurado)
PASSWORD: Obtido via Management UI → Secrets
SSL: Recomendado ativar em produção
```

### Opção A: Backup via MySQL Dump (Recomendado)

**Fazer backup completo:**
```bash
# Backup com compressão
mysqldump -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED \
  --single-transaction --quick --lock-tables=false \
  sams_locacoes | gzip > db-backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Exemplo com credenciais (NÃO use em produção - use variáveis de ambiente)
mysqldump -h db.example.com -u root -p'senha123' --ssl-mode=REQUIRED \
  sams_locacoes | gzip > db-backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

**Backup apenas de estrutura (sem dados):**
```bash
mysqldump -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED \
  --no-data sams_locacoes | gzip > db-schema-$(date +%Y%m%d-%H%M%S).sql.gz
```

**Backup apenas de dados (sem estrutura):**
```bash
mysqldump -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED \
  --no-create-info sams_locacoes | gzip > db-data-$(date +%Y%m%d-%H%M%S).sql.gz
```

### Opção B: Backup via Manus Management UI

1. Acesse **Management UI** → **Database**
2. Clique em **Settings** (ícone de engrenagem, bottom-left)
3. Copie as credenciais de conexão
4. Use ferramentas como **MySQL Workbench** ou **DBeaver** para fazer backup
5. Exporte como SQL ou CSV conforme necessário

### Opção C: Backup Automático (Agendado)

Criar script que roda diariamente:

```bash
#!/bin/bash
# /home/ubuntu/backup-db-daily.sh

BACKUP_DIR="/home/ubuntu/db-backups"
DB_HOST="db.example.com"
DB_USER="root"
DB_PASS="senha123"
DB_NAME="sams_locacoes"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Fazer backup
BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql.gz"
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS --ssl-mode=REQUIRED \
  --single-transaction --quick --lock-tables=false \
  $DB_NAME | gzip > $BACKUP_FILE

echo "✅ Backup criado: $BACKUP_FILE"

# Remover backups antigos (mais de 30 dias)
find $BACKUP_DIR -name "db-backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "🧹 Backups antigos removidos"

# Enviar para storage externo (S3, Google Drive, etc.)
# aws s3 cp $BACKUP_FILE s3://seu-bucket/backups/
```

**Agendar com cron (executar diariamente às 2:00 AM):**
```bash
crontab -e

# Adicionar linha:
0 2 * * * /home/ubuntu/backup-db-daily.sh >> /home/ubuntu/backup-db-daily.log 2>&1
```

### Restaurar Banco de Dados

**Restaurar de um backup completo:**
```bash
# Descompactar e restaurar
gunzip < db-backup-20260723-143000.sql.gz | mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes

# Ou em duas etapas
gunzip db-backup-20260723-143000.sql.gz
mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes < db-backup-20260723-143000.sql
```

**Restaurar apenas estrutura (criar tabelas vazias):**
```bash
gunzip < db-schema-20260723-143000.sql.gz | mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes
```

**Restaurar apenas dados (em tabelas existentes):**
```bash
gunzip < db-data-20260723-143000.sql.gz | mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes
```

**Verificar integridade após restore:**
```bash
mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes -e "
  SELECT TABLE_NAME, TABLE_ROWS 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA='sams_locacoes' 
  ORDER BY TABLE_NAME;
"
```

---

## 3️⃣ BACKUP DE ARQUIVOS (S3)

### Informações de Acesso

Os arquivos estáticos (imagens, documentos) são armazenados em S3 automaticamente pelo Manus.

**Credenciais:**
- Acesse **Management UI** → **Secrets** para ver as chaves S3
- Ou use o comando: `manus-config config load --search s3`

### Opção A: Backup via AWS CLI

**Instalar AWS CLI:**
```bash
sudo apt-get install awscli
```

**Configurar credenciais:**
```bash
aws configure
# Inserir: Access Key ID, Secret Access Key, Region, Output format
```

**Fazer backup de todos os arquivos:**
```bash
aws s3 sync s3://seu-bucket/sams-locacoes ./s3-backup-$(date +%Y%m%d) \
  --region us-east-1 --sse AES256
```

**Fazer backup apenas de um período:**
```bash
# Arquivos modificados nos últimos 7 dias
aws s3 sync s3://seu-bucket/sams-locacoes ./s3-backup-7days \
  --region us-east-1 \
  --exclude "*" \
  --include "*.jpg" \
  --include "*.png" \
  --include "*.pdf"
```

### Opção B: Backup via Manus Upload

```bash
# Listar arquivos em S3
manus-upload-file --list

# Fazer backup de um arquivo específico
manus-upload-file --download s3://seu-bucket/arquivo.jpg ./backup/
```

### Restaurar Arquivos S3

**Restaurar arquivo específico:**
```bash
aws s3 cp ./s3-backup-20260723/arquivo.jpg s3://seu-bucket/sams-locacoes/arquivo.jpg
```

**Restaurar pasta completa:**
```bash
aws s3 sync ./s3-backup-20260723 s3://seu-bucket/sams-locacoes/ \
  --region us-east-1 --sse AES256
```

---

## 4️⃣ BACKUP COMPLETO DO SISTEMA

### Script de Backup Integrado

Criar script que faz backup de tudo:

```bash
#!/bin/bash
# /home/ubuntu/backup-system-complete.sh

BACKUP_BASE="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_BASE/backup-$TIMESTAMP"

echo "🔄 Iniciando backup completo do sistema SAMS Locações..."
mkdir -p $BACKUP_DIR

# 1. Backup do código
echo "📦 Backup do código-fonte..."
cd /home/ubuntu/sams-locacoes
git bundle create $BACKUP_DIR/code.bundle --all
tar -czf $BACKUP_DIR/code.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.manus-logs \
  --exclude=dist \
  .

# 2. Backup do banco de dados
echo "🗄️ Backup do banco de dados..."
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS --ssl-mode=REQUIRED \
  --single-transaction --quick --lock-tables=false \
  sams_locacoes | gzip > $BACKUP_DIR/database.sql.gz

# 3. Backup de arquivos S3
echo "☁️ Backup de arquivos S3..."
aws s3 sync s3://seu-bucket/sams-locacoes $BACKUP_DIR/s3-files \
  --region us-east-1

# 4. Backup de configurações
echo "⚙️ Backup de configurações..."
cp /home/ubuntu/sams-locacoes/.env.local $BACKUP_DIR/.env.local 2>/dev/null || true
cp /home/ubuntu/sams-locacoes/drizzle.config.ts $BACKUP_DIR/
cp /home/ubuntu/sams-locacoes/package.json $BACKUP_DIR/

# 5. Criar manifesto
echo "📋 Criando manifesto..."
cat > $BACKUP_DIR/MANIFEST.txt << EOF
BACKUP COMPLETO - SAMS LOCAÇÕES
Data: $(date)
Hostname: $(hostname)
Usuário: $(whoami)

Conteúdo:
- code.tar.gz: Código-fonte (sem node_modules)
- code.bundle: Repositório Git completo
- database.sql.gz: Banco de dados MySQL
- s3-files/: Arquivos estáticos
- Configurações: .env.local, drizzle.config.ts, package.json

Tamanho total: $(du -sh $BACKUP_DIR | cut -f1)
EOF

# 6. Comprimir tudo
echo "🗜️ Comprimindo backup..."
cd $BACKUP_BASE
tar -czf backup-$TIMESTAMP.tar.gz backup-$TIMESTAMP/

# 7. Calcular checksum
echo "🔐 Calculando checksum..."
sha256sum backup-$TIMESTAMP.tar.gz > backup-$TIMESTAMP.sha256

echo "✅ Backup completo concluído!"
echo "📍 Local: $BACKUP_BASE/backup-$TIMESTAMP.tar.gz"
echo "📊 Tamanho: $(du -sh $BACKUP_BASE/backup-$TIMESTAMP.tar.gz | cut -f1)"

# 8. Enviar para storage externo (opcional)
# aws s3 cp $BACKUP_BASE/backup-$TIMESTAMP.tar.gz s3://seu-bucket-backup/
```

**Executar backup:**
```bash
chmod +x /home/ubuntu/backup-system-complete.sh
/home/ubuntu/backup-system-complete.sh
```

### Agendar Backup Automático

```bash
# Editar crontab
crontab -e

# Adicionar (executar diariamente às 3:00 AM)
0 3 * * * /home/ubuntu/backup-system-complete.sh >> /home/ubuntu/backup-complete.log 2>&1

# Adicionar (executar semanalmente aos domingos às 4:00 AM)
0 4 * * 0 /home/ubuntu/backup-system-complete.sh >> /home/ubuntu/backup-complete.log 2>&1
```

---

## 5️⃣ RESTORE COMPLETO DO SISTEMA

### Pré-requisitos

1. Ter acesso ao arquivo `backup-YYYYMMDD-HHMMSS.tar.gz`
2. Ter acesso às credenciais do banco de dados
3. Ter acesso às chaves AWS S3

### Procedimento de Restore

**Passo 1: Extrair backup**
```bash
cd /tmp
tar -xzf /caminho/para/backup-20260723-143000.tar.gz
cd backup-20260723-143000
```

**Passo 2: Restaurar código**
```bash
# Opção A: Via Git bundle
cd /home/ubuntu/sams-locacoes
git bundle unbundle code.bundle

# Opção B: Via tar
cd /home/ubuntu
tar -xzf /tmp/backup-20260723-143000/code.tar.gz -C sams-locacoes/
```

**Passo 3: Restaurar banco de dados**
```bash
# Criar banco de dados vazio (se não existir)
mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED -e "CREATE DATABASE IF NOT EXISTS sams_locacoes;"

# Restaurar dados
gunzip < /tmp/backup-20260723-143000/database.sql.gz | \
  mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes
```

**Passo 4: Restaurar arquivos S3**
```bash
aws s3 sync /tmp/backup-20260723-143000/s3-files \
  s3://seu-bucket/sams-locacoes \
  --region us-east-1 --sse AES256
```

**Passo 5: Restaurar configurações**
```bash
cp /tmp/backup-20260723-143000/.env.local /home/ubuntu/sams-locacoes/
cp /tmp/backup-20260723-143000/drizzle.config.ts /home/ubuntu/sams-locacoes/
```

**Passo 6: Reiniciar aplicação**
```bash
cd /home/ubuntu/sams-locacoes
pnpm install
pnpm build
pm2 restart sams-locacoes
```

**Passo 7: Verificar integridade**
```bash
# Verificar banco de dados
mysql -h <HOST> -u <USER> -p<PASSWORD> --ssl-mode=REQUIRED sams_locacoes -e "SELECT COUNT(*) FROM clientes;"

# Verificar arquivos S3
aws s3 ls s3://seu-bucket/sams-locacoes --recursive --human-readable

# Verificar aplicação
curl -s http://localhost:3000/api/health | jq .
```

---

## 6️⃣ BOAS PRÁTICAS DE SEGURANÇA

### ✅ Fazer

- ✅ Fazer backup **diariamente** (automático)
- ✅ Armazenar backups em **múltiplos locais** (local + S3 + nuvem externa)
- ✅ **Testar restore** regularmente (mensal)
- ✅ **Criptografar** backups em trânsito e em repouso
- ✅ **Rotacionar** backups antigos (manter últimos 30 dias)
- ✅ **Documentar** procedimento de restore
- ✅ **Monitorar** sucesso/falha de backups

### ❌ Não Fazer

- ❌ Armazenar backups **apenas localmente**
- ❌ Usar **senhas em plain text** em scripts
- ❌ **Nunca testar** restore até precisar
- ❌ Deixar backups **sem criptografia**
- ❌ Manter backups **indefinidamente** (custo)
- ❌ Compartilhar **credenciais** de backup
- ❌ Fazer backup **sem verificar integridade**

---

## 7️⃣ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Configurar GitHub como repositório principal
- [ ] Agendar backup automático do banco de dados (diário)
- [ ] Agendar backup automático de arquivos S3 (semanal)
- [ ] Criar script de backup integrado
- [ ] Testar procedimento de restore (completo)
- [ ] Documentar credenciais em local seguro (password manager)
- [ ] Configurar alertas de falha de backup
- [ ] Revisar e atualizar este guia mensalmente

---

## 📞 Suporte e Contato

**Para dúvidas sobre backup/restore:**
- Documentação Manus: https://help.manus.im
- GitHub: https://github.com/seu-usuario/sams-locacoes
- Suporte: support@manus.im

---

**Última atualização:** 23 de julho de 2026
**Versão do sistema:** 59d3ab40
