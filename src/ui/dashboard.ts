/**
 * MythaTron Dashboard
 * ====================
 * Real-time view of everything happening in your development session
 */

import * as vscode from "vscode";

export interface DashboardData {
  // Session
  sessionId: string;
  uptime: number;

  // Metrics
  tasksCompleted: number;
  tokensUsed: number;
  tokensSaved: number;
  totalCost: number;
  totalSavings: number;
  cacheHitRate: number;

  // Current State
  errors: { file: string; line: number; message: string }[];
  warnings: number;
  openFiles: string[];

  // Model Usage
  modelUsage: { model: string; count: number; cost: number }[];
}

let dashboardPanel: vscode.WebviewPanel | undefined;

/**
 * Show or update the MythaTron Dashboard
 */
export function showDashboard(data: DashboardData): void {
  if (dashboardPanel) {
    dashboardPanel.webview.html = generateDashboardHTML(data);
    dashboardPanel.reveal();
    return;
  }

  dashboardPanel = vscode.window.createWebviewPanel(
    "mythaTronDashboard",
    "MythaTron Dashboard",
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  dashboardPanel.webview.html = generateDashboardHTML(data);

  dashboardPanel.onDidDispose(() => {
    dashboardPanel = undefined;
  });

  // Handle messages from webview
  dashboardPanel.webview.onDidReceiveMessage((message) => {
    switch (message.type) {
      case "fixErrors":
        vscode.commands.executeCommand("mythaTron.fix");
        break;
      case "clearCache":
        vscode.commands.executeCommand("mythaTron.clearCache");
        break;
      case "exportReport":
        vscode.commands.executeCommand("mythaTron.exportCosts");
        break;
    }
  });
}

/**
 * Update dashboard data without recreating panel
 */
export function updateDashboard(data: DashboardData): void {
  if (dashboardPanel) {
    dashboardPanel.webview.postMessage({ type: "update", data });
  }
}

function generateDashboardHTML(data: DashboardData): string {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const savingsPercent =
    data.totalCost + data.totalSavings > 0
      ? (
          (data.totalSavings / (data.totalCost + data.totalSavings)) *
          100
        ).toFixed(0)
      : "0";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MythaTron Dashboard</title>
  <style>
    :root {
      --bg: #0d1117;
      --bg-card: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-dim: #8b949e;
      --accent: #58a6ff;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      font-size: 24px;
      font-weight: bold;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .session-info {
      font-size: 13px;
      color: var(--text-dim);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }

    .card h3 {
      font-size: 12px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .card .value {
      font-size: 32px;
      font-weight: bold;
    }

    .card .value.success { color: var(--success); }
    .card .value.warning { color: var(--warning); }
    .card .value.error { color: var(--error); }
    .card .value.accent { color: var(--accent); }

    .card .subtext {
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 4px;
    }

    .savings-banner {
      background: linear-gradient(135deg, rgba(63, 185, 80, 0.2), rgba(88, 166, 255, 0.2));
      border: 1px solid rgba(63, 185, 80, 0.4);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }

    .savings-banner .amount {
      font-size: 48px;
      font-weight: bold;
      color: var(--success);
    }

    .savings-banner .label {
      font-size: 14px;
      color: var(--text-dim);
    }

    .errors-section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .errors-section h2 {
      font-size: 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-item {
      padding: 12px;
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .error-item .file {
      color: var(--accent);
      font-weight: 500;
    }

    .error-item .message {
      color: var(--text);
      margin-top: 4px;
    }

    .no-errors {
      text-align: center;
      padding: 40px;
      color: var(--success);
    }

    .no-errors svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }

    .btn:hover {
      background: var(--border);
    }

    .btn.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    .btn.primary:hover {
      background: #79b8ff;
    }

    .model-usage {
      margin-top: 24px;
    }

    .model-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg);
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .model-bar .name {
      width: 180px;
      font-weight: 500;
    }

    .model-bar .bar {
      flex: 1;
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
    }

    .model-bar .bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 4px;
    }

    .model-bar .stats {
      width: 100px;
      text-align: right;
      font-size: 12px;
      color: var(--text-dim);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--success);
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <span>⚡</span> MythaTron Dashboard
    </div>
    <div class="session-info">
      <span class="live-indicator"><span class="live-dot"></span> LIVE</span>
      &nbsp;•&nbsp;
      Session: ${data.sessionId.slice(0, 8)}
      &nbsp;•&nbsp;
      Uptime: ${formatDuration(data.uptime)}
    </div>
  </div>

  <div class="savings-banner">
    <div class="amount">$${data.totalSavings.toFixed(2)}</div>
    <div class="label">Saved this session (${savingsPercent}% of baseline)</div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Tasks Completed</h3>
      <div class="value accent">${data.tasksCompleted}</div>
      <div class="subtext">AI operations</div>
    </div>

    <div class="card">
      <h3>Tokens Used</h3>
      <div class="value">${data.tokensUsed.toLocaleString()}</div>
      <div class="subtext">${data.tokensSaved.toLocaleString()} saved</div>
    </div>

    <div class="card">
      <h3>Cache Hit Rate</h3>
      <div class="value ${
        data.cacheHitRate > 50 ? "success" : "warning"
      }">${data.cacheHitRate.toFixed(0)}%</div>
      <div class="subtext">Cached responses</div>
    </div>

    <div class="card">
      <h3>Actual Cost</h3>
      <div class="value">$${data.totalCost.toFixed(2)}</div>
      <div class="subtext">Would be $${(
        data.totalCost + data.totalSavings
      ).toFixed(2)}</div>
    </div>
  </div>

  <div class="errors-section">
    <h2>
      <span>Errors (${data.errors.length})</span>
      ${
        data.errors.length > 0
          ? '<button class="btn primary" onclick="fixErrors()">Fix All</button>'
          : ""
      }
    </h2>
    
    ${
      data.errors.length === 0
        ? `
      <div class="no-errors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div>No errors! You're all clear.</div>
      </div>
    `
        : data.errors
            .map(
              (e) => `
      <div class="error-item">
        <div class="file">${e.file.split("/").pop()}:${e.line}</div>
        <div class="message">${e.message}</div>
      </div>
    `
            )
            .join("")
    }
  </div>

  <div class="card model-usage">
    <h3>Model Usage</h3>
    ${data.modelUsage
      .map((m) => {
        const maxCount = Math.max(...data.modelUsage.map((x) => x.count), 1);
        const percent = (m.count / maxCount) * 100;
        return `
        <div class="model-bar">
          <div class="name">${m.model
            .replace("ollama:", "")
            .replace("groq:", "")}</div>
          <div class="bar"><div class="bar-fill" style="width: ${percent}%"></div></div>
          <div class="stats">${m.count}× • $${m.cost.toFixed(3)}</div>
        </div>
      `;
      })
      .join("")}
  </div>

  <div class="actions" style="margin-top: 24px;">
    <button class="btn" onclick="clearCache()">Clear Cache</button>
    <button class="btn" onclick="exportReport()">Export Report</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function fixErrors() {
      vscode.postMessage({ type: 'fixErrors' });
    }
    
    function clearCache() {
      vscode.postMessage({ type: 'clearCache' });
    }
    
    function exportReport() {
      vscode.postMessage({ type: 'exportReport' });
    }

    // Handle updates
    window.addEventListener('message', event => {
      if (event.data.type === 'update') {
        // Would update DOM with new data
        location.reload();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Close dashboard
 */
export function closeDashboard(): void {
  dashboardPanel?.dispose();
}
