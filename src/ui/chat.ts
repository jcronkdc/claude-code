/**
 * MythaTron Chat Interface
 * =========================
 * Beautiful, fast, efficient chat UI
 */

import * as vscode from "vscode";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  actions?: { type: string; file?: string; applied: boolean }[];
  model?: string;
  cost?: number;
  timestamp: number;
}

let chatPanel: vscode.WebviewPanel | undefined;
let messages: ChatMessage[] = [];

/**
 * Open or reveal chat panel
 */
export function openChat(
  context: vscode.ExtensionContext
): vscode.WebviewPanel {
  if (chatPanel) {
    chatPanel.reveal();
    return chatPanel;
  }

  chatPanel = vscode.window.createWebviewPanel(
    "mythaTronChat",
    "MythaTron",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    }
  );

  chatPanel.webview.html = generateChatHTML(messages);

  chatPanel.onDidDispose(() => {
    chatPanel = undefined;
  });

  return chatPanel;
}

/**
 * Add message to chat
 */
export function addMessage(message: ChatMessage): void {
  messages.push(message);
  updateChat();
}

/**
 * Clear chat history
 */
export function clearChat(): void {
  messages = [];
  updateChat();
}

/**
 * Update chat UI
 */
function updateChat(): void {
  if (chatPanel) {
    chatPanel.webview.postMessage({
      type: "messages",
      data: messages,
    });
  }
}

/**
 * Show typing indicator
 */
export function setTyping(isTyping: boolean): void {
  if (chatPanel) {
    chatPanel.webview.postMessage({
      type: "typing",
      data: isTyping,
    });
  }
}

/**
 * Get chat panel for message handling
 */
export function getChatPanel(): vscode.WebviewPanel | undefined {
  return chatPanel;
}

