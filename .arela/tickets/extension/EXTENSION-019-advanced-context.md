# EXTENSION-019: Advanced Context Features

**Category:** Context  
**Priority:** P2  
**Estimated Time:** 6h  
**Agent:** @claude  
**Status:** 🔴 Not Started

---

## Context

Beyond basic file and selection context, users need advanced IDE features like:
- Go to definition
- Find references
- Symbol search
- Type information
- Call hierarchy
- Diagnostic information (errors, warnings)

**Current state:**
- ✅ File attachments
- ✅ Code selection
- ✅ Workspace context
- ❌ No symbol information
- ❌ No type information
- ❌ No diagnostics

**Goal:** Add advanced IDE context features for deeper code understanding.

---

## Requirements

### Must Have
- [ ] Include diagnostics (errors/warnings) in context
- [ ] Symbol search and information
- [ ] Go to definition context
- [ ] Find references
- [ ] Type information (for TypeScript)

### Should Have
- [ ] Call hierarchy
- [ ] Hover information
- [ ] Signature help
- [ ] Document symbols outline

### Nice to Have
- [ ] Dependency graph
- [ ] Code metrics
- [ ] Git blame information
- [ ] Test coverage data

---

## Acceptance Criteria

- [ ] Can include diagnostics in AI context
- [ ] Can search for symbols
- [ ] Can get definition location
- [ ] Can find all references
- [ ] Type information included for TS files
- [ ] AI understands code structure better
- [ ] Performance: <500ms for context gathering

---

## Technical Details

### 1. Diagnostics Context

```typescript
// packages/extension/src/context/diagnostics.ts

export async function getDiagnostics(document: vscode.TextDocument): Promise<DiagnosticInfo[]> {
  const diagnostics = vscode.languages.getDiagnostics(document.uri);
  
  return diagnostics.map(diag => ({
    severity: diag.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
    message: diag.message,
    line: diag.range.start.line + 1,
    code: diag.code?.toString(),
    source: diag.source,
  }));
}

export function formatDiagnostics(diagnostics: DiagnosticInfo[]): string {
  if (diagnostics.length === 0) return '';
  
  let output = 'Diagnostics:\n';
  
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  
  if (errors.length > 0) {
    output += `\nErrors (${errors.length}):\n`;
    errors.forEach(e => {
      output += `- Line ${e.line}: ${e.message}\n`;
    });
  }
  
  if (warnings.length > 0) {
    output += `\nWarnings (${warnings.length}):\n`;
    warnings.forEach(w => {
      output += `- Line ${w.line}: ${w.message}\n`;
    });
  }
  
  return output;
}
```

### 2. Symbol Search

```typescript
// packages/extension/src/context/symbols.ts

export async function searchSymbols(query: string): Promise<SymbolInfo[]> {
  const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
    'vscode.executeWorkspaceSymbolProvider',
    query
  );
  
  return symbols?.map(sym => ({
    name: sym.name,
    kind: vscode.SymbolKind[sym.kind],
    location: {
      file: sym.location.uri.fsPath,
      line: sym.location.range.start.line + 1,
    },
    containerName: sym.containerName,
  })) || [];
}

export async function getDocumentSymbols(document: vscode.TextDocument): Promise<SymbolInfo[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri
  );
  
  return flattenSymbols(symbols || []);
}

function flattenSymbols(symbols: vscode.DocumentSymbol[], parent?: string): SymbolInfo[] {
  const result: SymbolInfo[] = [];
  
  for (const symbol of symbols) {
    result.push({
      name: symbol.name,
      kind: vscode.SymbolKind[symbol.kind],
      range: {
        start: symbol.range.start.line + 1,
        end: symbol.range.end.line + 1,
      },
      parent,
    });
    
    if (symbol.children) {
      result.push(...flattenSymbols(symbol.children, symbol.name));
    }
  }
  
  return result;
}
```

### 3. Go to Definition

```typescript
// packages/extension/src/context/definitions.ts

export async function getDefinition(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<DefinitionInfo | null> {
  const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider',
    document.uri,
    position
  );
  
  if (!definitions || definitions.length === 0) return null;
  
  const def = definitions[0];
  const defDoc = await vscode.workspace.openTextDocument(def.uri);
  const defRange = def.range;
  
  // Get surrounding context (5 lines before and after)
  const startLine = Math.max(0, defRange.start.line - 5);
  const endLine = Math.min(defDoc.lineCount - 1, defRange.end.line + 5);
  const contextRange = new vscode.Range(startLine, 0, endLine, 0);
  const context = defDoc.getText(contextRange);
  
  return {
    file: def.uri.fsPath,
    line: defRange.start.line + 1,
    context,
  };
}
```

