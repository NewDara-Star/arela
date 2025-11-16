<svelte:options runes={true} />

<script lang="ts">
  import type { Writable } from 'svelte/store';
  import ChatInput from './ChatInput.svelte';
  import MessageList from './MessageList.svelte';
  import type { Message } from '../stores/messages';
  import type { MessageContext } from '../../src/types/chat';

  const { messages, onSend } = $props<{
    messages: Writable<Message[]>;
    onSend: (content: string, context: MessageContext) => void;
  }>();

  let messageList = $state<Message[]>([]);

  $effect(() => {
    if (!messages) {
      messageList = [];
      return;
    }

    const unsubscribe = messages.subscribe((value) => {
      messageList = value;
    });

    return () => unsubscribe();
  });

  function handleSend(content: string, context: MessageContext) {
    onSend?.(content, context);
  }
</script>

<div class="chat-layout">
  <header class="chat-header">
    <div class="title">
      <span class="name">Arela</span>
      <span class="subtitle">AI CTO Assistant</span>
    </div>
    <button class="settings-button" type="button" aria-label="Open settings">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        role="img"
        aria-hidden="true"
      >
        <path
          d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm8-3.5a1 1 0 0 0-.76-.97l-1.52-.38a6 6 0 0 0-.68-1.64l.86-1.4a1 1 0 0 0-.2-1.27l-1.7-1.7a1 1 0 0 0-1.27-.2l-1.4.86a6 6 0 0 0-1.64-.68L12.97 4.8a1 1 0 0 0-.97-.8h-2a1 1 0 0 0-.97.8l-.38 1.52a6 6 0 0 0-1.64.68l-1.4-.86a1 1 0 0 0-1.27.2l-1.7 1.7a1 1 0 0 0-.2 1.27l.86 1.4a6 6 0 0 0-.68 1.64L4.8 11.03a1 1 0 0 0-.8.97v2a1 1 0 0 0 .8.97l1.52.38c.15.58.39 1.13.68 1.64l-.86 1.4a1 1 0 0 0 .2 1.27l1.7 1.7a1 1 0 0 0 1.27.2l1.4-.86c.51.29 1.06.53 1.64.68l.38 1.52a1 1 0 0 0 .97.8h2a1 1 0 0 0 .97-.8l.38-1.52c.58-.15 1.13-.39 1.64-.68l1.4.86a1 1 0 0 0 1.27-.2l1.7-1.7a1 1 0 0 0 .2-1.27l-.86-1.4c.29-.51.53-1.06.68-1.64l1.52-.38a1 1 0 0 0 .8-.97v-2Z"
          fill="currentColor"
        />
      </svg>
    </button>
  </header>
  <MessageList messages={messageList} />

  <ChatInput onSend={handleSend} />
</div>

<style>
  .chat-layout {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 48px;
    border-bottom: 1px solid var(--vscode-input-border);
  }

  .title {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .name {
    font-weight: 600;
  }

  .subtitle {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .settings-button {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid var(--vscode-input-border);
    background: transparent;
    color: var(--vscode-editor-foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .settings-button:hover {
    background: var(--vscode-list-hoverBackground);
  }

  :global(body, #app) {
    margin: 0;
    height: 100vh;
    background: var(--vscode-editor-background);
  }
</style>
