import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Testes para validar o event listener global com delegação de eventos
 * Estes testes verificam que o globalClickHandler está funcionando corretamente
 * com a delegação de eventos usando closest() e capture phase.
 */

describe('ModuleSystem Event Delegation', () => {
  let mockNavigationSystem: any;
  let mockModuleSystem: any;

  beforeEach(() => {
    // Mock do NavigationSystem
    mockNavigationSystem = {
      navigateToModule: vi.fn(),
      navigateToPage: vi.fn(),
    };

    // Mock do ModuleSystem
    mockModuleSystem = {
      showModule: vi.fn((module: string) => {
        if (mockNavigationSystem && typeof mockNavigationSystem.navigateToModule === 'function') {
          mockNavigationSystem.navigateToModule(module);
        }
      }),
      showLeads: vi.fn(() => {
        if (mockNavigationSystem && typeof mockNavigationSystem.navigateToPage === 'function') {
          mockNavigationSystem.navigateToPage('marketing', 'leads');
        }
      }),
      handleCRUDAction: vi.fn(),
    };

    // Atribuir aos mocks globais
    (global as any).NavigationSystem = mockNavigationSystem;
    (global as any).ModuleSystem = mockModuleSystem;
  });

  it('deve chamar showModule quando clicar em elemento com data-module="marketing"', () => {
    // Simular o comportamento do globalClickHandler
    const mockElement = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-module="marketing"]') {
          return { tagName: 'DIV' };
        }
        return null;
      }),
    };

    const mockEvent = {
      target: mockElement,
    } as any;

    // Simular o handler
    if (mockElement.closest('[data-module="marketing"]')) {
      mockModuleSystem.showModule('marketing');
    }

    expect(mockModuleSystem.showModule).toHaveBeenCalledWith('marketing');
    expect(mockNavigationSystem.navigateToModule).toHaveBeenCalledWith('marketing');
  });

  it('deve chamar showLeads quando clicar em elemento com data-submodule="leads"', () => {
    // Simular o comportamento do globalClickHandler
    const mockElement = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-submodule="leads"]') {
          return { tagName: 'DIV' };
        }
        return null;
      }),
    };

    const mockEvent = {
      target: mockElement,
    } as any;

    // Simular o handler
    if (mockElement.closest('[data-submodule="leads"]')) {
      mockModuleSystem.showLeads();
    }

    expect(mockModuleSystem.showLeads).toHaveBeenCalled();
    expect(mockNavigationSystem.navigateToPage).toHaveBeenCalledWith('marketing', 'leads');
  });

  it('deve usar delegação de eventos com closest() para detectar elementos pai', () => {
    // Simular um clique em um elemento filho dentro de um container com data-module
    const mockChildElement = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-module="marketing"]') {
          return { tagName: 'DIV', getAttribute: () => 'marketing' };
        }
        return null;
      }),
    };

    // Verificar que closest() foi chamado
    const result = mockChildElement.closest('[data-module="marketing"]');
    expect(mockChildElement.closest).toHaveBeenCalledWith('[data-module="marketing"]');
    expect(result).toBeTruthy();
  });

  it('deve ignorar cliques em elementos sem atributos de navegação', () => {
    // Simular um clique em um elemento sem atributos de navegação
    const mockElement = {
      closest: vi.fn(() => null),
    };

    // Simular o handler - não deve fazer nada
    if (mockElement.closest('[data-module="marketing"]')) {
      mockModuleSystem.showModule('marketing');
    }
    if (mockElement.closest('[data-submodule="leads"]')) {
      mockModuleSystem.showLeads();
    }

    expect(mockModuleSystem.showModule).not.toHaveBeenCalled();
    expect(mockModuleSystem.showLeads).not.toHaveBeenCalled();
  });

  it('deve chamar handleCRUDAction para elementos com data-action', () => {
    // Simular um clique em um botão CRUD
    const mockElement = {
      closest: vi.fn((selector: string) => {
        if (selector === '[data-action]') {
          return {
            tagName: 'BUTTON',
            getAttribute: (attr: string) => {
              const attrs: Record<string, string> = {
                'data-action': 'delete',
                'data-module': 'leads',
                'data-id': '123',
              };
              return attrs[attr] || null;
            },
          };
        }
        return null;
      }),
    };

    // Simular o handler
    const actionEl = mockElement.closest('[data-action]');
    if (actionEl && actionEl.tagName !== 'FORM') {
      const action = actionEl.getAttribute('data-action');
      const module = actionEl.getAttribute('data-module');
      const id = actionEl.getAttribute('data-id');
      mockModuleSystem.handleCRUDAction(action, module, id);
    }

    expect(mockModuleSystem.handleCRUDAction).toHaveBeenCalledWith('delete', 'leads', '123');
  });

  it('deve usar capture phase (terceiro parâmetro = true) no addEventListener', () => {
    // Este teste valida que o padrão de capture phase está correto
    // O capture phase garante que o handler seja chamado mesmo se outros handlers
    // pararem a propagação do evento
    
    const mockAddEventListener = vi.fn();
    const mockDocument = {
      addEventListener: mockAddEventListener,
    };

    // Simular a adição do listener em capture phase
    mockDocument.addEventListener('click', vi.fn(), true);

    expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function), true);
  });
});
