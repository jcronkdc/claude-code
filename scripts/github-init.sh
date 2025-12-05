#!/bin/bash
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Universal GitHub Repository Creator
# 
# Usage:
#   github-init                    # Interactive mode
#   github-init my-repo            # Quick create with name
#   github-init my-repo "desc"     # Create with description
#   github-init my-repo "desc" -p  # Create private repo
#
# Install globally:
#   ln -s /path/to/github-init.sh /usr/local/bin/github-init
#
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Icons (using unicode, not emoji for terminal compatibility)
ICON_CHECK="✓"
ICON_CROSS="✗"
ICON_ARROW="→"
ICON_REPO="◉"

print_header() {
    echo -e "${BLUE}"
    echo "┌────────────────────────────────────────────────────┐"
    echo "│         GitHub Repository Initializer              │"
    echo "└────────────────────────────────────────────────────┘"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}${ICON_ARROW}${NC} $1"
}

print_success() {
    echo -e "${GREEN}${ICON_CHECK}${NC} $1"
}

print_error() {
    echo -e "${RED}${ICON_CROSS}${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        echo "  Install: https://git-scm.com/downloads"
        exit 1
    fi
    print_success "Git found"
    
    # Check gh CLI
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        echo ""
        echo "  Install options:"
        echo "    macOS:   brew install gh"
        echo "    Windows: winget install GitHub.cli"
        echo "    Linux:   https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
        echo ""
        exit 1
    fi
    print_success "GitHub CLI found"
    
    # Check gh auth
    if ! gh auth status &> /dev/null; then
        print_error "Not logged into GitHub"
        echo ""
        echo "  Run: gh auth login"
        echo ""
        
        read -p "Login now? (y/n): " LOGIN_NOW
        if [[ "$LOGIN_NOW" == "y" ]]; then
            gh auth login
        else
            exit 1
        fi
    fi
    
    USERNAME=$(gh api user -q .login 2>/dev/null || echo "unknown")
    print_success "Logged in as: ${BOLD}$USERNAME${NC}"
    echo ""
}

# Detect project type and generate .gitignore
generate_gitignore() {
    local IGNORES=""
    
    # Common
    IGNORES+="# OS files
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# IDE
.idea/
.vscode/settings.json
*.sublime-*
"

    # Node.js
    if [[ -f "package.json" ]]; then
        IGNORES+="
# Node.js
node_modules/
npm-debug.log*
yarn-error.log
.env
.env.local
.env.*.local
dist/
build/
coverage/
.cache/
"
    fi
    
    # Python
    if [[ -f "requirements.txt" ]] || [[ -f "setup.py" ]] || [[ -f "pyproject.toml" ]]; then
        IGNORES+="
# Python
__pycache__/
*.py[cod]
*\$py.class
.env
venv/
.venv/
env/
*.egg-info/
dist/
build/
.pytest_cache/
.coverage
htmlcov/
"
    fi
    
    # Rust
    if [[ -f "Cargo.toml" ]]; then
        IGNORES+="
# Rust
/target/
Cargo.lock
"
    fi
    
    # Go
    if [[ -f "go.mod" ]]; then
        IGNORES+="
# Go
/vendor/
*.exe
"
    fi
    
    # Java/Maven/Gradle
    if [[ -f "pom.xml" ]] || [[ -f "build.gradle" ]]; then
        IGNORES+="
# Java
*.class
*.jar
*.war
target/
build/
.gradle/
"
    fi
    
    # C/C++
    if ls *.c *.cpp *.h 2>/dev/null | head -1 &>/dev/null; then
        IGNORES+="
# C/C++
*.o
*.obj
*.exe
*.out
*.a
*.so
*.dylib
"
    fi
    
    echo "$IGNORES"
}

# Main function
main() {
    print_header
    check_prerequisites
    
    # Get repo name
    if [[ -n "$1" && "$1" != "-"* ]]; then
        REPO_NAME="$1"
    else
        DEFAULT_NAME=$(basename "$(pwd)")
        read -p "Repository name [$DEFAULT_NAME]: " REPO_NAME
        REPO_NAME=${REPO_NAME:-$DEFAULT_NAME}
    fi
    
    # Get description
    if [[ -n "$2" && "$2" != "-"* ]]; then
        DESCRIPTION="$2"
    else
        read -p "Description (optional): " DESCRIPTION
    fi
    
    # Get visibility
    VISIBILITY="public"
    if [[ "$3" == "-p" ]] || [[ "$1" == "-p" ]] || [[ "$2" == "-p" ]]; then
        VISIBILITY="private"
    else
        read -p "Make private? (y/N): " IS_PRIVATE
        if [[ "$IS_PRIVATE" == "y" || "$IS_PRIVATE" == "Y" ]]; then
            VISIBILITY="private"
        fi
    fi
    
    echo ""
    echo -e "${BOLD}${ICON_REPO} Creating repository:${NC}"
    echo "   Name: $REPO_NAME"
    echo "   Visibility: $VISIBILITY"
    [[ -n "$DESCRIPTION" ]] && echo "   Description: $DESCRIPTION"
    echo ""
    
    # Initialize git if needed
    if [[ ! -d ".git" ]]; then
        print_step "Initializing git..."
        git init -q
        print_success "Git initialized"
    else
        print_success "Git already initialized"
    fi
    
    # Create .gitignore if needed
    if [[ ! -f ".gitignore" ]]; then
        print_step "Creating .gitignore..."
        generate_gitignore > .gitignore
        print_success ".gitignore created"
    else
        print_success ".gitignore exists"
    fi
    
    # Stage files
    print_step "Staging files..."
    git add -A
    
    # Check if there are any commits
    if ! git rev-parse HEAD &>/dev/null 2>&1; then
        print_step "Creating initial commit..."
        git commit -q -m "Initial commit"
        print_success "Initial commit created"
    fi
    
    # Build gh command
    GH_CMD="gh repo create $REPO_NAME --$VISIBILITY --source=. --remote=origin --push"
    [[ -n "$DESCRIPTION" ]] && GH_CMD+=" --description=\"$DESCRIPTION\""
    
    # Create repo
    print_step "Creating GitHub repository..."
    if eval "$GH_CMD" 2>&1; then
        echo ""
        print_success "Repository created successfully!"
        echo ""
        
        # Get URL
        REPO_URL=$(gh browse -n 2>/dev/null || echo "https://github.com/$USERNAME/$REPO_NAME")
        
        echo -e "${GREEN}┌────────────────────────────────────────────────────┐${NC}"
        echo -e "${GREEN}│${NC} ${BOLD}Repository URL:${NC}"
        echo -e "${GREEN}│${NC} $REPO_URL"
        echo -e "${GREEN}│${NC}"
        echo -e "${GREEN}│${NC} ${BOLD}Commands:${NC}"
        echo -e "${GREEN}│${NC}   Push changes:  git push"
        echo -e "${GREEN}│${NC}   Open in browser: gh browse"
        echo -e "${GREEN}└────────────────────────────────────────────────────┘${NC}"
        
        # Offer to open in browser
        read -p "Open in browser? (Y/n): " OPEN_BROWSER
        if [[ "$OPEN_BROWSER" != "n" && "$OPEN_BROWSER" != "N" ]]; then
            gh browse
        fi
    else
        print_error "Failed to create repository"
        exit 1
    fi
}

# Run main
main "$@"
