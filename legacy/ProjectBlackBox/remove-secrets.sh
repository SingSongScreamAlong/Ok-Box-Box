#!/bin/bash

# This script uses git filter-repo to remove sensitive API keys from the repository history
# https://github.com/newren/git-filter-repo

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "Error: git-filter-repo is not installed."
    echo "Please install it with: pip3 install git-filter-repo"
    exit 1
fi

echo "Creating backup branch before rewriting history..."
git branch backup-before-filter

echo "Rewriting history to remove API keys..."

# Create a file with regex patterns to replace API keys with placeholders
cat > patterns.txt << EOF
literal:YOUR_OPENAI_API_KEY_HERE=\${OPENAI_API_KEY}
literal:sk_f92aab2a18dd30b8c5258739d6ff85fc95f4bce6fa1e5fc0=\${ELEVENLABS_API_KEY}
EOF

# Run git filter-repo to replace sensitive data
git filter-repo --force --replace-text patterns.txt

echo "History rewritten. The sensitive data has been replaced with placeholders."
echo "A backup branch 'backup-before-filter' has been created with the original history."
echo ""
echo "Next steps:"
echo "1. Verify the changes with 'git log'"
echo "2. Force push to GitHub with 'git push origin main --force'"
echo "3. Delete the backup branch when you're sure everything is working with 'git branch -D backup-before-filter'"
