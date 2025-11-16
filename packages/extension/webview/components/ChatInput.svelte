<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { postMessage, onMessage } from '../lib/vscode';
  import type {
    AttachedFile,
    FileMention,
    MessageContext,
  } from '../../src/types/chat';

  interface Props {
    onSend: (message: string, context: MessageContext) => void;
    disabled?: boolean;
    placeholder?: string;
  }

  let { onSend, disabled = false, placeholder = 'Ask Arela...' }: Props = $props();

  let input = $state('');
  let attachedFiles = $state<AttachedFile[]>([]);
  let mentions = $state<FileMention[]>([]);
  let showMentions = $state(false);
  let mentionQuery = $state('');
  let mentionResults = $state<FileMention[]>([]);
  let selectedMentionIndex = $state(0);
  let textarea = $state<HTMLTextAreaElement | null>(null);

  const charCount = $derived(input.length);
  const showCharCount = $derived(charCount > 1000);
  const canSend = $derived(
    !disabled && (input.trim().length > 0 || attachedFiles.length > 0)
  );

  onMount(() => {
    onMessage(handleExtensionMessage);
  });

  function handleExtensionMessage(message: any) {
    switch (message.type) {
      case 'fileAttached':
        if (message.file) {
          attachedFiles = [...attachedFiles, message.file];
        }
        break;
      case 'fileSearchResults':
        mentionResults = message.results ?? [];
        break;
    }
  }

  function handleAttach() {
    postMessage({ type: 'attachFile' });
  }

  function removeFile(file: AttachedFile) {
    attachedFiles = attachedFiles.filter((f) => f !== file);
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    input = target.value;
    autoResize(target);
    checkForMention();
  }

  function autoResize(target: HTMLTextAreaElement) {
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }

  function checkForMention() {
    if (!textarea) return;
    const cursorPos = textarea.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursorPos);
    const match = beforeCursor.match(/@([\w./-]*)$/);

    if (match) {
      showMentions = true;
      mentionQuery = match[1];
      selectedMentionIndex = 0;
      postMessage({
        type: 'searchFiles',
        query: mentionQuery,
      });
    } else {
      showMentions = false;
    }
  }

  function selectMention(mention: FileMention) {
    if (!textarea) return;
    const cursorPos = textarea.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursorPos);
    const afterCursor = input.slice(cursorPos);
    const match = beforeCursor.match(/@([\w./-]*)$/);

    if (match) {
      const beforeMention = beforeCursor.slice(0, -match[0].length);
      input = `${beforeMention}${mention.path} ${afterCursor}`;
      textarea.value = input;
      const newCursorPos = beforeMention.length + mention.path.length + 1;
      requestAnimationFrame(() => {
        textarea?.setSelectionRange(newCursorPos, newCursorPos);
        textarea?.focus();
        textarea && autoResize(textarea);
      });
      mentions = [...mentions, mention];
    }

    showMentions = false;
  }

  function removeMention(mention: FileMention) {
    mentions = mentions.filter((m) => m !== mention);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (showMentions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedMentionIndex = Math.min(
          selectedMentionIndex + 1,
          Math.max(mentionResults.length - 1, 0),
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedMentionIndex = Math.max(selectedMentionIndex - 1, 0);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (mentionResults[selectedMentionIndex]) {
          selectMention(mentionResults[selectedMentionIndex]);
        }
        return;
      }
      if (event.key === 'Escape') {
        showMentions = false;
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!canSend) return;

    const context: MessageContext = {
      files: attachedFiles.length ? attachedFiles : undefined,
      mentions: mentions.length ? mentions : undefined,
    };

    onSend(input, context);

    input = '';
    attachedFiles = [];
    mentions = [];
    mentionResults = [];
    showMentions = false;
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
      textarea.focus();
    }
  }
</script>

<div class="chat-input">
  {#if attachedFiles.length > 0 || mentions.length > 0}
    <div class="context-pills">
      {#each attachedFiles as file}
        <div class="pill pill-file">
          <span class="pill-label">📎 {file.path}</span>
          <button type="button" onclick={() => removeFile(file)}>×</button>
        </div>
      {/each}

      {#each mentions as mention}
        <div class="pill pill-mention">
          <span class="pill-label">
            {mention.type === 'file' ? '📄' : '📁'} {mention.path}
          </span>
          <button type="button" onclick={() => removeMention(mention)}>×</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if showMentions}
    <div class="mention-dropdown">
      {#if mentionResults.length === 0}
        <div class="mention-empty">No files found</div>
      {:else}
        {#each mentionResults as result, i}
          <button
            type="button"
            class="mention-item"
            class:selected={i === selectedMentionIndex}
            onclick={() => selectMention(result)}
          >
            <span class="icon">{result.type === 'file' ? '📄' : '📁'}</span>
            <span class="path">{result.path}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}

  <div class="input-area">
    <button
      class="attach-btn"
      type="button"
      onclick={handleAttach}
      disabled={disabled}
      title="Attach file"
    >
      📎
    </button>

    <textarea
      bind:this={textarea}
      bind:value={input}
      rows="1"
      {placeholder}
      {disabled}
      oninput={handleInput}
      onkeydown={handleKeyDown}
    ></textarea>

    <button
      class="send-btn"
      type="button"
      onclick={handleSend}
      disabled={!canSend}
      title="Send message (Enter)"
    >
      ➤
    </button>
  </div>

  {#if showCharCount}
    <div class="char-count">{charCount} characters</div>
  {/if}
</div>

<style>
  .chat-input {
    position: relative;
    border-top: 1px solid var(--vscode-panel-border);
    padding: 12px;
    background: var(--vscode-editor-background);
  }

  .context-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.85rem;
    max-width: 100%;
  }

  .pill .pill-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }

  .pill-file {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }

  .pill-mention {
    background: var(--vscode-textLink-foreground);
    color: var(--vscode-editor-background);
  }

  .pill button {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
    line-height: 1;
  }

  .mention-dropdown {
    position: absolute;
    bottom: calc(100% - 8px);
    left: 12px;
    right: 12px;
    max-height: 220px;
    overflow-y: auto;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 5;
  }

  .mention-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
  }

  .mention-item.selected,
  .mention-item:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .mention-empty {
    padding: 12px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
  }

  .input-area {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .attach-btn,
  .send-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 1.1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .attach-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .attach-btn:hover:not(:disabled),
  .send-btn:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  textarea {
    flex: 1;
    min-height: 40px;
    max-height: 120px;
    padding: 8px 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    resize: none;
  }

  textarea:focus {
    outline: 1px solid var(--vscode-focusBorder);
  }

  .char-count {
    margin-top: 4px;
    font-size: 0.75rem;
    color: var(--vscode-descriptionForeground);
    text-align: right;
  }

  .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
