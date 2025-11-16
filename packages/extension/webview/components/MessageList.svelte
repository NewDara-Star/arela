<svelte:options runes={true} />

<script lang="ts">
  import Message from './Message.svelte';
  import { streamingMessageId } from '../stores/messages';
  import { postMessage } from '../lib/vscode';
  import type { Message as MessageType } from '../stores/messages';

  interface Props {
    messages?: MessageType[];
  }

  let { messages = [] }: Props = $props();

  let messageContainer: HTMLDivElement | null = null;
  let shouldAutoScroll = $state(true);

  function scrollToBottom() {
    if (shouldAutoScroll && messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }

  function handleScroll() {
    if (!messageContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messageContainer;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    shouldAutoScroll = isAtBottom;
  }

  function handleStopStreaming() {
    if ($streamingMessageId) {
      postMessage({
        type: 'stopStreaming',
        messageId: $streamingMessageId,
      });
    }
  }

  $effect(() => {
    if ($streamingMessageId && shouldAutoScroll) {
      scrollToBottom();
    }
  });

  $effect(() => {
    messages;
    queueMicrotask(() => {
      if (shouldAutoScroll) {
        scrollToBottom();
      }
    });
  });
</script>

<div class="message-list">
  {#if $streamingMessageId}
    <div class="streaming-indicator">
      <span class="streaming-text">
        <span class="spinner">●</span>
        AI is responding...
      </span>
      <button class="stop-btn" type="button" onclick={handleStopStreaming}>
        Stop
      </button>
    </div>
  {/if}

  <div
    class="messages"
    bind:this={messageContainer}
    onscroll={handleScroll}
  >
    {#if messages.length === 0}
      <div class="empty-state">
        <p>Start a conversation...</p>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <Message {message} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .message-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
  }

  .streaming-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--vscode-inputValidation-infoBackground);
    border-left: 3px solid var(--vscode-inputValidation-infoBorder);
    margin: 8px 12px 0;
    border-radius: 4px;
    gap: 12px;
  }

  .streaming-text {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--vscode-inputValidation-infoForeground);
  }

  .spinner {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .stop-btn {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 4px 12px;
    border-radius: 2px;
    cursor: pointer;
    font-size: 0.9em;
  }

  .stop-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--vscode-descriptionForeground);
  }
</style>
