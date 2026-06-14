# FiscalAI

Aplicação de relatórios de fiscalização de obras com IA.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução

## Arranque rápido

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### Mac / Linux (bash)
```bash
chmod +x setup.sh && ./setup.sh
```

## Acesso

| Serviço | URL |
|---------|-----|
| Aplicação | http://localhost:3000 |
| API | http://localhost:3001 |

**Login por defeito:** `admin` / `admin`

## Comandos úteis

```bash
# Ver logs em tempo real
docker compose logs -f

# Parar
docker compose down

# Parar e apagar dados da BD
docker compose down -v

# Rebuild depois de alterar código
docker compose up --build -d
```

## Estrutura

```
fiscalai/
├── docker-compose.yml
├── .env                    ← cria a partir de .env.example
├── database/
│   └── init.sql
├── backend/                ← Node.js + Express
│   └── src/
│       ├── routes/
│       └── db/
└── frontend/               ← React + Vite → Nginx
    └── src/
        └── pages/
```

## Roles

| Role | Permissões |
|------|-----------|
| **admin** | Tudo + gestão de utilizadores |
| **writer** | Criar/editar obras e visitas |
| **viewer** | Só leitura |

## Configuração da API Anthropic

Edita o ficheiro `.env` e coloca a tua chave:
```
ANTHROPIC_API_KEY=sk-ant-...
```
