# 🔐 Checklist de Segurança - SAMS Locações

## 📊 Status de Implementação

| Item | Status | Data | Responsável |
|------|--------|------|-------------|
| Backup automático do BD | ⏳ Pendente | - | - |
| Backup de arquivos S3 | ⏳ Pendente | - | - |
| Sincronização GitHub | ✅ Ativo | 2026-07-23 | Sistema |
| Criptografia SSL/TLS | ✅ Ativo | 2026-07-23 | Manus |
| Autenticação de usuários | ✅ Ativo | 2026-07-23 | OAuth Manus |
| Validação de dados | ✅ Ativo | 2026-07-23 | UnifiedValidator |
| Logs de auditoria | ⏳ Pendente | - | - |
| Monitoramento de segurança | ⏳ Pendente | - | - |

---

## 🔧 IMPLEMENTAÇÃO IMEDIATA

### 1. Ativar Backup Automático do Banco de Dados

**Passo 1: Obter credenciais do banco de dados**

```bash
# Acessar Management UI → Database → Settings (bottom-left)
# Copiar: HOST, PORT, USER, PASSWORD
```

**Passo 2: Configurar variáveis de ambiente**

```bash
# Editar arquivo de configuração
nano ~/.bashrc

# Adicionar ao final:
export DB_HOST="db.seu-host.com"
export DB_USER="root"
export DB_PASS="sua_senha_aqui"
export DB_NAME="sams_locacoes"
export BACKUP_DIR="/home/ubuntu/db-backups"
export RETENTION_DAYS="30"

# Aplicar mudanças
source ~/.bashrc
```

**Passo 3: Testar o script de backup**

```bash
# Executar manualmente para testar
/home/ubuntu/backup-db-daily.sh

# Verificar se o backup foi criado
ls -lh /home/ubuntu/db-backups/
```

**Passo 4: Agendar com cron**

```bash
# Abrir editor de cron
crontab -e

# Adicionar linhas (executar diariamente às 2:00 AM):
0 2 * * * /home/ubuntu/backup-db-daily.sh >> /home/ubuntu/backup-db-daily.log 2>&1

# Verificar cron agendado
crontab -l
```

### 2. Ativar Backup de Arquivos S3

**Passo 1: Instalar AWS CLI**

```bash
sudo apt-get update
sudo apt-get install -y awscli
```

**Passo 2: Configurar credenciais AWS**

```bash
# Obter chaves em Management UI → Secrets
aws configure

# Inserir:
# AWS Access Key ID: [chave-acesso]
# AWS Secret Access Key: [chave-secreta]
# Default region name: us-east-1
# Default output format: json
```

**Passo 3: Criar script de backup S3**

```bash
cat > /home/ubuntu/backup-s3-weekly.sh << 'EOF'
#!/bin/bash
# Backup semanal de arquivos S3

BACKUP_DIR="/home/ubuntu/s3-backups"
BUCKET="seu-bucket-name"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

echo "[$(date)] Iniciando backup de S3..."
aws s3 sync s3://$BUCKET/sams-locacoes $BACKUP_DIR/backup-$TIMESTAMP \
  --region us-east-1 \
  --sse AES256

echo "[$(date)] Backup concluído: $BACKUP_DIR/backup-$TIMESTAMP"
EOF

chmod +x /home/ubuntu/backup-s3-weekly.sh
```

**Passo 4: Agendar backup S3 (semanal)**

```bash
crontab -e

# Adicionar linha (executar toda segunda-feira às 3:00 AM):
0 3 * * 1 /home/ubuntu/backup-s3-weekly.sh >> /home/ubuntu/backup-s3-weekly.log 2>&1
```

### 3. Ativar Sincronização GitHub

**Passo 1: Verificar configuração Git**

```bash
cd /home/ubuntu/sams-locacoes
git remote -v
git config user.name
git config user.email
```

**Passo 2: Fazer commit e push manual**

```bash
cd /home/ubuntu/sams-locacoes
git add .
git commit -m "Backup segurança - $(date '+%Y-%m-%d')"
git push origin main
```

**Passo 3: Agendar sincronização automática**

```bash
cat > /home/ubuntu/git-sync-daily.sh << 'EOF'
#!/bin/bash
# Sincronização diária com GitHub

cd /home/ubuntu/sams-locacoes

# Fazer pull de atualizações remotas
git pull origin main || true

# Adicionar todas as mudanças
git add .

# Verificar se há mudanças
if ! git diff --cached --quiet; then
    git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin main
    echo "[$(date)] ✅ Sincronização com GitHub concluída"
else
    echo "[$(date)] ℹ️ Nenhuma mudança para sincronizar"
fi
EOF

chmod +x /home/ubuntu/git-sync-daily.sh
```

**Passo 4: Agendar sincronização Git**

```bash
crontab -e

# Adicionar linha (executar diariamente às 4:00 AM):
0 4 * * * /home/ubuntu/git-sync-daily.sh >> /home/ubuntu/git-sync-daily.log 2>&1
```

---

## 📋 CHECKLIST DE SEGURANÇA

### Backup e Recuperação

