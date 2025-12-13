#!/bin/bash
# =============================================================================
# PlumeNote - Fonctions communes pour les scripts
# Usage: source "$(dirname "$0")/common.sh"
# =============================================================================

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions de logging unifiées
log_ok()      { echo -e "${GREEN}✓${NC} $1"; }
log_fail()    { echo -e "${RED}✗${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }

# Chemin projet (pour les scripts exécutés sur le VPS)
PROJECT_ROOT="${PROJECT_ROOT:-/root/PlumeNote}"
