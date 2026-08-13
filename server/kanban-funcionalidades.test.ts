import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const kanbanSource = readFileSync(resolve(__dirname, "../client/public/crm/js/kanban.js"), "utf8");
const adminSource = readFileSync(resolve(__dirname, "./crm-admin.ts"), "utf8");

describe("Funcionalidades do Kanban", () => {
  it("mantém o fluxo de criação e edição de cards no quadro local", () => {
    expect(kanbanSource).toContain("async saveTask()");
    expect(kanbanSource).toContain("ModuleSystem.data.kanban.tasks.push(data);");
    expect(kanbanSource).toContain("ModuleSystem.data.kanban.tasks[index] = { ...ModuleSystem.data.kanban.tasks[index], ...data };");
    expect(kanbanSource).toContain("ModuleSystem.saveData();");
  });

  it("sincroniza cards gerenciados e seus movimentos com as tarefas do servidor", () => {
    expect(kanbanSource).toContain("async syncTaskToTarefasAdmin(task)");
    expect(kanbanSource).toContain("fetch('/api/crm/tarefas-admin'");
    expect(kanbanSource).toContain("fetch('/api/crm/tarefas-admin/' + encodeURIComponent(String(existingId))");
    expect(kanbanSource).toContain("moveTask(taskId, newStatus)");
    expect(kanbanSource).toContain("task.status = newStatus;");
    expect(kanbanSource).toContain("body: JSON.stringify({ status: String(newStatus || '').toLowerCase() })");
  });

  it("mantém as rotas de persistência protegidas por autenticação", () => {
    expect(adminSource).toContain('rtarefas.post("/", requireAuth');
    expect(adminSource).toContain('rtarefas.put("/:id", requireAuth');
    expect(adminSource).toContain('rtarefas.delete("/:id", requireAuth');
  });

  it("mantém ações de card disponíveis por toque no mobile e com foco por teclado", () => {
    expect(kanbanSource).toContain("opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100");
    expect(kanbanSource).toContain('aria-label="Editar tarefa ${this.escapeHtml(task.titulo || \'\')}"');
    expect(kanbanSource).toContain('aria-label="Excluir tarefa ${this.escapeHtml(task.titulo || \'\')}"');
    expect(kanbanSource).toContain("KanbanSystem.showTaskForm(null, '${task.id}')");
  });
});
