/**
 * GitHub Repository Management
 * Create, push, and manage GitHub repos from any project
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface RepoOptions {
  name: string;
  description?: string;
  visibility: "public" | "private";
  addReadme?: boolean;
  gitignoreTemplate?: string;
  license?: string;
}

export interface GitHubUser {
  login: string;
  name: string;
  email: string;
}

/**
 * Check if GitHub CLI is installed and authenticated
 */
export async function checkGitHubAuth(): Promise<{
  installed: boolean;
  authenticated: boolean;
  user?: GitHubUser;
  error?: string;
}> {
  try {
    // Check if gh is installed
    await execAsync("gh --version");

    // Check auth status
    const { stdout } = await execAsync("gh auth status 2>&1");
    
    if (stdout.includes("Logged in")) {
      // Get user info
      const { stdout: userJson } = await execAsync("gh api user");
      const user = JSON.parse(userJson);
      
      return {
        installed: true,
        authenticated: true,
        user: {
          login: user.login,
          name: user.name || user.login,
          email: user.email || `${user.login}@users.noreply.github.com`,
        },
      };
    }

    return {
      installed: true,
      authenticated: false,
      error: "Not logged in. Run: gh auth login",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes("command not found") || msg.includes("not recognized")) {
      return {
        installed: false,
        authenticated: false,
        error: "GitHub CLI not installed. Install from: https://cli.github.com",
      };
    }

    return {
      installed: true,
      authenticated: false,
      error: msg,
    };
  }
}

/**
 * Create a new GitHub repository
 */
