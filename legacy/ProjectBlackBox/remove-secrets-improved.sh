#!/bin/bash

# This script uses BFG Repo-Cleaner to remove sensitive API keys from the repository history
# https://rtyley.github.io/bfg-repo-cleaner/

echo "Creating backup branch before rewriting history..."
git branch backup-before-bfg

# Download BFG Repo-Cleaner if not already present
if [ ! -f bfg.jar ]; then
    echo "Downloading BFG Repo-Cleaner..."
    curl -L https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -o bfg.jar
fi

# Create a file with the secrets to be replaced
echo "Creating secrets file..."
cat > secrets.txt << EOF
OPENAI_API_KEY_PLACEHOLDER
ELEVENLABS_API_KEY_PLACEHOLDER
EOF

echo "Running BFG to remove secrets from history..."
java -jar bfg.jar --replace-text secrets.txt .

echo "Cleaning up repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Secrets have been removed from the repository history."
echo "Next steps:"
echo "1. Verify the changes with 'git log'"
echo "2. Add the remote back with 'git remote add origin https://github.com/SingSongScreamAlong/blackboxdriverapp.git'"
echo "3. Force push to GitHub with 'git push origin main --force'"
echo "4. Delete the backup branch when you're sure everything is working with 'git branch -D backup-before-bfg'"
echo "5. Delete the secrets file with 'rm secrets.txt'"
