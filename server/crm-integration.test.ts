import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';
let sessionCookie: string | null = null;

describe('CRM Integration Tests', () => {
  beforeAll(async () => {
    // Criar sessão de teste
    const response = await fetch(`${BASE_URL}/api/crm/test/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.id).toBeDefined();
    expect(data.user.name).toBeDefined();
    expect(data.user.role).toBeDefined();
    
    // Extrair cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
      console.log('✅ Sessão de teste criada:', sessionCookie);
    }
  });

  it('deve criar sessão de teste com sucesso', async () => {
    expect(sessionCookie).toBeDefined();
  });

  it('deve retornar dados do usuário na sessão de teste', async () => {
    const response = await fetch(`${BASE_URL}/api/crm/me`, {
      headers: {
        'Cookie': sessionCookie || '',
      },
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBeDefined();
  });

  it('deve retornar lista de leads com autenticação', async () => {
    const response = await fetch(`${BASE_URL}/api/crm/leads?limit=10`, {
      headers: {
        'Cookie': sessionCookie || '',
      },
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // Verificar se é um array ou objeto com propriedade data
    let leads = Array.isArray(data) ? data : (data.data || []);
    expect(Array.isArray(leads)).toBe(true);
    expect(leads.length).toBeGreaterThan(0);
    
    // Verificar estrutura do lead
    if (leads.length > 0) {
      const lead = leads[0];
      expect(lead.id).toBeDefined();
      expect(lead.nome).toBeDefined();
      expect(lead.email).toBeDefined();
    }
  });

  it('deve retornar KPIs do dashboard', async () => {
    const response = await fetch(`${BASE_URL}/api/crm/dashboard/kpis`, {
      headers: {
        'Cookie': sessionCookie || '',
      },
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.leads).toBeDefined();
    expect(data.clientes).toBeDefined();
    expect(data.briefings).toBeDefined();
    expect(data.receitaMes).toBeDefined();
    expect(data.oportunidades).toBeDefined();
  });

  it('deve rejeitar requisição sem autenticação', async () => {
    const response = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('deve fazer logout com sucesso', async () => {
    const response = await fetch(`${BASE_URL}/api/crm/logout`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie || '',
      },
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  it('deve rejeitar requisição após logout', async () => {
    const response = await fetch(`${BASE_URL}/api/crm/leads?limit=10`, {
      headers: {
        'Cookie': sessionCookie || '',
      },
    });
    
    expect(response.status).toBe(401);
  });
});