export async function createGitHubRepo(
  workspacePath: string,
  options: RepoOptions
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Check auth first
    const auth = await checkGitHubAuth();
    if (!auth.authenticated) {
      return { success: false, error: auth.error };
    }

    // Build the gh repo create command
    const args = [
      "gh repo create",
      options.name,
      `--${options.visibility}`,
      "--source=.",
      "--remote=origin",
      "--push",
    ];

    if (options.description) {
      args.push(`--description="${options.description}"`);
    }

    // Initialize git if needed
    const gitDir = path.join(workspacePath, ".git");
    if (!fs.existsSync(gitDir)) {
      await execAsync("git init", { cwd: workspacePath });
    }

    // Create .gitignore if it doesn't exist
    const gitignorePath = path.join(workspacePath, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      const template = getGitignoreTemplate(workspacePath);
      fs.writeFileSync(gitignorePath, template);
    }

    // Stage all files
    await execAsync("git add -A", { cwd: workspacePath });

    // Check if there are commits
    try {
      await execAsync("git rev-parse HEAD", { cwd: workspacePath });
    } catch {
      // No commits yet, create initial commit
      await execAsync('git commit -m "Initial commit"', { cwd: workspacePath });
    }

    // Create the repo
    const { stdout, stderr } = await execAsync(args.join(" "), {
      cwd: workspacePath,
    });

    // Extract repo URL from output
    const urlMatch = (stdout + stderr).match(
      /https:\/\/github\.com\/[^\s]+/
    );
    const url = urlMatch ? urlMatch[0] : `https://github.com/${auth.user?.login}/${options.name}`;

    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Push current project to GitHub (create repo if needed)
 */
export async function pushToGitHub(
  workspacePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Check if remote exists
    const { stdout: remotes } = await execAsync("git remote -v", {
      cwd: workspacePath,
    }).catch(() => ({ stdout: "" }));

    if (remotes.includes("origin")) {
      // Remote exists, just push
      await execAsync("git add -A", { cwd: workspacePath });
      
      // Check for changes
      const { stdout: status } = await execAsync("git status --porcelain", {
        cwd: workspacePath,
      });
      
      if (status.trim()) {
        await execAsync('git commit -m "Update"', { cwd: workspacePath });
      }

      await execAsync("git push origin HEAD", { cwd: workspacePath });
      
      // Get URL
      const { stdout: url } = await execAsync(
        "git remote get-url origin",
        { cwd: workspacePath }
      );

      return { success: true, url: url.trim() };
    }

    // No remote - need to create repo
    return { success: false, error: "NO_REMOTE" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Interactive repo creation via VS Code
 */
export async function createRepoInteractive(): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage("Open a workspace first");
    return;
  }

  // Check GitHub auth
  const auth = await checkGitHubAuth();
  if (!auth.installed) {
    const action = await vscode.window.showErrorMessage(
      "GitHub CLI not installed",
      "Install Instructions"
    );
    if (action === "Install Instructions") {
      vscode.env.openExternal(vscode.Uri.parse("https://cli.github.com"));
    }
    return;
  }

  if (!auth.authenticated) {
    const action = await vscode.window.showErrorMessage(
      "Not logged into GitHub CLI",
      "Login Now"
    );
    if (action === "Login Now") {
      const terminal = vscode.window.createTerminal("GitHub Login");
      terminal.show();
      terminal.sendText("gh auth login");
    }
    return;
  }

  // Get repo name (default to folder name)
  const defaultName = path.basename(workspacePath);
  const name = await vscode.window.showInputBox({
    prompt: "Repository name",
    value: defaultName,
    validateInput: (v) => {
      if (!v) return "Name is required";
      if (!/^[a-zA-Z0-9._-]+$/.test(v)) return "Invalid characters in name";
      return null;
    },
  });

  if (!name) return;

  // Get description
  const description = await vscode.window.showInputBox({
    prompt: "Description (optional)",
    placeHolder: "A brief description of your project",
  });

  // Get visibility
  const visibility = await vscode.window.showQuickPick(
    [
      { label: "Public", description: "Anyone can see this repository", value: "public" as const },
      { label: "Private", description: "Only you can see this repository", value: "private" as const },
    ],
    { placeHolder: "Repository visibility" }
  );

  if (!visibility) return;

  // Create repo with progress
  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Creating repository ${name}...`,
      cancellable: false,
    },
    async () => {
      return createGitHubRepo(workspacePath, {
        name,
        description,
        visibility: visibility.value,
      });
    }
  );

  if (result.success) {
    const action = await vscode.window.showInformationMessage(
      `✅ Repository created: ${result.url}`,
      "Open in Browser",
      "Copy URL"
    );

    if (action === "Open in Browser" && result.url) {
      vscode.env.openExternal(vscode.Uri.parse(result.url));
    } else if (action === "Copy URL" && result.url) {
      await vscode.env.clipboard.writeText(result.url);
    }
  } else {
    vscode.window.showErrorMessage(`Failed to create repo: ${result.error}`);
  }
}

/**
 * Quick push command
 */
export async function quickPush(): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage("Open a workspace first");
    return;
  }

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Pushing to GitHub...",
    },
    () => pushToGitHub(workspacePath)
  );

  if (result.success) {
    vscode.window.showInformationMessage(`✅ Pushed to ${result.url}`);
  } else if (result.error === "NO_REMOTE") {
    // Offer to create repo
    const action = await vscode.window.showWarningMessage(
      "No GitHub remote found. Create a repository?",
      "Create Repository",
      "Cancel"
    );

    if (action === "Create Repository") {
      await createRepoInteractive();
    }
  } else {
    vscode.window.showErrorMessage(`Push failed: ${result.error}`);
  }
}

/**
 * Generate appropriate .gitignore based on project type
 */
function getGitignoreTemplate(workspacePath: string): string {
  const files = fs.readdirSync(workspacePath);
  const templates: string[] = [];

  // Common ignores
  templates.push(`# OS
.DS_Store
Thumbs.db
*.swp
*.swo

# IDE
.idea/
.vscode/settings.json
*.sublime-*
`);

  // Node.js
  if (files.includes("package.json")) {
    templates.push(`# Node
node_modules/
npm-debug.log*
yarn-error.log
.env
.env.local
dist/
build/
coverage/
`);
  }

  // Python
  if (files.some((f) => f.endsWith(".py")) || files.includes("requirements.txt")) {
    templates.push(`# Python
__pycache__/
*.py[cod]
*$py.class
.env
venv/
.venv/
*.egg-info/
dist/
build/
.pytest_cache/
`);
  }

  // Rust
  if (files.includes("Cargo.toml")) {
    templates.push(`# Rust
target/
Cargo.lock
`);
  }

  // Go
  if (files.includes("go.mod")) {
    templates.push(`# Go
vendor/
*.exe
`);
  }

  // Java
  if (files.some((f) => f.endsWith(".java")) || files.includes("pom.xml")) {
    templates.push(`# Java
*.class
*.jar
target/
.gradle/
build/
`);
  }

  return templates.join("\n");
}

/**
 * List user's GitHub repos
 */
export async function listRepos(): Promise<
  Array<{ name: string; url: string; private: boolean; description: string }>
> {
  try {
    const { stdout } = await execAsync(
      'gh repo list --json name,url,isPrivate,description --limit 50'
    );
    const repos = JSON.parse(stdout);
    return repos.map((r: { name: string; url: string; isPrivate: boolean; description: string }) => ({
      name: r.name,
      url: r.url,
      private: r.isPrivate,
      description: r.description || "",
    }));
  } catch {
    return [];
  }
}

/**
 * Clone a repository
 */
export async function cloneRepo(
  repoUrl: string,
  targetPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`gh repo clone ${repoUrl} "${targetPath}"`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
