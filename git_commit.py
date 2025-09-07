#!/usr/bin/env python3
"""
Git automation script for CMS updates
Automatically commits and pushes changes to the repository
"""

import subprocess
import sys
import os
from datetime import datetime

def run_command(command, check=True):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=check)
        return result.stdout.strip(), result.stderr.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {command}")
        print(f"Error: {e.stderr}")
        return None, e.stderr

def check_git_status():
    """Check if there are any changes to commit"""
    stdout, stderr = run_command("git status --porcelain", check=False)
    if stdout:
        print("📝 Changes detected:")
        for line in stdout.split('\n'):
            if line.strip():
                print(f"  {line}")
        return True
    else:
        print("✅ No changes to commit")
        return False

def get_commit_message():
    """Generate or get commit message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Check what files were modified
    stdout, _ = run_command("git diff --name-only", check=False)
    if not stdout:
        stdout, _ = run_command("git diff --cached --name-only", check=False)
    
    files = stdout.split('\n') if stdout else []
    
    if 'work.html' in files:
        return f"feat: update work log entries via CMS ({timestamp})"
    elif 'projects.html' in files:
        return f"feat: update projects via CMS ({timestamp})"
    elif 'publications.html' in files:
        return f"feat: update publications via CMS ({timestamp})"
    elif 'photography.html' in files:
        return f"feat: update photography via CMS ({timestamp})"
    else:
        return f"chore: update content via CMS ({timestamp})"

def commit_and_push(message=None, push=True):
    """Commit changes and optionally push to remote"""
    
    # Check if we're in a git repository
    stdout, stderr = run_command("git rev-parse --git-dir", check=False)
    if not stdout:
        print("❌ Not in a git repository")
        return False
    
    # Check for changes
    if not check_git_status():
        return True
    
    # Add all changes
    print("📦 Adding changes...")
    stdout, stderr = run_command("git add .")
    if stderr:
        print(f"⚠️  Warning during git add: {stderr}")
    
    # Generate commit message if not provided
    if not message:
        message = get_commit_message()
    
    print(f"💾 Committing with message: {message}")
    
    # Commit changes
    commit_cmd = f'git commit -m "{message}"'
    stdout, stderr = run_command(commit_cmd)
    if stderr and "nothing to commit" not in stderr:
        print(f"❌ Commit failed: {stderr}")
        return False
    
    print("✅ Changes committed successfully")
    
    # Push to remote if requested
    if push:
        print("🚀 Pushing to remote...")
        
        # Get current branch
        branch_stdout, _ = run_command("git branch --show-current")
        branch = branch_stdout if branch_stdout else "main"
        
        push_cmd = f"git push origin {branch}"
        stdout, stderr = run_command(push_cmd, check=False)
        
        if stderr and "error" in stderr.lower():
            print(f"❌ Push failed: {stderr}")
            print("💡 You may need to run 'git push' manually")
            return False
        else:
            print("✅ Changes pushed to remote successfully")
    
    return True

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Automate git commit and push for CMS updates')
    parser.add_argument('-m', '--message', help='Custom commit message')
    parser.add_argument('--no-push', action='store_true', help='Commit only, do not push')
    parser.add_argument('--status', action='store_true', help='Show git status only')
    
    args = parser.parse_args()
    
    if args.status:
        check_git_status()
        return
    
    success = commit_and_push(
        message=args.message,
        push=not args.no_push
    )
    
    if success:
        print("\n🎉 All done! Your changes are ready.")
    else:
        print("\n❌ Something went wrong. Check the output above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
