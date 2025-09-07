#!/usr/bin/env python3
"""
Content Management System HTML Generator
Generates and updates HTML files based on CMS data
"""

import json
import os
import re
from datetime import datetime
from typing import Dict, List, Any

class HTMLGenerator:
    def __init__(self, base_dir: str = "."):
        self.base_dir = base_dir
        self.templates = {
            'work': self._load_work_template(),
            'projects': self._load_projects_template(),
            'publications': self._load_publications_template(),
            'photography': self._load_photography_template()
        }
    
    def _load_work_template(self) -> str:
        """Load the work.html template structure"""
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Build Diary - Pavan Kumar Dharmoju | Side Projects & Experiments</title>
    <meta name="description" content="Personal projects and side experiments by Pavan Kumar Dharmoju. Real stories about building tools, learning new tech, and creative coding projects outside of work.">
    <meta name="keywords" content="Side Projects, Personal Projects, Build Diary, Tech Experiments, Creative Coding, Open Source, Learning Journey, Developer Life">
    <meta name="author" content="Pavan Kumar Dharmoju">
    <link rel="canonical" href="https://pavankumardharmoju.github.io/work.html">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-optical-sizing: auto;
            letter-spacing: -0.01em;
            font-size: 16px;
        }
        .company-title {
            font-size: 22px;
            font-weight: 700;
        }
        .role-title {
            font-size: 17px;
            font-weight: 600;
        }
        .description-text {
            font-size: 15px;
            line-height: 1.6;
        }
        .date-text {
            font-size: 14px;
        }
    </style>
</head>
<body class="bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-8">
        <div class="flex flex-col sm:flex-row gap-8 pt-12">
            <!-- Sidebar -->
            <aside class="sm:w-24 shrink-0">
                <div class="flex sm:flex-col justify-between sm:space-y-4 sm:sticky sm:top-12">
                    <div class="flex items-center sm:block">
                        <a href="index.html">
                            <img src="assets/img/pavan.jpg" alt="Pavan Kumar Dharmoju" 
                                 class="w-20 h-20 rounded-full object-cover transform hover:rotate-12 transition-all duration-300">
                        </a>
                    </div>
                    <div>
                        <nav class="flex sm:flex-col sm:space-y-1 sm:text-right text-sm sm:text-base">
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="index.html">About</a>
                            <a class="mr-4 text-gray-800" href="work.html">Work</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="blogs.html">Blogs</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="projects.html">Projects</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="publications.html">Publications</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="photography.html">Photography</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="contact.html">Contact</a>
                        </nav>
                    </div>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 min-h-screen">
                <div class="max-w-2xl">
                    <div class="space-y-12 my-2">
                        
                        <!-- Build Diary Header -->
                        <div class="mb-8">
                            <h1 class="text-2xl font-semibold text-gray-900 mb-3">{page_title}</h1>
                            <p class="text-gray-600 text-base leading-relaxed">
                                {page_description}
                            </p>
                        </div>
                        
                        <!-- Commit-style Entries -->
                        <div class="space-y-6">
                            {entries_content}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <!-- Copyright Footer -->
    <footer class="mt-16 py-6 border-t border-gray-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-8">
            <p class="text-center text-sm text-gray-500">
                © 2025 Pavan Kumar Dharmoju. All rights reserved.
            </p>
        </div>
    </footer>
