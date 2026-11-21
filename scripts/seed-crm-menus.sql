-- Seed menus para role CRM
DELETE FROM user_menu_itens
WHERE user_menu_id IN (SELECT id FROM user_menus WHERE role = 'CRM');
DELETE FROM user_menus WHERE role = 'CRM';

DO $$
DECLARE
  menu_id INTEGER;
BEGIN
  -- ──────────── CRM ────────────
  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'CRM', 0)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Dashboard CRM', '/comercial/crm', 0),
    (menu_id, 'Leads', '/comercial/crm/leads', 1),
    (menu_id, 'Dashboard Leads', '/comercial/crm/leads/dashboard', 2),
    (menu_id, 'Contatos', '/comercial/crm/contatos', 3),
    (menu_id, 'Pessoas', '/comercial/crm/pessoas', 4),
    (menu_id, 'Oportunidades', '/comercial/crm/oportunidades', 5),
    (menu_id, 'Kanban Oportunidades', '/comercial/crm/oportunidades/kanban', 6),
    (menu_id, 'Visitas', '/comercial/crm/visitas', 7),
    (menu_id, 'Dashboard Visitas', '/comercial/crm/visitas/dashboard', 8),
    (menu_id, 'Dashboard Ações', '/comercial/crm/acoes-prospeccao/dashboard', 9),
    (menu_id, 'Viagens', '/comercial/crm/viagens', 10),
    (menu_id, 'Tarefas', '/comercial/crm/tarefas', 11),
    (menu_id, 'Propostas', '/comercial/crm/propostas', 12),
    (menu_id, 'Campanhas', '/comercial/crm/campanhas', 13),
    (menu_id, 'Relatórios CRM', '/comercial/crm/relatorios', 14),
    (menu_id, 'Treinamento CRM', '/comercial/crm/treinamento', 15),
    (menu_id, 'Clientes', '/comercial/clientes', 16),
    (menu_id, 'Representantes', '/cadastros/representantes', 17);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Configurações CRM', 1)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Regiões', '/comercial/crm/regioes', 0),
    (menu_id, 'Equipes', '/comercial/crm/equipes', 1),
    (menu_id, 'Estados', '/comercial/crm/configuracoes/estados', 2),
    (menu_id, 'Cidades', '/comercial/crm/configuracoes/cidades', 3);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Dashboards', 2)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Dashboard Solicitações de Desenvolvimento', '/dashboard', 0),
    (menu_id, 'Dashboard Amostras', '/dashboard/amostras', 1),
    (menu_id, 'Dashboard Amostras Comerciais', '/dashboard/amostra-comercial', 2),
    (menu_id, 'Dashboard Corte', '/dashboard/requisicoes-corte', 3);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Solicitações de Desenvolvimento', 3)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Solicitações de Desenvolvimento', '/comercial/solicitacoes', 0),
    (menu_id, 'Nova Solicitação', '/comercial/solicitacoes/nova', 1),
    (menu_id, 'Kanban S.D.', '/comercial/solicitacoes/kanban', 2);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Requisições de Corte', 4)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Requisições de Corte', '/comercial/requisicoes-corte', 0);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Amostras Comerciais', 5)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Requisições de Amostra Comercial', '/comercial/requisicoes-amostra-comercial', 0),
    (menu_id, 'Nova Requisição', '/comercial/requisicoes-amostra-comercial/novo', 1),
    (menu_id, 'Kanban A.C.', '/comercial/requisicoes-amostra-comercial/kanban', 2);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Documentos', 6)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Documentos', '/documentos', 0);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Relatórios', 7)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Relatórios', '/dashboard/relatorios', 0);

  INSERT INTO user_menus (role, titulo, ordem) VALUES ('CRM', 'Conta', 8)
    RETURNING id INTO menu_id;
  INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
    (menu_id, 'Meu Perfil', '/perfil', 0);

  -- ──────────── COMERCIAL (adicionar CRM) ────────────
  -- Se já existe menu COMERCIAL, adiciona itens CRM; senão, cria
  IF EXISTS (SELECT 1 FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM') THEN
    DELETE FROM user_menu_itens WHERE user_menu_id = (SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM');
    INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Dashboard CRM', '/comercial/crm', 0),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Leads', '/comercial/crm/leads', 1),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Dashboard Leads', '/comercial/crm/leads/dashboard', 2),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Contatos', '/comercial/crm/contatos', 3),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Pessoas', '/comercial/crm/pessoas', 4),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Oportunidades', '/comercial/crm/oportunidades', 5),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Visitas', '/comercial/crm/visitas', 6),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Dashboard Visitas', '/comercial/crm/visitas/dashboard', 7),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Dashboard Ações', '/comercial/crm/acoes-prospeccao/dashboard', 8),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Viagens', '/comercial/crm/viagens', 9),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Tarefas', '/comercial/crm/tarefas', 10),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Propostas', '/comercial/crm/propostas', 11),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Campanhas', '/comercial/crm/campanhas', 12),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Relatórios CRM', '/comercial/crm/relatorios', 13),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Treinamento CRM', '/comercial/crm/treinamento', 14),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Clientes', '/comercial/clientes', 15),
      ((SELECT id FROM user_menus WHERE role = 'COMERCIAL' AND titulo = 'CRM'), 'Representantes', '/cadastros/representantes', 16);
  END IF;

  -- ──────────── ADMIN (adicionar CRM) ────────────
  IF EXISTS (SELECT 1 FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM') THEN
    DELETE FROM user_menu_itens WHERE user_menu_id = (SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM');
    INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Dashboard CRM', '/comercial/crm', 0),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Leads', '/comercial/crm/leads', 1),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Dashboard Leads', '/comercial/crm/leads/dashboard', 2),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Contatos', '/comercial/crm/contatos', 3),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Pessoas', '/comercial/crm/pessoas', 4),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Oportunidades', '/comercial/crm/oportunidades', 5),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Visitas', '/comercial/crm/visitas', 6),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Dashboard Visitas', '/comercial/crm/visitas/dashboard', 7),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Dashboard Ações', '/comercial/crm/acoes-prospeccao/dashboard', 8),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Viagens', '/comercial/crm/viagens', 9),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Tarefas', '/comercial/crm/tarefas', 10),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Propostas', '/comercial/crm/propostas', 11),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Campanhas', '/comercial/crm/campanhas', 12),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Relatórios CRM', '/comercial/crm/relatorios', 13),
      ((SELECT id FROM user_menus WHERE role = 'ADMIN' AND titulo = 'CRM'), 'Treinamento CRM', '/comercial/crm/treinamento', 14);
  END IF;

  -- ──────────── SUDO (adicionar CRM) ────────────
  IF EXISTS (SELECT 1 FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM') THEN
    DELETE FROM user_menu_itens WHERE user_menu_id = (SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM');
    INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem) VALUES
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Dashboard CRM', '/comercial/crm', 0),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Leads', '/comercial/crm/leads', 1),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Dashboard Leads', '/comercial/crm/leads/dashboard', 2),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Contatos', '/comercial/crm/contatos', 3),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Pessoas', '/comercial/crm/pessoas', 4),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Oportunidades', '/comercial/crm/oportunidades', 5),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Visitas', '/comercial/crm/visitas', 6),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Dashboard Visitas', '/comercial/crm/visitas/dashboard', 7),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Dashboard Ações', '/comercial/crm/acoes-prospeccao/dashboard', 8),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Viagens', '/comercial/crm/viagens', 9),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Tarefas', '/comercial/crm/tarefas', 10),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Propostas', '/comercial/crm/propostas', 11),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Campanhas', '/comercial/crm/campanhas', 12),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Relatórios CRM', '/comercial/crm/relatorios', 13),
      ((SELECT id FROM user_menus WHERE role = 'SUDO' AND titulo = 'CRM'), 'Treinamento CRM', '/comercial/crm/treinamento', 14);
  END IF;

END $$;
