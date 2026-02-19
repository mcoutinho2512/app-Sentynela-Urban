#!/bin/bash
set -e

# ==============================================
# Sentynela Urban - VPS Setup Script
# Executar na VPS: bash setup-vps.sh
# ==============================================

echo "=========================================="
echo " Sentynela Urban - Setup VPS"
echo "=========================================="

# 1. Atualizar sistema
echo "[1/6] Atualizando sistema..."
apt-get update && apt-get upgrade -y

# 2. Instalar Docker (se não instalado)
if ! command -v docker &> /dev/null; then
    echo "[2/6] Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "[2/6] Docker já instalado: $(docker --version)"
fi

# 3. Instalar Docker Compose plugin (se não instalado)
if ! docker compose version &> /dev/null; then
    echo "[3/6] Instalando Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
else
    echo "[3/6] Docker Compose já instalado: $(docker compose version)"
fi

# 4. Instalar Git (se não instalado)
if ! command -v git &> /dev/null; then
    echo "[4/6] Instalando Git..."
    apt-get install -y git
else
    echo "[4/6] Git já instalado: $(git --version)"
fi

# 5. Criar diretório do projeto
PROJECT_DIR="/opt/sentynela"
echo "[5/6] Criando diretório do projeto em $PROJECT_DIR..."
mkdir -p "$PROJECT_DIR"

# 6. Configurar firewall básico
echo "[6/6] Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22022/tcp   # SSH
    ufw allow 80/tcp      # HTTP
    ufw allow 443/tcp     # HTTPS (futuro)
    ufw --force enable
    echo "Firewall configurado (portas 22022, 80, 443)"
else
    echo "ufw não encontrado, pulando configuração de firewall"
fi

echo ""
echo "=========================================="
echo " Setup concluído!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo ""
echo "1. Clone o repositório:"
echo "   cd /opt/sentynela"
echo "   git clone <URL_DO_REPOSITORIO> ."
echo ""
echo "2. Crie o arquivo .env:"
echo "   cp .env.example .env"
echo "   nano .env"
echo "   (preencha POSTGRES_PASSWORD e JWT_SECRET)"
echo ""
echo "3. Gere o JWT_SECRET:"
echo "   openssl rand -hex 32"
echo ""
echo "4. Suba os containers:"
echo "   cd /opt/sentynela"
echo "   docker compose -f infra/docker-compose.prod.yml up -d --build"
echo ""
echo "5. Verifique:"
echo "   curl http://localhost/health"
echo "   docker compose -f infra/docker-compose.prod.yml logs -f"
echo ""
