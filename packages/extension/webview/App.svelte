<script lang="ts">
  import { onMount } from 'svelte';
  import ChatLayout from './components/ChatLayout.svelte';
  import ConversationList, { type ConversationSummary } from './components/ConversationList.svelte';
  import {
    messages,
    addMessage,
    startStreaming,
    appendToMessage,
    stopStreaming,
    currentSelection,
    useSelection,
    workspaceContext,
    type Message,
  } from './stores/messages';
  import { onMessage, postMessage } from './lib/vscode';
  import type { MessageContext } from '../src/types/chat';

  let conversationSummaries = $state<ConversationSummary[]>([]);
  let activeConversationId = $state<string | null>(null);

  onMount(() => {
    onMessage(handleExtensionMessage);
  });

  function handleExtensionMessage(message: any) {
    switch (message.type) {
      case 'streamStart':
        handleStreamStart(message.messageId);
        break;
      case 'streamChunk':
        handleStreamChunk(message.messageId, message.chunk ?? '');
        break;
      case 'streamEnd':
        handleStreamEnd(message.messageId);
        break;
      case 'streamError':
        handleStreamError(message.messageId, message.error);
        break;
      case 'selectionChanged':
        currentSelection.set(message.selection ?? null);
        if (message.selection) {
          useSelection.set(true);
        }
        break;
      case 'workspaceContextAdded':
        workspaceContext.set(message.workspace ?? null);
        break;
      case 'conversationsLoaded':
        conversationSummaries = message.conversations ?? [];
        activeConversationId = message.activeConversationId ?? null;
        if (message.messages) {
          setMessages(message.messages);
        }
        break;
      case 'conversationList':
        conversationSummaries = message.conversations ?? [];
        if (message.activeConversationId) {
          activeConversationId = message.activeConversationId;
        }
        break;
      case 'conversationLoaded':
        activeConversationId = message.conversationId ?? activeConversationId;
        setMessages(message.messages ?? []);
        break;
      default:
        break;
    }
  }

  function setMessages(rawMessages: any[]) {
    const normalized: Message[] = (rawMessages ?? []).map((message) => ({
      ...message,
      isStreaming: false,
    }));
    messages.set(normalized);
  }

  function handleStreamStart(messageId: string) {
    const newMessage: Message = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    messages.update((m) => [...m, newMessage]);
    startStreaming(messageId);
  }

  function handleStreamChunk(messageId: string, chunk: string) {
    appendToMessage(messageId, chunk);
  }

  function handleStreamEnd(messageId: string) {
    stopStreaming(messageId);
  }

  function handleStreamError(messageId: string, error: string) {
    stopStreaming(messageId);
    appendToMessage(messageId, `\n\n**Error:** ${error ?? 'Unknown error'}`);
  }

  function onSend(content: string, context: MessageContext) {
    addMessage({
      role: 'user',
      content,
    });

    postMessage({
      type: 'sendMessage',
      content,
      context,
    });
  }

  function handleNewConversation() {
    postMessage({ type: 'newConversation' });
  }

  function handleSelectConversation(id: string) {
    postMessage({ type: 'loadConversation', conversationId: id });
  }

  function handleDeleteConversation(id: string) {
    postMessage({ type: 'deleteConversation', conversationId: id });
  }
</script>

<div class="app-shell">
  <ConversationList
    conversations={conversationSummaries}
    activeId={activeConversationId}
    onCreate={handleNewConversation}
    onSelect={handleSelectConversation}
    onDelete={handleDeleteConversation}
  />
  <div class="chat-shell">
    <ChatLayout {messages} {onSend} />
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100%;
    min-height: 0;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
  }

  .chat-shell {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
</style>