- [ ] **Backup automático do BD** - Configurado e testado
  - [ ] Script `/home/ubuntu/backup-db-daily.sh` executável
  - [ ] Cron agendado para executar diariamente
  - [ ] Pelo menos 3 backups recentes verificados
  - [ ] Teste de restore realizado com sucesso

- [ ] **Backup de arquivos S3** - Configurado e testado
  - [ ] AWS CLI instalado e configurado
  - [ ] Script de backup criado e testado
  - [ ] Cron agendado para executar semanalmente
  - [ ] Verificar integridade de arquivos restaurados

- [ ] **Sincronização GitHub** - Configurada
  - [ ] Repositório remoto configurado
  - [ ] Commits regulares sendo feitos
  - [ ] Push para main funcionando
  - [ ] Histórico de commits preservado

### Acesso e Autenticação

- [ ] **Credenciais seguras**
  - [ ] Senhas não armazenadas em plain text
  - [ ] Usar password manager (1Password, Bitwarden, etc.)
  - [ ] Credenciais de BD em variáveis de ambiente
  - [ ] Chaves AWS em `~/.aws/credentials`

- [ ] **Controle de acesso**
  - [ ] Apenas usuários autorizados têm acesso ao CRM
  - [ ] Senhas alteradas regularmente (a cada 90 dias)
  - [ ] Dois fatores (2FA) ativado para contas críticas
  - [ ] Logs de acesso monitorados

### Proteção de Dados

- [ ] **Criptografia em trânsito**
  - [ ] HTTPS ativado em produção
  - [ ] SSL/TLS configurado corretamente
  - [ ] Certificado válido e atualizado

- [ ] **Criptografia em repouso**
  - [ ] Backups comprimidos com gzip
  - [ ] Backups criptografados (AES-256)
  - [ ] Chaves de criptografia seguras

- [ ] **Validação de dados**
  - [ ] Validação de entrada em todos os formulários
  - [ ] Sanitização de dados antes de armazenar
  - [ ] Proteção contra SQL injection
  - [ ] Proteção contra XSS

### Monitoramento e Alertas

- [ ] **Logs de auditoria**
  - [ ] Logs de acesso ao sistema
  - [ ] Logs de mudanças em dados críticos
  - [ ] Logs de operações de backup
  - [ ] Retenção de logs por pelo menos 90 dias

- [ ] **Alertas configurados**
  - [ ] Alerta quando backup falha
  - [ ] Alerta quando espaço em disco está baixo
  - [ ] Alerta quando há tentativa de acesso não autorizado
  - [ ] Alerta quando há mudança em dados críticos

### Testes e Validação

- [ ] **Testes de restore**
  - [ ] Teste de restore completo (mensal)
  - [ ] Teste de restore parcial (trimestral)
  - [ ] Documentação do procedimento atualizada
  - [ ] Tempo de RTO (Recovery Time Objective) verificado

- [ ] **Testes de segurança**
  - [ ] Teste de penetração (anual)
  - [ ] Verificação de vulnerabilidades (trimestral)
  - [ ] Auditoria de acesso (semestral)
  - [ ] Revisão de logs de segurança (mensal)

### Documentação

- [ ] **Documentação atualizada**
  - [ ] Procedimento de backup documentado
  - [ ] Procedimento de restore documentado
  - [ ] Plano de recuperação de desastres (DRP)
  - [ ] Contatos de emergência atualizados

---

## 🚨 PROCEDIMENTO DE EMERGÊNCIA

### Se o sistema foi comprometido:

1. **Isolar o sistema**
   ```bash
   # Desligar o servidor
   sudo shutdown -h now
   ```

2. **Restaurar de backup limpo**
   ```bash
   # Usar backup anterior à data do incidente
   # Seguir procedimento em BACKUP_RESTORE_GUIDE.md
   ```

3. **Investigar o incidente**
   - Revisar logs de acesso
   - Verificar mudanças não autorizadas
   - Documentar timeline do incidente

4. **Implementar correções**
   - Atualizar senhas
   - Revisar permissões de acesso
   - Aplicar patches de segurança

5. **Comunicar stakeholders**
   - Informar clientes se dados foram expostos
   - Documentar lições aprendidas
   - Atualizar procedimentos

---

## 📞 CONTATOS DE EMERGÊNCIA

| Função | Nome | Telefone | Email |
|--------|------|----------|-------|
| Administrador | [Nome] | [Telefone] | [Email] |
| Gerente de TI | [Nome] | [Telefone] | [Email] |
| Suporte Manus | - | - | support@manus.im |

---

## 📚 REFERÊNCIAS

- [BACKUP_RESTORE_GUIDE.md](./BACKUP_RESTORE_GUIDE.md) - Guia completo de backup
- [Documentação Manus](https://help.manus.im)
- [OWASP Security Guidelines](https://owasp.org)
- [MySQL Backup Best Practices](https://dev.mysql.com/doc/refman/8.0/en/backup-and-recovery.html)

---

**Última atualização:** 23 de julho de 2026  
**Próxima revisão:** 23 de outubro de 2026  
**Responsável:** [Nome do administrador]
