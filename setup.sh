#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           FiscalAI — Setup               ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "❌ Docker não encontrado. Instala em https://docker.com"
  exit 1
fi
if ! docker compose version &>/dev/null && ! command -v docker-compose &>/dev/null; then
  echo "❌ Docker Compose não encontrado."
  exit 1
fi

# Criar .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📄 Ficheiro .env criado."
  echo ""
  read -p "🔑 Cola a tua ANTHROPIC_API_KEY (ou Enter para configurar depois): " APIKEY
  if [ -n "$APIKEY" ]; then
    sed -i.bak "s|sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|$APIKEY|" .env && rm -f .env.bak
    echo "✅ API key guardada."
  else
    echo "⚠️  API key não configurada. Edita o ficheiro .env antes de gerar relatórios."
  fi
else
  echo "✅ Ficheiro .env já existe."
fi

echo ""
echo "🐳 A iniciar os containers (pode demorar na primeira vez)…"
echo ""

if docker compose version &>/dev/null; then
  docker compose up --build -d
else
  docker-compose up --build -d
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ FiscalAI está a correr!              ║"
echo "║                                          ║"
echo "║  🌐 App:      http://localhost:3000      ║"
echo "║  🔧 API:      http://localhost:3001      ║"
echo "║                                          ║"
echo "║  Login: admin / admin                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
