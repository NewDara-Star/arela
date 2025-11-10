#!/bin/bash
# Run all tickets across all agents
# Usage: ./run-all-tickets.sh [--parallel] [--force] [--agent=<agent>]

set -e

# Source the ticket runner library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/ticket-runner.sh"

# Parse arguments
PARALLEL=false
FORCE=false
SPECIFIC_AGENT=""

for arg in "$@"; do
  case $arg in
    --parallel)
      PARALLEL=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --agent=*)
      SPECIFIC_AGENT="${arg#*=}"
      shift
      ;;
    *)
      ;;
  esac
done

# Colors
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║          Arela Multi-Agent Orchestration              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Show initial status
show_progress

# Get list of agents
if [ -n "$SPECIFIC_AGENT" ]; then
  AGENTS=("$SPECIFIC_AGENT")
else
  AGENTS=($(find .arela/tickets -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | grep -v "^\." || true))
fi

if [ ${#AGENTS[@]} -eq 0 ]; then
  echo "No agents found with tickets"
  exit 0
fi

echo -e "Running tickets for agents: ${AGENTS[*]}\n"

# Run tickets for each agent
for agent in "${AGENTS[@]}"; do
  run_agent_tickets "$agent" "$PARALLEL" "$FORCE"
done

# Show final status
echo -e "\n${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              All Tickets Complete!                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}\n"

show_progress

echo -e "\nView logs: ls -la logs/"
echo -e "View status: npx arela status --verbose\n"
