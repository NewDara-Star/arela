<script lang="ts">
  import { onMount } from 'svelte';
  import ChatLayout from './components/ChatLayout.svelte';
  import {
    messages,
    addMessage,
    startStreaming,
    appendToMessage,
    stopStreaming,
    type Message,
  } from './stores/messages';
  import { onMessage, postMessage } from './lib/vscode';
  import type { MessageContext } from '../src/types/chat';

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
      default:
        break;
    }
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
</script>

<ChatLayout {messages} {onSend} />