function generateChatHTML(initialMessages: ChatMessage[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MythaTron</title>
  <style>
    :root {
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-dim: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79b8ff;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .header-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }

    .header-btn:hover {
      background: var(--border);
      color: var(--text);
    }

    /* Messages */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      max-width: 85%;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      align-self: flex-end;
    }

    .message.assistant {
      align-self: flex-start;
    }

    .message-content {
      padding: 14px 18px;
      border-radius: 16px;
      line-height: 1.6;
    }

    .message.user .message-content {
      background: var(--accent);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.assistant .message-content {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }

    .message-meta {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 6px;
      display: flex;
      gap: 12px;
    }

    .message.user .message-meta {
      justify-content: flex-end;
    }

    /* Code blocks */
    .message pre {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .message code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(0, 0, 0, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }

    /* Thinking */
    .thinking {
      font-style: italic;
      color: var(--text-dim);
      padding: 10px 14px;
      border-left: 3px solid var(--border);
      margin-bottom: 12px;
      font-size: 14px;
    }

    /* Actions */
    .actions-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .action-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(88, 166, 255, 0.1);
      border: 1px solid rgba(88, 166, 255, 0.3);
      border-radius: 8px;
      font-size: 13px;
    }

    .action-item.applied {
      border-color: var(--success);
      background: rgba(63, 185, 80, 0.1);
    }

    .action-icon {
      font-size: 16px;
    }

    /* Typing indicator */
    .typing {
      display: none;
      align-self: flex-start;
      padding: 16px 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
    }

    .typing.visible {
      display: flex;
      gap: 5px;
    }

    .typing span {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }

    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* Empty state */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-dim);
      gap: 16px;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 15px;
    }

    /* Input */
    .input-area {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-secondary);
    }

    .input-wrapper {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }

    .input-container {
      flex: 1;
      position: relative;
    }

    textarea {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 14px 16px;
      padding-right: 100px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 14px;
      resize: none;
      min-height: 52px;
      max-height: 200px;
      line-height: 1.5;
    }

    textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    textarea::placeholder {
      color: var(--text-dim);
    }

    .send-btn {
      position: absolute;
      right: 8px;
      bottom: 8px;
      background: var(--accent);
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }

    .send-btn:hover {
      background: var(--accent-hover);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .send-btn svg {
      width: 18px;
      height: 18px;
    }

    .input-hint {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
    }

    .model-badge {
      background: var(--bg);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <span>⚡</span>
      MythaTron
    </h1>
    <div class="header-actions">
      <button class="header-btn" onclick="clearChat()">Clear</button>
      <button class="header-btn" onclick="showDashboard()">Dashboard</button>
    </div>
  </div>

  <div class="messages" id="messages">
    <div class="empty-state" id="emptyState">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
      <p>Ready to build something amazing?</p>
      <p style="font-size: 13px; opacity: 0.7;">Ask me anything or describe what you want to create</p>
    </div>
    <div class="typing" id="typing">
      <span></span><span></span><span></span>
    </div>
  </div>

  <div class="input-area">
    <div class="input-wrapper">
      <div class="input-container">
        <textarea 
          id="input" 
          placeholder="Ask me anything..." 
          rows="1"
          onkeydown="handleKeydown(event)"
          oninput="autoResize(this)"
        ></textarea>
        <button class="send-btn" id="sendBtn" onclick="send()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="input-hint">
      <span>Press Enter to send, Shift+Enter for new line</span>
      <span class="model-badge" id="modelBadge">Auto-routing enabled</span>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let isTyping = false;

    function send() {
      const input = document.getElementById('input');
      const text = input.value.trim();
      if (!text || isTyping) return;

      addUserMessage(text);
      input.value = '';
      autoResize(input);
      
      vscode.postMessage({ type: 'send', text });
    }

    function handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    }

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }

    function addUserMessage(text) {
      hideEmptyState();
      const messages = document.getElementById('messages');
      const typing = document.getElementById('typing');
      
      const div = document.createElement('div');
      div.className = 'message user';
      div.innerHTML = \`
        <div class="message-content">\${escapeHtml(text)}</div>
        <div class="message-meta">\${new Date().toLocaleTimeString()}</div>
      \`;
      
      messages.insertBefore(div, typing);
      scrollToBottom();
    }

    function addAssistantMessage(msg) {
      const messages = document.getElementById('messages');
      const typing = document.getElementById('typing');
      
      const div = document.createElement('div');
      div.className = 'message assistant';
      
      let content = '';
      
      if (msg.thinking) {
        content += \`<div class="thinking">\${escapeHtml(msg.thinking)}</div>\`;
      }
      
      content += \`<div class="message-content">\${formatContent(msg.content)}</div>\`;
      
      if (msg.actions?.length) {
        content += '<div class="actions-list">';
        for (const action of msg.actions) {
          const icon = action.applied ? '✓' : '→';
          const status = action.applied ? 'applied' : '';
          content += \`<div class="action-item \${status}"><span class="action-icon">\${icon}</span>\${action.type}: \${action.file || ''}</div>\`;
        }
        content += '</div>';
      }
      
      const meta = [];
      if (msg.model) meta.push(msg.model);
      if (msg.cost !== undefined) meta.push('$' + msg.cost.toFixed(4));
      meta.push(new Date(msg.timestamp).toLocaleTimeString());
      
      content += \`<div class="message-meta">\${meta.join(' • ')}</div>\`;
      
      div.innerHTML = content;
      messages.insertBefore(div, typing);
      scrollToBottom();
    }

    function formatContent(text) {
      // Code blocks
      text = text.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');
      // Inline code
      text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      // Bold
      text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      // Line breaks
      text = text.replace(/\\n/g, '<br>');
      return text;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function scrollToBottom() {
      const messages = document.getElementById('messages');
      messages.scrollTop = messages.scrollHeight;
    }

    function hideEmptyState() {
      const empty = document.getElementById('emptyState');
      if (empty) empty.style.display = 'none';
    }

    function setTyping(show) {
      const typing = document.getElementById('typing');
      typing.className = 'typing' + (show ? ' visible' : '');
      isTyping = show;
      document.getElementById('sendBtn').disabled = show;
      if (show) scrollToBottom();
    }

    function clearChat() {
      vscode.postMessage({ type: 'clear' });
      document.getElementById('messages').innerHTML = \`
        <div class="empty-state" id="emptyState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <p>Ready to build something amazing?</p>
          <p style="font-size: 13px; opacity: 0.7;">Ask me anything or describe what you want to create</p>
        </div>
        <div class="typing" id="typing"><span></span><span></span><span></span></div>
      \`;
    }

    function showDashboard() {
      vscode.postMessage({ type: 'dashboard' });
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      
      switch (msg.type) {
        case 'typing':
          setTyping(msg.data);
          break;
        case 'response':
          setTyping(false);
          addAssistantMessage(msg.data);
          break;
        case 'error':
          setTyping(false);
          addAssistantMessage({
            content: '❌ Error: ' + msg.data,
            timestamp: Date.now()
          });
          break;
        case 'messages':
          // Reload all messages
          clearChat();
          for (const m of msg.data) {
            if (m.role === 'user') {
              addUserMessage(m.content);
            } else {
              addAssistantMessage(m);
            }
          }
          break;
        case 'model':
          document.getElementById('modelBadge').textContent = msg.data;
          break;
      }
    });
  </script>
</body>
</html>`;
}
