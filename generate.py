#!/usr/bin/env python3
"""
Website Generator Script
This script reads configuration from the admin interface and generates HTML files
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

class WebsiteGenerator:
    def __init__(self, config_file='website-config.json'):
        self.config_file = config_file
        self.config = {}
        self.templates_dir = Path('templates')
        self.output_dir = Path('.')
        
    def load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            print(f"Configuration file {self.config_file} not found!")
            return False
        except json.JSONDecodeError as e:
            print(f"Error parsing configuration: {e}")
            return False
        return True
    
    def update_html_file(self, file_path, replacements):
        """Update HTML file with new content"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern, replacement in replacements.items():
                content = re.sub(pattern, replacement, content, flags=re.DOTALL)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"Updated {file_path}")
            return True
        except Exception as e:
            print(f"Error updating {file_path}: {e}")
            return False
    
    def update_profile_info(self):
        """Update profile information across all pages"""
        profile = self.config.get('profile', {})
        
        # Define replacements for profile information
        replacements = {
            # Name replacements
            r'<h1[^>]*class="[^"]*"[^>]*>.*?</h1>': f'<h1 class="text-xl font-semibold text-gray-900">{profile.get("name", "")}</h1>',
            # Title replacements
            r'<p[^>]*class="text-gray-600[^"]*"[^>]*>.*?</p>': f'<p class="text-gray-600 text-sm mb-2">{profile.get("title", "")}</p>',
            # Bio replacements
            r'<p[^>]*class="text-gray-700[^"]*leading-relaxed[^"]*"[^>]*>.*?</p>': f'<p class="text-gray-700 text-sm leading-relaxed">{profile.get("bio", "")}</p>',
        }
        
        # Files to update
        html_files = ['index.html', 'work.html', 'projects.html', 'blogs.html', 'publications.html', 'contact.html', 'photography.html']
        
        for file_path in html_files:
            if os.path.exists(file_path):
                self.update_html_file(file_path, replacements)
    
    def update_contact_info(self):
        """Update contact information"""
        contact = self.config.get('contact', {})
        
        # Update contact.html specifically
        contact_replacements = {
            # Email
            r'href="mailto:[^"]*"': f'href="mailto:{contact.get("email", "")}"',
            r'dharmojupavankumar@gmail\.com': contact.get("email", ""),
            # LinkedIn
            r'href="https://linkedin\.com/in/[^"]*"': f'href="{contact.get("linkedin", "")}"',
            # GitHub
            r'href="https://github\.com/[^"]*"': f'href="{contact.get("github", "")}"',
            # Instagram
            r'href="https://instagram\.com/[^"]*"': f'href="https://instagram.com/{contact.get("instagram", "")}"',
            r'@pixelsbypavan': f'@{contact.get("instagram", "")}',
            # YouTube
            r'href="https://youtube\.com/@[^"]*"': f'href="https://youtube.com/@{contact.get("youtube", "")}"',
            # Scholar
            r'href="https://scholar\.google\.com/citations\?user=[^"]*"': f'href="https://scholar.google.com/citations?user={contact.get("scholar", "")}"',
        }
        
        if os.path.exists('contact.html'):
            self.update_html_file('contact.html', contact_replacements)
    
    def generate_work_experience(self):
        """Generate work experience section"""
        work_items = self.config.get('work', [])
        
        if not work_items:
            return
        
        # Generate HTML for work items
        work_html = ""
        for item in work_items:
            work_html += self.generate_work_item_html(item)
        
        # Update work.html
        work_replacements = {
            r'<!-- Work items start -->.*?<!-- Work items end -->': f'<!-- Work items start -->\n{work_html}\n                        <!-- Work items end -->'
        }
        
        if os.path.exists('work.html'):
            self.update_html_file('work.html', work_replacements)
    
    def generate_work_item_html(self, item):
        """Generate HTML for a single work item"""
        return f'''
                        <div class="border-l-2 border-gray-200 pl-6 pb-6">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-2 h-2 bg-green-500 rounded-full -ml-7 border-2 border-white"></div>
                                <span class="font-mono text-sm text-gray-500">{item.get("commitHash", "abc123")}</span>
                                <span class="text-sm text-gray-500">•</span>
                                <span class="text-sm text-gray-500">{item.get("date", datetime.now().strftime("%b %d, %Y"))}</span>
                                <span class="text-sm text-gray-500">•</span>
                                <span class="text-sm text-gray-500">{item.get("location", "")}</span>
                            </div>
                            <h3 class="font-medium text-gray-900 mb-2">
                                feat: {item.get("position", "")} at {item.get("company", "")}
                            </h3>
                            <p class="text-gray-700 text-sm mb-4">
                                {item.get("description", "")}
                            </p>
                            <div class="flex flex-wrap gap-2">
                                {self.generate_tech_tags(item.get("technologies", ""))}
                            </div>
                        </div>'''
    
    def generate_tech_tags(self, technologies):
        """Generate technology tags HTML"""
        if not technologies:
            return ""
        
        tags = [tag.strip() for tag in technologies.split(',')]
        tag_colors = ['blue', 'green', 'purple', 'orange', 'red', 'indigo']
        
        tag_html = ""
        for i, tag in enumerate(tags):
            color = tag_colors[i % len(tag_colors)]
            tag_html += f'<span class="px-2 py-1 bg-{color}-100 text-{color}-700 text-xs rounded">{tag}</span>\n                                '
        
        return tag_html.strip()
    
    def generate_projects(self):
        """Generate projects section"""
        projects = self.config.get('projects', [])
        
        if not projects:
            return
        
        # Generate projects HTML
        projects_html = ""
        for project in projects:
            projects_html += self.generate_project_html(project)
        
        # Update projects.html
        project_replacements = {
            r'<!-- Projects start -->.*?<!-- Projects end -->': f'<!-- Projects start -->\n{projects_html}\n                        <!-- Projects end -->'
        }
        
        if os.path.exists('projects.html'):
            self.update_html_file('projects.html', project_replacements)
    
    def generate_project_html(self, project):
        """Generate HTML for a single project"""
        status_colors = {
            'completed': 'green',
            'in-progress': 'blue',
            'planned': 'gray'
        }
        
        status_color = status_colors.get(project.get('status', 'completed'), 'green')
        
        return f'''
                        <div class="border border-gray-200 rounded-lg p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-medium text-gray-900">{project.get("name", "")}</h3>
                                <span class="px-2 py-1 bg-{status_color}-100 text-{status_color}-700 text-xs rounded">
                                    {project.get("status", "completed").replace("-", " ").title()}
                                </span>
                            </div>
                            <p class="text-gray-700 text-sm mb-4">{project.get("description", "")}</p>
                            <div class="flex flex-wrap gap-2 mb-4">
                                {self.generate_tech_tags(project.get("technologies", ""))}
                            </div>
                            <div class="flex space-x-4">
                                {f'<a href="{project.get("githubUrl", "")}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">View Code →</a>' if project.get("githubUrl") else ""}
                                {f'<a href="{project.get("liveUrl", "")}" target="_blank" class="text-green-600 hover:text-green-800 text-sm">Live Demo →</a>' if project.get("liveUrl") else ""}
                            </div>
                        </div>'''
    
    def generate_all_pages(self):
        """Generate all pages from configuration"""
        print("Generating website from configuration...")
        
        # Update profile information
        self.update_profile_info()
        
        # Update contact information
        self.update_contact_info()
        
        # Generate work experience
        self.generate_work_experience()
        
        # Generate projects
        self.generate_projects()
        
        print("Website generation complete!")
    
    def watch_config(self):
        """Watch for configuration changes and regenerate"""
        import time
        last_modified = 0
        
        print(f"Watching {self.config_file} for changes...")
        
        try:
            while True:
                if os.path.exists(self.config_file):
                    current_modified = os.path.getmtime(self.config_file)
                    if current_modified > last_modified:
                        print("Configuration changed, regenerating...")
                        if self.load_config():
                            self.generate_all_pages()
                        last_modified = current_modified
                
                time.sleep(2)  # Check every 2 seconds
        except KeyboardInterrupt:
            print("Stopping configuration watcher...")

def main():
    import sys
    
    generator = WebsiteGenerator()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'watch':
            generator.watch_config()
        elif sys.argv[1] == 'generate':
            if generator.load_config():
                generator.generate_all_pages()
    else:
        print("""
Website Generator Usage:
    python generate.py generate  - Generate website from config once
    python generate.py watch     - Watch config file and regenerate on changes
        """)

if __name__ == "__main__":
    main()