### 4. Find References

```typescript
// packages/extension/src/context/references.ts

export async function findReferences(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<ReferenceInfo[]> {
  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    document.uri,
    position
  );
  
  if (!locations) return [];
  
  return locations.map(loc => ({
    file: loc.uri.fsPath,
    line: loc.range.start.line + 1,
    preview: '', // Could fetch line content
  }));
}
```

### 5. Type Information

```typescript
// packages/extension/src/context/types.ts

export async function getTypeInfo(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<TypeInfo | null> {
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider',
    document.uri,
    position
  );
  
  if (!hovers || hovers.length === 0) return null;
  
  const hover = hovers[0];
  const contents = hover.contents
    .map(c => (typeof c === 'string' ? c : c.value))
    .join('\n');
  
  return {
    type: contents,
    documentation: '', // Could parse from hover
  };
}
```

### 6. Context Builder

```typescript
// packages/extension/src/context/builder.ts

export class AdvancedContextBuilder {
  async buildContext(
    document: vscode.TextDocument,
    selection?: vscode.Selection
  ): Promise<string> {
    let context = '';
    
    // 1. Diagnostics
    const diagnostics = await getDiagnostics(document);
    if (diagnostics.length > 0) {
      context += formatDiagnostics(diagnostics) + '\n\n';
    }
    
    // 2. Document symbols
    const symbols = await getDocumentSymbols(document);
    if (symbols.length > 0) {
      context += 'File structure:\n';
      symbols.forEach(sym => {
        context += `- ${sym.kind}: ${sym.name}`;
        if (sym.parent) context += ` (in ${sym.parent})`;
        context += `\n`;
      });
      context += '\n';
    }
    
    // 3. If selection, get definition and references
    if (selection && !selection.isEmpty) {
      const position = selection.active;
      
      // Get definition
      const definition = await getDefinition(document, position);
      if (definition) {
        context += `Definition (${definition.file}:${definition.line}):\n`;
        context += `\`\`\`\n${definition.context}\n\`\`\`\n\n`;
      }
      
      // Get references
      const references = await findReferences(document, position);
      if (references.length > 0) {
        context += `References (${references.length} found):\n`;
        references.slice(0, 5).forEach(ref => {
          context += `- ${ref.file}:${ref.line}\n`;
        });
        if (references.length > 5) {
          context += `... and ${references.length - 5} more\n`;
        }
        context += '\n';
      }
      
      // Get type info
      const typeInfo = await getTypeInfo(document, position);
      if (typeInfo) {
        context += `Type information:\n${typeInfo.type}\n\n`;
      }
    }
    
    return context;
  }
}
```

### 7. Integration with Chat

```typescript
// packages/extension/src/chat-provider.ts

private async buildMessages(content: string, context: MessageContext): Promise<Message[]> {
  const messages: Message[] = [];
  let systemContent = 'You are Arela, an AI coding assistant.\n\n';
  
  // Add advanced context if selection exists
  if (context.selection) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const contextBuilder = new AdvancedContextBuilder();
      const advancedContext = await contextBuilder.buildContext(
        editor.document,
        editor.selection
      );
      
      if (advancedContext) {
        systemContent += advancedContext;
      }
    }
    
    // Add selection code
    const sel = context.selection;
    systemContent += `Selected code from ${sel.file} (lines ${sel.startLine}-${sel.endLine}):\n`;
    systemContent += `\`\`\`${sel.language}\n${sel.code}\n\`\`\`\n\n`;
  }
  
  // ... rest of context building
  
  messages.push({ role: 'system', content: systemContent });
  messages.push({ role: 'user', content });
  
  return messages;
}
```

### 8. Commands

```typescript
// packages/extension/src/extension.ts

const explainSymbolCommand = vscode.commands.registerCommand(
  'arela.explainSymbol',
  async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const position = editor.selection.active;
    const document = editor.document;
    
    // Get symbol at cursor
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    );
    
    // Find symbol at position
    // ... symbol finding logic ...
    
    // Open chat with symbol context
    chatProvider?.show();
    // Send message with symbol context
  }
);

context.subscriptions.push(explainSymbolCommand);
```

---

## Testing

1. **Test diagnostics:**
   - Open file with errors
   - Select code with error
   - Send to AI
   - Verify diagnostics included

2. **Test symbols:**
   - Open TypeScript file
   - Send to AI
   - Verify file structure included

3. **Test definitions:**
   - Select function call
   - Send to AI
   - Verify definition included

4. **Test references:**
   - Select variable
   - Send to AI
   - Verify references listed

5. **Test type info:**
   - Select TypeScript variable
   - Send to AI
   - Verify type information included

---

**Build this for deep code understanding!** 🧠
