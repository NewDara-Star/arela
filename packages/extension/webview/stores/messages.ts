import { writable } from 'svelte/store';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export const messages = writable<Message[]>([]);
export const streamingMessageId = writable<string | null>(null);

export function addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
  const newMessage: Message = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  messages.update((m) => [...m, newMessage]);
  return newMessage;
}

export function startStreaming(messageId: string) {
  streamingMessageId.set(messageId);
  messages.update((msgs) =>
    msgs.map((m) => (m.id === messageId ? { ...m, isStreaming: true } : m)),
  );
}

export function appendToMessage(messageId: string, chunk: string) {
  messages.update((msgs) =>
    msgs.map((m) =>
      m.id === messageId ? { ...m, content: `${m.content}${chunk}` } : m,
    ),
  );
}

export function stopStreaming(messageId: string) {
  streamingMessageId.set(null);
  messages.update((msgs) =>
    msgs.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m)),
  );
}

export function clearMessages() {
  messages.set([]);
  streamingMessageId.set(null);
}
