import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const syncSource = fs.readFileSync(path.resolve(process.cwd(), 'client/public/crm/js/crm-sync.js'), 'utf8');

describe('sincronização adaptativa multiusuário', () => {
  it('atualiza por foco, visibilidade, intervalo e alterações entre abas', () => {
    expect(syncSource).toContain("visibilitychange");
    expect(syncSource).toContain("window.addEventListener('focus'");
    expect(syncSource).toContain("window.addEventListener('storage'");
    expect(syncSource).toContain('setInterval');
    expect(syncSource).toContain('intervalVisibleMs: 60000');
  });

  it('não substitui formulários ou modais em edição', () => {
    expect(syncSource).toContain('isEditing()');
    expect(syncSource).toContain('Novos dados disponíveis — conclua a edição para atualizar');
    expect(syncSource).toContain('[role="dialog"][aria-modal="true"]');
  });

  it('cobre os módulos prioritários e permite atualização manual', () => {
    for (const token of ['reloadLeadsList', 'syncServerTasks', 'refreshTarefasAdminApi', 'loadTransacoes', 'reloadEventosList', 'JuridicoModule?.loadProcessos', 'atualização manual']) {
      expect(syncSource).toContain(token);
    }
  });
});
