<svelte:options runes={true} />

<script lang="ts">
  import { renderMarkdown } from '../lib/markdown';
  import { relativeTime } from '../lib/time';
  import type { Message as MessageType } from '../stores/messages';

  interface Props {
    message: MessageType;
  }

  let { message }: Props = $props();

  const isUser = $derived(message.role === 'user');
  const isStreaming = $derived(Boolean(message.isStreaming));
  const renderedContent = $derived(
    isUser
      ? message.content
      : isStreaming
        ? message.content
        : renderMarkdown(message.content),
  );
  const timestamp = $derived(relativeTime(message.timestamp));

  let contentContainer = $state<HTMLDivElement | null>(null);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.warn('Unable to copy code block', error);
    }
  }

  function attachCopyButtons(container: HTMLElement) {
    const preBlocks = container.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-code')) {
        return;
      }
      const code = pre.querySelector('code');
      if (!code) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code';
      button.textContent = 'Copy';
      button.addEventListener('click', () => copyCode(code.textContent ?? ''));
      pre.appendChild(button);
    });
  }

  $effect(() => {
    renderedContent;
    isStreaming;
    queueMicrotask(() => {
      if (!contentContainer || isUser || isStreaming) return;
      attachCopyButtons(contentContainer);
    });
  });
</script>

<div class="message message-{message.role}">
  {#if isUser}
    <div class="message-content user" bind:this={contentContainer}>
      {message.content}
    </div>
  {:else}
    <div class="message-content" bind:this={contentContainer}>
      {#if isStreaming}
        {renderedContent}<span class="cursor">▊</span>
      {:else}
        {@html renderedContent}
      {/if}
    </div>
  {/if}
  <div class="message-timestamp">{timestamp}</div>
</div>

<style>
  .message {
    margin: 8px 0;
  }

  .message-user {
    background: var(--vscode-input-background);
    border-left: 3px solid var(--vscode-textLink-foreground);
    padding: 12px;
    border-radius: 4px;
  }

  .message-assistant {
    padding: 12px 0;
  }

  .message-system {
    padding: 8px 0;
    color: var(--vscode-descriptionForeground);
    font-size: 0.85rem;
  }

  .message-content {
    line-height: 1.6;
    font-size: 0.95rem;
  }

  .message-content.user {
    white-space: pre-wrap;
  }

  .message-content :global(p) {
    margin: 8px 0;
  }

  .message-content :global(pre) {
    background: var(--vscode-textCodeBlock-background);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 12px 0;
    font-family: var(--vscode-editor-font-family);
    position: relative;
  }

  .message-content :global(code) {
    background: var(--vscode-textCodeBlock-background);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family);
    font-size: 0.9em;
  }

  .message-content :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .message-content :global(a) {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
  }

  .message-content :global(a:hover) {
    text-decoration: underline;
  }

  .message-content :global(ul),
  .message-content :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }

  .message-content :global(blockquote) {
    border-left: 3px solid var(--vscode-textBlockQuote-border);
    padding-left: 12px;
    margin: 8px 0;
    color: var(--vscode-textBlockQuote-foreground);
  }

  .message-content :global(hr) {
    border: none;
    border-top: 1px solid var(--vscode-widget-border);
    margin: 16px 0;
  }

  .message-timestamp {
    font-size: 0.75rem;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
  }

  .cursor {
    display: inline-block;
    width: 8px;
    height: 1em;
    background: var(--vscode-textLink-foreground);
    animation: blink 1s infinite;
    margin-left: 2px;
  }

  .copy-code {
    position: absolute;
    top: 8px;
    right: 8px;
    border: 1px solid var(--vscode-button-border, transparent);
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
    cursor: pointer;
  }

  .message-content :global(pre:hover .copy-code) {
    opacity: 1;
  }

  @keyframes blink {
    0%,
    49% {
      opacity: 1;
    }

    50%,
    100% {
      opacity: 0;
    }
  }
</style>
