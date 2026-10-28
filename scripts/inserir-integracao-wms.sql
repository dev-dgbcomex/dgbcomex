-- Inserir integração da api-microdata para o WMS
-- Este script deve ser executado no banco Neon (DATABASE_URL)

-- Verificar se já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM integracoes WHERE nome = 'api-microdata-wms'
    ) THEN
        INSERT INTO integracoes (
            nome,
            base_url,
            tipo_auth,
            arquivada_em,
            arquivada_por,
            atualizado_em
        ) VALUES (
            'api-microdata-wms',
            'http://10.156.0.124:58245',
            'login',
            '{"email": "adm.systextil@systextil.com.br", "senha": "Syst#2025#Syst"}',
            NULL,
            NULL,
            now(),
            now()
        );
        RAISE NOTICE 'Integração api-microdata-wms inserida com sucesso';
    ELSE
        -- Atualizar se já existir
        UPDATE integracoes
        SET
            base_url = 'http://10.156.0.124:58245',
            tipo_auth = 'login',
            auth_config = '{"email": "adm.systextil@systextil.com.br", "senha": "Syst#2025#Syst"}',
            telas = '["wms/pedidos"]'::jsonb,
            ativo = true,
            atualizado_em = now()
        WHERE nome = 'api-microdata-wms';
        RAISE NOTICE 'Integração api-microdata-wms atualizada';
    END IF;
END $$;

-- Verificar resultado
SELECT id, nome, base_url, tipo_auth, ativo, created_at, updated_at
FROM integracoes
WHERE nome = 'api-microdata-wms';
