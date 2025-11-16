<svelte:options runes={true} />

<script lang="ts">
  import { relativeTime } from '../lib/time';

  export interface ConversationSummary {
    id: string;
    title: string;
    updatedAt: number;
  }

  const {
    conversations = [],
    activeId = null,
    onSelect,
    onDelete,
    onCreate,
  } = $props<{
    conversations?: ConversationSummary[];
    activeId?: string | null;
    onSelect?: (id: string) => void;
    onDelete?: (id: string) => void;
    onCreate?: () => void;
  }>();

  function handleSelect(id: string) {
    if (activeId === id) return;
    onSelect?.(id);
  }

  function handleDelete(event: Event, id: string) {
    event.stopPropagation();
    onDelete?.(id);
  }

  function handleCreate() {
    onCreate?.();
  }

  function formatTime(timestamp: number) {
    return relativeTime(timestamp);
  }
</script>

<div class="conversation-list">
  <div class="header">
    <span>Conversations</span>
    <button type="button" class="new-button" onclick={handleCreate}>
      ＋ New Chat
    </button>
  </div>

  <div class="list">
    {#if conversations.length === 0}
      <div class="empty">No conversations yet</div>
    {:else}
      {#each conversations as conversation}
        <div
          class="conversation-item"
          class:active={conversation.id === activeId}
          role="button"
          tabindex="0"
          onclick={() => handleSelect(conversation.id)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleSelect(conversation.id);
            }
          }}
        >
          <div class="details">
            <span class="title">{conversation.title || 'Untitled chat'}</span>
            <span class="timestamp">{formatTime(conversation.updatedAt)}</span>
          </div>
          <button
            type="button"
            class="delete"
            aria-label="Delete conversation"
            onclick={(event) => handleDelete(event, conversation.id)}
          >
            ×
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .conversation-list {
    width: 220px;
    border-right: 1px solid var(--vscode-input-border);
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .new-button {
    border: 1px solid var(--vscode-input-border);
    background: transparent;
    color: var(--vscode-editor-foreground);
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .new-button:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px 8px;
  }

  .empty {
    padding: 12px;
    text-align: center;
    font-size: 0.85rem;
    color: var(--vscode-descriptionForeground);
  }

  .conversation-item {
    width: 100%;
    background: transparent;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 4px;
  }

  .conversation-item.active {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
  }

  .conversation-item:not(.active):hover {
    background: var(--vscode-list-hoverBackground);
  }

  .conversation-item:focus {
    outline: 1px solid var(--vscode-focusBorder);
  }

  .details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
  }

  .title {
    font-size: 0.85rem;
    font-weight: 600;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timestamp {
    font-size: 0.7rem;
    color: var(--vscode-descriptionForeground);
  }

  .delete {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 1rem;
    cursor: pointer;
    opacity: 0.6;
  }

  .delete:hover {
    opacity: 1;
  }
</style>