</body>
</html>'''

    def _load_projects_template(self) -> str:
        """Load the projects.html template structure"""
        # Similar structure to work template but for projects
        return "<!-- Projects template -->"
    
    def _load_publications_template(self) -> str:
        """Load the publications.html template structure"""
        return "<!-- Publications template -->"
    
    def _load_photography_template(self) -> str:
        """Load the photography.html template structure"""
        return "<!-- Photography template -->"

    def get_tag_color_class(self, tag: str) -> str:
        """Get the appropriate color class for a tag"""
        color_map = {
            'Python': 'bg-blue-100 text-blue-700',
            'JavaScript': 'bg-yellow-100 text-yellow-700',
            'React': 'bg-cyan-100 text-cyan-700',
            'Machine Learning': 'bg-purple-100 text-purple-700',
            'API': 'bg-green-100 text-green-700',
            'CLI Tool': 'bg-gray-100 text-gray-700',
            'Web Scraping': 'bg-orange-100 text-orange-700',
            'Data Viz': 'bg-pink-100 text-pink-700',
            'OpenAI API': 'bg-green-100 text-green-700',
            'PyTorch': 'bg-red-100 text-red-700',
            'TensorFlow': 'bg-orange-100 text-orange-700',
            'Chrome Extension': 'bg-yellow-100 text-yellow-700',
            'Content Filtering': 'bg-green-100 text-green-700',
            'Web APIs': 'bg-purple-100 text-purple-700',
            'Failed Experiment': 'bg-red-100 text-red-700',
            'File Management': 'bg-green-100 text-green-700',
            'Automation': 'bg-purple-100 text-purple-700',
            'Product': 'bg-blue-100 text-blue-700',
            'User Acquisition': 'bg-purple-100 text-purple-700',
            'Rust': 'bg-orange-100 text-orange-700',
            'Performance': 'bg-blue-100 text-blue-700',
            'Learning': 'bg-yellow-100 text-yellow-700',
            'Data Pipeline': 'bg-purple-100 text-purple-700',
            'Analytics': 'bg-green-100 text-green-700',
            'Self-Tracking': 'bg-blue-100 text-blue-700',
            'LLaMA 3.1': 'bg-blue-100 text-blue-700',
            'RAG': 'bg-purple-100 text-purple-700',
            'Research': 'bg-green-100 text-green-700',
            'Publication': 'bg-green-100 text-green-700',
            'CRISPR': 'bg-blue-100 text-blue-700',
            'Kubernetes': 'bg-blue-100 text-blue-700',
            'PostgreSQL': 'bg-green-100 text-green-700'
        }
        return color_map.get(tag, 'bg-gray-100 text-gray-700')

    def generate_work_entry_html(self, entry: Dict[str, Any]) -> str:
        """Generate HTML for a single work entry"""
        tags_html = ''
        if entry.get('tags'):
            tags_html = ''.join([
                f'<span class="px-2 py-1 {self.get_tag_color_class(tag)} text-xs rounded">{tag}</span>'
                for tag in entry['tags']
            ])

        return f'''
                            <div class="border-l-2 border-gray-200 pl-6 pb-6">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-2 h-2 bg-{entry.get('statusColor', 'green')}-500 rounded-full -ml-7 border-2 border-white"></div>
                                    <span class="font-mono text-sm text-gray-500">{entry.get('commitHash', '')}</span>
                                    <span class="text-sm text-gray-500">•</span>
                                    <span class="text-sm text-gray-500">{entry.get('date', '')}</span>
                                </div>
                                <h3 class="font-medium text-gray-900 mb-2">{entry.get('entryType', 'feat')}: {entry.get('title', '')}</h3>
                                <p class="text-gray-700 text-sm mb-3">
                                    {entry.get('description', '')}
                                </p>
                                <div class="flex gap-2">
                                    {tags_html}
                                </div>
                            </div>'''

    def generate_work_html(self, data: Dict[str, Any]) -> str:
        """Generate complete work.html content"""
        page_settings = data.get('pageSettings', {})
        title = page_settings.get('title', 'Build Log')
        description = page_settings.get('description', 
            'My day job is confidential (marketing attribution stuff), so here\'s what I\'m actually excited to share—the random projects I build because they seem fun, experiments that went nowhere, and side quests that turned into something cool.')
        
        entries = data.get('workEntries', [])
        entries_html = ''
        
        for entry in entries:
            entries_html += self.generate_work_entry_html(entry)
        
        return self.templates['work'].format(
            page_title=title,
            page_description=description,
            entries_content=entries_html
        )

    def update_from_json(self, json_file: str):
        """Update HTML files from JSON data"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Generate work.html
            if 'workEntries' in data or 'pageSettings' in data:
                work_html = self.generate_work_html(data)
                work_file = os.path.join(self.base_dir, 'work.html')
                
                with open(work_file, 'w', encoding='utf-8') as f:
                    f.write(work_html)
                print(f"✅ Updated {work_file}")
            
            # TODO: Add other page types
            
        except Exception as e:
            print(f"❌ Error updating HTML files: {e}")

    def backup_current_files(self):
        """Create backup copies of current HTML files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(self.base_dir, f"backup_{timestamp}")
        
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        files_to_backup = ['work.html', 'projects.html', 'publications.html', 'photography.html']
        
        for file in files_to_backup:
            src = os.path.join(self.base_dir, file)
            if os.path.exists(src):
                dst = os.path.join(backup_dir, file)
                import shutil
                shutil.copy2(src, dst)
                print(f"📁 Backed up {file} to {backup_dir}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate HTML files from CMS JSON data')
    parser.add_argument('json_file', help='Path to the JSON data file')
    parser.add_argument('--backup', action='store_true', help='Create backup before updating')
    parser.add_argument('--base-dir', default='.', help='Base directory for HTML files')
    
    args = parser.parse_args()
    
    generator = HTMLGenerator(args.base_dir)
    
    if args.backup:
        generator.backup_current_files()
    
    generator.update_from_json(args.json_file)

if __name__ == '__main__':
    main()
