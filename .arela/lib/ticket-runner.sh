#!/bin/bash
# Arela Ticket Runner Library
# Provides functions for running tickets with status tracking

set -e

TICKET_STATUS_FILE=".arela/tickets/.ticket-status.json"
LOG_DIR="logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load agent configuration
load_agent_config() {
  local agent=$1
  local config_file=".arela/agents/config.json"
  
  if [ ! -f "$config_file" ]; then
    echo -e "${RED}Error: Agent config not found${NC}"
    exit 1
  fi
  
  # Extract agent command (requires jq)
  if command -v jq &> /dev/null; then
    AGENT_CMD=$(jq -r ".agents.\"$agent\".command" "$config_file")
    AGENT_ENABLED=$(jq -r ".agents.\"$agent\".enabled" "$config_file")
    
    if [ "$AGENT_ENABLED" != "true" ]; then
      echo -e "${YELLOW}Warning: Agent $agent is not enabled${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}Warning: jq not installed, using default commands${NC}"
    case $agent in
      codex) AGENT_CMD="codex exec --full-auto" ;;
      claude) AGENT_CMD="claude" ;;
      deepseek) AGENT_CMD="deepseek" ;;
      *) AGENT_CMD="cat" ;;
    esac
  fi
  
  export AGENT_CMD
}

# Check if ticket can run
can_run_ticket() {
  local ticket_id=$1
  local force=${2:-false}
  
  if [ "$force" = "true" ]; then
    return 0
  fi
  
  if [ ! -f "$TICKET_STATUS_FILE" ]; then
    return 0
  fi
  
  # Check status (requires jq)
  if command -v jq &> /dev/null; then
    local status=$(jq -r ".tickets.\"$ticket_id\".status // \"open\"" "$TICKET_STATUS_FILE")
    
    if [ "$status" = "completed" ] || [ "$status" = "in_progress" ]; then
      return 1
    fi
  fi
  
  return 0
}

# Mark ticket as in progress
mark_in_progress() {
  local ticket_id=$1
  local agent=$2
  
  npx arela status --format=json > /dev/null 2>&1 || true
  
  echo -e "${BLUE}▶ Starting $ticket_id with $agent${NC}"
}

# Mark ticket as completed
mark_completed() {
  local ticket_id=$1
  local duration=$2
  
  echo -e "${GREEN}✓ Completed $ticket_id in ${duration}s${NC}"
}

# Mark ticket as failed
mark_failed() {
  local ticket_id=$1
  local log_file=$2
  
  echo -e "${RED}✗ Failed $ticket_id (see $log_file)${NC}"
}

# Run a single ticket
run_ticket() {
  local ticket_file=$1
  local agent=$2
  local force=${3:-false}
  
  local ticket_id=$(basename "$ticket_file" .md)
  local log_file="$LOG_DIR/$agent/$ticket_id.log"
  
  # Check if can run
  if ! can_run_ticket "$ticket_id" "$force"; then
    echo -e "${YELLOW}⊘ Skipping $ticket_id (already completed or in progress)${NC}"
    return 0
  fi
  
  # Ensure log directory exists
  mkdir -p "$LOG_DIR/$agent"
  
  # Load agent config
  if ! load_agent_config "$agent"; then
    return 1
  fi
  
  # Mark as in progress
  mark_in_progress "$ticket_id" "$agent"
  
  # Run ticket
  local start_time=$(date +%s)
  
  if cat "$ticket_file" | eval "$AGENT_CMD" > "$log_file" 2>&1; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    mark_completed "$ticket_id" "$duration"
    return 0
  else
    mark_failed "$ticket_id" "$log_file"
    return 1
  fi
}

# Run all tickets for an agent
run_agent_tickets() {
  local agent=$1
  local parallel=${2:-false}
  local force=${3:-false}
  
  local ticket_dir=".arela/tickets/$agent"
  
  if [ ! -d "$ticket_dir" ]; then
    echo -e "${YELLOW}No tickets found for $agent${NC}"
    return 0
  fi
  
  local ticket_count=$(find "$ticket_dir" -name "*.md" -not -name "EXAMPLE-*" | wc -l | tr -d ' ')
  
  if [ "$ticket_count" -eq 0 ]; then
    echo -e "${YELLOW}No tickets to run for $agent${NC}"
    return 0
  fi
  
  echo -e "${BLUE}Running $ticket_count tickets for $agent...${NC}\n"
  
  if [ "$parallel" = "true" ]; then
    # Run in parallel
    for ticket in "$ticket_dir"/*.md; do
      if [[ $(basename "$ticket") != EXAMPLE-* ]]; then
        run_ticket "$ticket" "$agent" "$force" &
      fi
    done
    wait
  else
    # Run sequentially
    for ticket in "$ticket_dir"/*.md; do
      if [[ $(basename "$ticket") != EXAMPLE-* ]]; then
        run_ticket "$ticket" "$agent" "$force"
      fi
    done
  fi
  
  echo -e "\n${GREEN}✓ Finished running $agent tickets${NC}"
}

# Show progress
show_progress() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  npx arela status 2>/dev/null || echo "Status tracking not available"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Export functions
export -f load_agent_config
export -f can_run_ticket
export -f mark_in_progress
export -f mark_completed
export -f mark_failed
export -f run_ticket
export -f run_agent_tickets
export -f show_progress
