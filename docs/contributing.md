# Guia de Contribuição — SAMS Locações

> Padrões de código, fluxo de trabalho e boas práticas para desenvolvimento do projeto.

---

## Sumário

1. [Fluxo de Trabalho](#1-fluxo-de-trabalho)
2. [Padrões de Código](#2-padrões-de-código)
3. [Modificando o Site Público](#3-modificando-o-site-público)
4. [Modificando o CRM](#4-modificando-o-crm)
5. [Banco de Dados](#5-banco-de-dados)
6. [Testes](#6-testes)
7. [Deploy](#7-deploy)
8. [Armadilhas Conhecidas](#8-armadilhas-conhecidas)

---

## 1. Fluxo de Trabalho

### Antes de Começar

1. Leia o `todo.md` para entender o estado atual do projeto
2. Adicione o item que você vai implementar ao `todo.md` como `- [ ]` **antes** de começar
3. Verifique se há testes existentes para a área que você vai modificar

### Durante o Desenvolvimento

1. Faça alterações incrementais e verifique o resultado no browser
2. Execute `pnpm test` após cada mudança significativa
3. Marque itens como `- [x]` no `todo.md` quando concluídos

### Antes de Fazer Checkpoint

1. Leia o `todo.md` inteiro e verifique que todos os itens concluídos estão marcados
2. Execute `pnpm test` e confirme que todos os testes passam
3. Atualize o cache-buster dos arquivos JS modificados no CRM (ver seção 4)
4. Salve o checkpoint com uma descrição clara da versão

---

## 2. Padrões de Código

### TypeScript (Site Público e Backend)

- Use tipos explícitos em funções públicas e interfaces
- Prefira `const` a `let`; evite `var`
- Nomeie variáveis em `camelCase`, tipos e interfaces em `PascalCase`
- Evite `any`; use `unknown` quando o tipo não é conhecido

### JavaScript (CRM)

- Use ES2022 (arrow functions, destructuring, optional chaining, nullish coalescing)
- Encapsule funcionalidades em objetos literais (ex: `AuthSystem`, `ModuleSystem`)
- Trate erros com `try/catch` em todas as chamadas de API
- Adicione logs de console com emojis para facilitar debugging: `console.log('✅ Sucesso:', data)`

### CSS / Tailwind

- Prefira classes Tailwind a CSS customizado
- Use variáveis CSS (`--color-primary`, etc.) para tokens de design
- Mantenha responsividade: sempre teste em mobile (< 768px)

### Commits

Use mensagens de commit descritivas no formato:

```
tipo(escopo): descrição curta

Exemplos:
feat(crm): adicionar filtro por centro de custo nas despesas
fix(financeiro): corrigir validação obrigatória de comprovante
docs: atualizar referência de API com novos endpoints
refactor(modules): corrigir delegação de eventos no globalClickHandler
```

---

## 3. Modificando o Site Público

### Adicionar um Novo Componente

1. Crie o arquivo em `client/src/components/NomeComponente.tsx`
2. Use shadcn/ui como base quando possível (`@/components/ui/*`)
3. Importe e use no componente pai ou em `App.tsx`

### Adicionar uma Nova Página

1. Crie o arquivo em `client/src/pages/NomePagina.tsx`
2. Registre a rota em `client/src/App.tsx`
3. Adicione link de navegação no `Navbar.tsx` se necessário

### Adicionar uma Nova Procedure tRPC

1. Defina o schema Zod de input/output
2. Implemente a procedure em `server/routers.ts`
3. Consuma no frontend com `trpc.nomeProcedure.useQuery()` ou `useMutation()`
4. Escreva um teste em `server/nomeProcedure.test.ts`

### Imagens e Assets

**Nunca** coloque imagens em `client/public/` ou `client/src/assets/`. Use sempre:

```bash
manus-upload-file --webdev /caminho/para/imagem.jpg
# Retorna URL → use diretamente no código
```

---

## 4. Modificando o CRM

### Estrutura de Arquivos

```
client/public/crm/
├── index.html          ← Entrada, scripts e cache-busters
└── js/
    ├── auth.js         ← Autenticação, sessão, permissões
    ├── modules.js      ← Renderização de módulos, globalClickHandler
    ├── navigation.js   ← Navegação entre módulos e páginas
    ├── forms.js        ← Formulários de criação/edição
    ├── permissions.js  ← Sistema de permissões granular
    ├── acervo.js       ← Módulo Acervo Documental
    └── ...             ← Outros módulos especializados
```

### Regra do Cache-Buster

**Sempre que modificar um arquivo JS do CRM**, atualize o cache-buster correspondente no `client/public/crm/index.html`:

```html
<!-- Antes -->
<script src="/crm/js/modules.js?v=1779800114" defer></script>

<!-- Depois (use timestamp Unix atual: date +%s) -->
<script src="/crm/js/modules.js?v=1780588900" defer></script>
```

Para obter o timestamp atual: `date +%s`

### Adicionar um Novo Módulo

1. Adicione a configuração em `navigation.js` → `moduleConfig`
2. Implemente a renderização em `modules.js` ou em um arquivo dedicado
3. Adicione o card no dashboard em `index.html`
4. Implemente os endpoints REST em `server/crm.ts` ou em um arquivo separado
5. Defina as permissões em `permissions.js` → `modulePermissions`

### Adicionar um Novo Botão de Ação

Os botões de ação usam delegação de eventos via `data-action` e `data-module`:

```html
<button data-action="create" data-module="meuModulo"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg">
    Novo Item
</button>
```

O `globalClickHandler` em `modules.js` captura o clique e chama `handleCRUDAction(action, module, id)`. Adicione o case correspondente em `handleCRUDAction`.

> **Atenção:** Nunca use `onclick` inline nos botões do CRM. Sempre use `data-action` para que o handler global funcione corretamente.

### Formulários

Os formulários são gerenciados pelo `FormSystem` em `forms.js`. Para criar um formulário para um novo módulo:

1. Adicione o case em `FormSystem.showCreateForm(module)`
2. Adicione o case em `FormSystem.showUpdateForm(module, id)`
3. Implemente a validação em `ValidationSystem` ou `validation-system.js`

---

## 5. Banco de Dados

### Tabelas do Site (Drizzle ORM)

Para adicionar ou modificar tabelas do site público:

```bash
# 1. Editar drizzle/schema.ts
# 2. Gerar migração
pnpm drizzle-kit generate

# 3. Ler o arquivo .sql gerado em drizzle/
# 4. Aplicar via webdev_execute_sql (não executar manualmente)
```

### Tabelas do CRM (SQL puro)

Para modificar tabelas do CRM, edite `drizzle/crm-schema.sql` e aplique as alterações via `webdev_execute_sql`. Documente cada alteração com um comentário no arquivo SQL.

### Regras de Segurança

- Nunca armazene senhas em texto plano (use bcrypt)
- Nunca armazene bytes de arquivos no banco (use S3)
- Use `FOREIGN KEY ... ON DELETE CASCADE` para dados dependentes
- Use `ON DELETE SET NULL` para referências opcionais

---

## 6. Testes

Os testes ficam em `server/*.test.ts` e usam Vitest.

### Executar Testes

```bash
pnpm test                          # Todos os testes
pnpm test -- crm-contas-receber    # Teste específico
pnpm test -- --coverage            # Com cobertura
```

### Escrever um Novo Teste

```typescript
// server/meu-modulo.test.ts
import { describe, it, expect } from 'vitest';

describe('Meu Módulo', () => {
  it('deve fazer X quando Y', () => {
    // Arrange
    const input = { ... };
    
    // Act
    const result = minhaFuncao(input);
    
    // Assert
    expect(result).toBe(esperado);
  });
});
```

Consulte `server/crm-contas-receber-fix.test.ts` como exemplo de teste de lógica de negócio.

---

## 7. Deploy

O deploy é gerenciado pela plataforma Manus:

1. Certifique-se de que todos os testes passam: `pnpm test`
2. Salve um checkpoint via ferramenta Manus
3. Clique em **Publish** no painel de gerenciamento

**Nunca** tente fazer deploy manual via CLI ou git push para produção.

### Domínios

| Domínio | Uso |
|---|---|
| `samslocacoes.com.br` | Produção (principal) |
| `www.samslocacoes.com.br` | Redirecionamento para principal |
| `samslocacoes.manus.space` | Backup / staging |

---

## 8. Armadilhas Conhecidas

### Cache-buster não atualizado

**Sintoma:** Modificações no JS do CRM não aparecem no browser.
**Solução:** Atualize o `?v=timestamp` no `index.html` para o arquivo modificado.

### Delegação de eventos interceptada

**Sintoma:** Cliques em botões internos do CRM não funcionam.
**Causa:** Elemento pai com `data-module` interceptando o evento antes do botão.
**Solução:** Certifique-se de que a DELEGAÇÃO 1 do `globalClickHandler` verifica `dashboardVisible` (ver `modules.js` linha ~355).

### Comprovante obrigatório

**Sintoma:** Formulário de Contas a Receber não salva sem comprovante.
**Causa:** Validação incorreta em `forms.js`.
**Solução:** O comprovante deve ser opcional. Verifique se não há `required` ou validação manual para o campo `comprovante`.

### Role 'admin' vs 'administrador'

**Sintoma:** Usuário com `role = 'admin'` não vê botões ou módulos.
**Causa:** Verificação de permissão usando apenas `'administrador'`.
**Solução:** Sempre verifique ambos: `role === 'administrador' || role === 'admin'`.

### Sessão não persiste no Safari

**Sintoma:** Usuário é deslogado ao recarregar no Safari.
**Causa:** Safari bloqueia cookies em contextos específicos.
**Solução:** O sistema já usa `sessionStorage` como fallback. Certifique-se de que `_sessionToken` está sendo salvo no login.

### Nested `<a>` tags

**Sintoma:** Erro no console: `<a> cannot contain a nested <a>`.
**Causa:** Componente `<Link>` do Wouter dentro de outro `<a>` ou vice-versa.
**Solução:** Use `<Link>` sem `<a>` interno, ou use `<a>` diretamente sem `<Link>`.
