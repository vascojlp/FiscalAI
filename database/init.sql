CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'writer', 'viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE urgencia_type AS ENUM ('Alta', 'Média', 'Baixa'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE nc_estado AS ENUM ('Aberta', 'Em Resolução', 'Fechada'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    localizacao VARCHAR(300),
    tipo VARCHAR(100),
    dono_da_obra VARCHAR(200),
    empreiteiro VARCHAR(200),
    contrato VARCHAR(100),
    ativa BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    numero_visita INTEGER NOT NULL DEFAULT 1,
    fiscal VARCHAR(200),
    condicoes VARCHAR(50) DEFAULT 'Sol ☀️',
    temp INTEGER,
    humidade INTEGER,
    vento INTEGER,
    uv INTEGER,
    observacoes TEXT,
    relatorio TEXT,
    relatorio_gerado_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE visitas ADD COLUMN IF NOT EXISTS temp INTEGER;
  ALTER TABLE visitas ADD COLUMN IF NOT EXISTS humidade INTEGER;
  ALTER TABLE visitas ADD COLUMN IF NOT EXISTS vento INTEGER;
  ALTER TABLE visitas ADD COLUMN IF NOT EXISTS uv INTEGER;
END $$;

CREATE TABLE IF NOT EXISTS fotos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    area VARCHAR(100) DEFAULT 'Geral',
    nota TEXT,
    imagem_data TEXT NOT NULL,
    media_type VARCHAR(50) DEFAULT 'image/jpeg',
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nao_conformidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    area VARCHAR(100) DEFAULT 'Geral',
    descricao TEXT,
    urgencia urgencia_type DEFAULT 'Média',
    estado nc_estado DEFAULT 'Aberta',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relatorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    edited_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relatorios_visita ON relatorios(visita_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_obra ON relatorios(obra_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_status ON relatorios(status);
