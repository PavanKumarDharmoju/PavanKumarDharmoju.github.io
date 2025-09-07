// Projects Tab Functionality for CMS
// This file handles only the Projects tab without interfering with existing Work tab functionality

class ProjectsCMSManager {
    constructor() {
        this.projectsEntries = [];
        this.projectsTags = [];
        this.initProjectsTab();
    }

    initProjectsTab() {
        // Only initialize if Projects tab elements exist
        const projectsTab = document.getElementById('projects-tab');
        if (!projectsTab) return;

        this.setupProjectsEventListeners();
        this.setupProjectsSmartFeatures();
        this.setCurrentDate();
        this.loadExistingProjectsEntries(); // Auto-load projects
        this.updateProjectsPreview();
        this.checkProjectsServerStatus();
    }

    setupProjectsEventListeners() {
        const projectsEntryForm = document.getElementById('projects-entry-form');
        const projectsAddTagBtn = document.getElementById('projects-add-tag-btn');
        const projectsTagInput = document.getElementById('projects-tag-input');
        const projectsClearFormBtn = document.getElementById('projects-clear-form-btn');
        const projectsExportOnlyBtn = document.getElementById('projects-export-only-btn');
        const projectsAutoCommitBtn = document.getElementById('projects-auto-commit-btn');
        const projectsBackupDataBtn = document.getElementById('projects-backup-data-btn');

        if (projectsEntryForm) projectsEntryForm.addEventListener('submit', (e) => this.handleProjectsEntrySubmit(e));
        if (projectsAddTagBtn) projectsAddTagBtn.addEventListener('click', () => this.addProjectsTag());
        if (projectsTagInput) {
            projectsTagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addProjectsTag();
                }
            });
        }
        if (projectsClearFormBtn) projectsClearFormBtn.addEventListener('click', () => this.clearProjectsForm());
        if (projectsExportOnlyBtn) projectsExportOnlyBtn.addEventListener('click', () => this.exportProjectsHTML(false));
        if (projectsAutoCommitBtn) projectsAutoCommitBtn.addEventListener('click', () => this.exportProjectsHTML(true));
        if (projectsBackupDataBtn) projectsBackupDataBtn.addEventListener('click', () => this.backupProjectsData());

        // Suggested tag buttons for projects
        document.querySelectorAll('.projects-suggested-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.textContent;
                if (!this.projectsTags.includes(tag)) {
                    this.projectsTags.push(tag);
                    this.updateProjectsTagsDisplay();
                }
            });
        });
    }

    setupProjectsSmartFeatures() {
        // Smart entry type suggestion based on description
        const projectsDescriptionInput = document.getElementById('projects-description-input');
        const projectsEntryTypeSelect = document.getElementById('projects-entry-type');
        
        if (projectsDescriptionInput && projectsEntryTypeSelect) {
            projectsDescriptionInput.addEventListener('input', () => {
                const description = projectsDescriptionInput.value.toLowerCase();
                const suggestedType = this.suggestProjectEntryType(description);
                if (suggestedType) {
                    projectsEntryTypeSelect.value = suggestedType;
                }
            });
        }
    }

    suggestProjectEntryType(description) {
        const keywords = {
            'feat': ['built', 'developed', 'created', 'implemented', 'architecture', 'system'],
            'build': ['pipeline', 'infrastructure', 'deployment', 'ci/cd', 'docker', 'kubernetes'],
            'refactor': ['optimized', 'improved', 'refactored', 'enhanced', 'performance'],
            'test': ['tested', 'evaluation', 'benchmark', 'accuracy', 'validation'],
            'analytics': ['analysis', 'insights', 'data', 'metrics', 'dashboard', 'visualization']
        };

        for (const [type, typeKeywords] of Object.entries(keywords)) {
            if (typeKeywords.some(keyword => description.includes(keyword))) {
                return type;
            }
        }
        return null;
    }

    setCurrentDate() {
        const dateInput = document.getElementById('projects-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    handleProjectsEntrySubmit(e) {
        e.preventDefault();
        
        const entry = {
            commitHash: document.getElementById('projects-commit-hash').value || this.generateRandomHash(),
            date: document.getElementById('projects-date').value,
            statusColor: document.getElementById('projects-status-color').value,
            entryType: document.getElementById('projects-entry-type').value,
            organization: document.getElementById('projects-organization').value,
            title: document.getElementById('projects-title-input').value,
            description: document.getElementById('projects-description-input').value,
            tags: [...this.projectsTags]
        };

        if (!entry.title || !entry.description || !entry.organization) {
            alert('Please fill in the organization, title, and description.');
            return;
        }

        this.projectsEntries.unshift(entry); // Add to beginning
        this.updateProjectsEntriesDisplay();
        this.updateProjectsPreview();
        this.clearProjectsForm();
        
        console.log('Projects entry added:', entry);
    }

    addProjectsTag() {
        const tagInput = document.getElementById('projects-tag-input');
        if (!tagInput) return;

        const tagValue = tagInput.value.trim();
        if (tagValue && !this.projectsTags.includes(tagValue)) {
            this.projectsTags.push(tagValue);
            this.updateProjectsTagsDisplay();
            tagInput.value = '';
        }
    }

    updateProjectsTagsDisplay() {
        const container = document.getElementById('projects-current-tags');
        if (!container) return;

        container.innerHTML = this.projectsTags.map(tag => 
            `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                ${tag}
                <button type="button" onclick="projectsCMS.removeProjectsTag('${tag}')" class="ml-1 text-blue-600 hover:text-blue-800">×</button>
            </span>`
        ).join('');
    }

    removeProjectsTag(tag) {
        this.projectsTags = this.projectsTags.filter(t => t !== tag);
        this.updateProjectsTagsDisplay();
    }

    clearProjectsForm() {
        const form = document.getElementById('projects-entry-form');
        if (form) form.reset();
        
        this.setCurrentDate();
        this.projectsTags = [];
        this.updateProjectsTagsDisplay();
    }

    updateProjectsEntriesDisplay() {
        const container = document.getElementById('projects-entries-list');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add scroll container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'max-h-96 overflow-y-auto space-y-2';
        scrollContainer.id = 'projects-entries-scroll-container';

        this.projectsEntries.forEach((entry, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'entry-item border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow';
            entryElement.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="inline-block w-3 h-3 bg-${entry.statusColor}-500 rounded-full"></span>
                            <code class="text-xs bg-gray-100 px-2 py-1 rounded font-mono">${entry.commitHash}</code>
                            <span class="text-xs text-gray-500">${entry.date}</span>
                            <span class="text-xs text-gray-500">•</span>
                            <span class="text-xs text-gray-600 font-medium">${entry.organization}</span>
                        </div>
                        <h4 class="font-medium text-gray-900 mb-1">${entry.entryType}: ${entry.title}</h4>
                        <p class="text-sm text-gray-600 mb-3 line-clamp-2">${entry.description}</p>
                        <div class="flex flex-wrap gap-1">
                            ${entry.tags.map(tag => `<span class="inline-block bg-${entry.statusColor}-100 text-${entry.statusColor}-700 px-2 py-1 rounded text-xs font-medium">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="projectsCMS.editProjectsEntry(${index})" 
                                class="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                            Edit
                        </button>
                        <button onclick="projectsCMS.removeProjectsEntry(${index})" 
                                class="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            scrollContainer.appendChild(entryElement);
        });

        // Add empty state if no entries
        if (this.projectsEntries.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center py-8 text-gray-500';
            emptyState.innerHTML = '<p>No projects yet. Add your first project above!</p>';
            scrollContainer.appendChild(emptyState);
        }

        container.appendChild(scrollContainer);
    }

    editProjectsEntry(index) {
        const entry = this.projectsEntries[index];
        if (!entry) return;

        // Populate form with entry data
        document.getElementById('projects-commit-hash').value = entry.commitHash;
        document.getElementById('projects-date').value = entry.date;
        document.getElementById('projects-status-color').value = entry.statusColor;
        document.getElementById('projects-entry-type').value = entry.entryType;
        document.getElementById('projects-organization').value = entry.organization;
        document.getElementById('projects-title-input').value = entry.title;
        document.getElementById('projects-description-input').value = entry.description;
        
        // Set tags
        this.projectsTags = [...entry.tags];
        this.updateProjectsTagsDisplay();

        // Remove the entry being edited
        this.projectsEntries.splice(index, 1);
        this.updateProjectsEntriesDisplay();
        this.updateProjectsPreview();

        // Scroll to form
        document.getElementById('projects-entry-form').scrollIntoView({ behavior: 'smooth' });
    }

    removeProjectsEntry(index) {
        if (confirm('Are you sure you want to remove this entry?')) {
            this.projectsEntries.splice(index, 1);
            this.updateProjectsEntriesDisplay();
            this.updateProjectsPreview();
        }
    }

    updateProjectsPreview() {
        const preview = document.getElementById('projects-preview');
        if (!preview) return;

        const title = document.getElementById('projects-title')?.value || 'Project Build Log';
        const description = document.getElementById('projects-description')?.value || 'Systems I\'ve architected, bugs I\'ve hunted down, and experiments that taught me something new.';
        
        let html = `<div class="bg-white rounded-lg shadow-sm border p-6 max-h-96 overflow-y-auto">
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-2">${title}</h1>
                <p class="text-gray-600 text-sm">${description}</p>
            </div>`;
        
        if (this.projectsEntries.length === 0) {
            html += `<div class="text-center py-8 text-gray-500">
                <p>No projects yet. Add your first project above!</p>
            </div>`;
        } else {
            html += `<div class="space-y-4">`;
            
            this.projectsEntries.slice(0, 5).forEach(entry => {
                html += `
                    <div class="border-l-2 border-gray-200 pl-4 pb-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-2 h-2 bg-${entry.statusColor}-500 rounded-full -ml-5 border border-white"></span>
                            <code class="text-xs bg-gray-100 px-1 rounded font-mono">${entry.commitHash}</code>
                            <span class="text-xs text-gray-500">•</span>
                            <span class="text-xs text-gray-500">${entry.date}</span>
                            <span class="text-xs text-gray-500">•</span>
                            <span class="text-xs text-gray-600">${entry.organization}</span>
                        </div>
                        <h3 class="font-medium text-gray-900 text-sm mb-1">${entry.entryType}: ${entry.title}</h3>
                        <p class="text-gray-600 text-xs leading-relaxed mb-2">${entry.description.substring(0, 120)}${entry.description.length > 120 ? '...' : ''}</p>
                        <div class="flex flex-wrap gap-1">
                            ${entry.tags.slice(0, 3).map(tag => `<span class="bg-${entry.statusColor}-100 text-${entry.statusColor}-700 px-1 py-0.5 rounded text-xs">${tag}</span>`).join('')}
                            ${entry.tags.length > 3 ? `<span class="text-xs text-gray-500">+${entry.tags.length - 3} more</span>` : ''}
                        </div>
                    </div>`;
            });
            
            if (this.projectsEntries.length > 5) {
                html += `<div class="text-center py-2 text-gray-500 text-sm">
                    ... and ${this.projectsEntries.length - 5} more projects
                </div>`;
            }
            
            html += `</div>`;
        }
        
        html += `</div>`;
        preview.innerHTML = html;
    }

    async loadExistingProjectsEntries() {
        try {
            const response = await fetch('/projects.html');
            const html = await response.text();
            
            // Parse the HTML to extract entries
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const entryElements = doc.querySelectorAll('div.border-l-2.border-gray-200.pl-6.pb-6');
            
            this.projectsEntries = [];
            entryElements.forEach(element => {
                const commitHashElement = element.querySelector('span.font-mono');
                const metaSpans = element.querySelectorAll('.text-sm.text-gray-500');
                const titleElement = element.querySelector('h3');
                const descriptionElement = element.querySelector('p.text-gray-700');
                const tagElements = element.querySelectorAll('.px-2.py-1');
                
                if (commitHashElement && titleElement && metaSpans.length >= 3) {
                    // Extract date and organization from meta spans
                    // Structure: commitHash • date • organization
                    let date = '';
                    let organization = '';
                    
                    for (let i = 0; i < metaSpans.length; i++) {
                        const text = metaSpans[i].textContent.trim();
                        if (text !== '•' && text !== commitHashElement.textContent.trim()) {
                            if (!date) {
                                date = text;
                            } else if (text !== '•') {
                                organization = text;
                                break;
                            }
                        }
                    }
                    
                    const fullTitle = titleElement.textContent.trim();
                    const typeMatch = fullTitle.match(/^([^:]+):\s*(.+)$/);
                    
                    const entry = {
                        commitHash: commitHashElement.textContent.trim(),
                        date: date || new Date().toISOString().split('T')[0],
                        organization: organization || '',
                        statusColor: this.getStatusColorFromElement(element),
                        entryType: typeMatch ? typeMatch[1] : 'feat',
                        title: typeMatch ? typeMatch[2] : fullTitle,
                        description: descriptionElement ? descriptionElement.textContent.trim() : '',
                        tags: Array.from(tagElements).map(tag => tag.textContent.trim()).filter(tag => tag)
                    };
                    
                    this.projectsEntries.push(entry);
                }
            });
            
            this.updateProjectsEntriesDisplay();
            this.updateProjectsPreview();
            console.log(`Loaded ${this.projectsEntries.length} projects entries`);
            
            this.showProjectsNotification(`Loaded ${this.projectsEntries.length} projects successfully!`, 'success');
            
        } catch (error) {
            console.error('Error loading projects entries:', error);
            this.showProjectsNotification('Error loading existing entries. Make sure projects.html exists.', 'error');
        }
    }

    getStatusColorFromElement(element) {
        const colorDot = element.querySelector('.w-2.h-2.rounded-full');
        if (colorDot) {
            const classes = colorDot.className;
            if (classes.includes('bg-blue-500')) return 'blue';
            if (classes.includes('bg-green-500')) return 'green';
            if (classes.includes('bg-purple-500')) return 'purple';
            if (classes.includes('bg-red-500')) return 'red';
            if (classes.includes('bg-orange-500')) return 'orange';
            if (classes.includes('bg-indigo-500')) return 'indigo';
        }
        return 'blue';
    }

    async exportProjectsHTML(autoCommit = false) {
        const title = document.getElementById('projects-title')?.value || 'Project Build Log';
        const description = document.getElementById('projects-description')?.value || 'Systems I\'ve architected, bugs I\'ve hunted down, and experiments that taught me something new.';
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Pavan Kumar Dharmoju</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-optical-sizing: auto;
            letter-spacing: -0.01em;
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
                        <img src="assets/img/pavan.jpg" 
                             alt="Pavan Kumar Dharmoju" 
                             class="w-20 h-20 rounded-full object-cover transform hover:rotate-12 transition-all duration-300">
                    </div>
                    
                    <div class="flex sm:block">
                        <nav class="flex sm:flex-col sm:space-y-1 sm:text-right text-sm sm:text-base">
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="index.html">About</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="work.html">Work</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="blogs.html">Blogs</a>
                            <a class="mr-4 text-gray-800" href="projects.html">Projects</a>
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
                        
                        <!-- Projects Header -->
                        <div class="mb-8">
                            <h1 class="text-2xl font-semibold text-gray-900 mb-3">${title}</h1>
                            <p class="text-gray-600 text-base leading-relaxed">
                                ${description}
                            </p>
                        </div>
                        
                        <!-- Project Commits -->
                        <div class="space-y-6">`;

        this.projectsEntries.forEach(entry => {
            html += `
                        <div class="border-l-2 border-gray-200 pl-6 pb-6">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-2 h-2 bg-${entry.statusColor}-500 rounded-full -ml-7 border-2 border-white"></div>
                                <span class="font-mono text-sm text-gray-500">${entry.commitHash}</span>
                                <span class="text-sm text-gray-500">•</span>
                                <span class="text-sm text-gray-500">${entry.date}</span>
                                <span class="text-sm text-gray-500">•</span>
                                <span class="text-sm text-gray-500">${entry.organization}</span>
                            </div>
                            <h3 class="font-medium text-gray-900 mb-2">
                                ${entry.entryType}: ${entry.title}
                            </h3>
                            <p class="text-gray-700 text-sm mb-3">
                                ${entry.description}
                            </p>
                            <div class="flex gap-2">
                                ${entry.tags.map(tag => `<span class="px-2 py-1 bg-${entry.statusColor}-100 text-${entry.statusColor}-700 text-xs rounded">${tag}</span>`).join('')}
                            </div>
                        </div>`;
        });

        html += `
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
</html>`;

        await this.saveProjectsFile('projects.html', html, autoCommit);
    }

    async saveProjectsFile(filename, content, autoCommit = false) {
        // Check if the Projects server is running by looking for projects server status
        const serverStatus = document.getElementById('projects-server-status');
        const serverFirstStrategy = serverStatus && serverStatus.textContent.includes('🟢');
        
        if (serverFirstStrategy) {
            // Try server first
            try {
                console.log(`Attempting to save ${filename} to server...`);
                
                const response = await fetch('http://localhost:8000/save-file', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: filename,
                        content: content
                    })
                });
                
                const responseText = await response.text();
                console.log('Server response:', responseText);
                
                if (response.ok) {
                    console.log(`✅ Server saved: ${filename}`);
                    
                    if (autoCommit) {
                        // Trigger git commit
                        console.log('Triggering git commit...');
                        const commitResponse = await fetch('http://localhost:8000/git-commit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: `Update ${filename} via Projects CMS`,
                                files: [filename]
                            })
                        });
                        
                        const commitResponseText = await commitResponse.text();
                        console.log('Git commit response:', commitResponseText);
                        
                        if (commitResponse.ok) {
                            this.showProjectsNotification('✅ File saved and committed to Git successfully!', 'success');
                        } else {
                            this.showProjectsNotification('⚠️ File saved but Git commit failed. Check server logs.', 'warning');
                        }
                    } else {
                        this.showProjectsNotification(`✅ ${filename} saved successfully to project directory!`, 'success');
                    }
                    return;
                } else {
                    throw new Error(`Server responded with ${response.status}: ${responseText}`);
                }
            } catch (error) {
                console.log('Server method failed, falling back to download:', error);
                this.showProjectsNotification(`Server error: ${error.message}. Falling back to download.`, 'warning');
            }
        }
        
        // Fallback to download
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        if (autoCommit) {
            this.showProjectsNotification('⚠️ File downloaded. Please move it to your project directory and commit manually.', 'warning');
        } else {
            this.showProjectsNotification(`📁 ${filename} has been downloaded. Move it to your project directory if needed.`, 'info');
        }
    }

    backupProjectsData() {
        const backup = {
            timestamp: new Date().toISOString(),
            entries: this.projectsEntries,
            metadata: {
                title: document.getElementById('projects-title')?.value || '',
                description: document.getElementById('projects-description')?.value || ''
            }
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `projects-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showProjectsNotification('Projects data backed up successfully!', 'success');
    }

    generateRandomHash() {
        return Math.random().toString(36).substring(2, 9);
    }

    async checkProjectsServerStatus() {
        const statusElement = document.getElementById('projects-server-status');
        if (!statusElement) return;
        
        try {
            const response = await fetch('http://localhost:8000/save-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 'test', content: 'test' })
            });
            
            // If we get here, server is running (even if it's an error response)
            if (response.status === 400 || response.ok) {
                statusElement.textContent = '🟢 Server Active (Direct Save)';
                statusElement.className = 'text-green-600 text-sm font-medium';
            } else {
                throw new Error('Server not responding properly');
            }
        } catch (error) {
            statusElement.textContent = '🔴 Server Offline (Download Mode)';
            statusElement.className = 'text-red-600 text-sm font-medium';
        }
    }

    showProjectsNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-16 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-orange-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize Projects CMS when page loads
let projectsCMS;
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure main CMS is loaded first
    setTimeout(() => {
        projectsCMS = new ProjectsCMSManager();
        console.log('Projects CMS initialized');
    }, 100);
});
