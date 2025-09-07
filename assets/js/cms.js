// Content Management System JavaScript
class CMSManager {
    constructor() {
        this.currentTab = 'work';
        this.workEntries = [];
        this.init();
    }

    init() {
        this.setupTabSwitching();
        this.setupWorkTab();
        this.setupEntryTypeTracking();
        this.setCurrentDate(); // Auto-set today's date
        this.loadExistingWorkEntries();
        this.updatePreview();
        this.checkServerStatus();
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/save-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 'test', content: 'test' })
            });
            
            // If we get here, server is running
            this.showServerStatus(true);
        } catch (error) {
            // Server not running
            this.showServerStatus(false);
        }
    }

    showServerStatus(isRunning) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'server-status';
        statusDiv.className = `fixed top-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 ${
            isRunning 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
        }`;
        statusDiv.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full mr-2 ${
                isRunning ? 'bg-green-500' : 'bg-red-500'
            }"></span>
            ${isRunning ? 'Server Running' : 'Server Offline'}
        `;
        
        // Remove existing status if any
        const existing = document.getElementById('server-status');
        if (existing) existing.remove();
        
        document.body.appendChild(statusDiv);
    }

    setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.remove('border-transparent', 'text-gray-500');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('border-blue-500', 'text-blue-600');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-tab`).classList.add('active');
        this.currentTab = tabName;
    }

    setupWorkTab() {
        // Form submission
        document.getElementById('work-entry-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addWorkEntry();
        });

        // Tag management
        document.getElementById('add-tag-btn').addEventListener('click', () => {
            this.addTag();
        });

        document.getElementById('tag-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            }
        });

        // Suggested tags
        document.querySelectorAll('.suggested-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.addSuggestedTag(e.target.textContent);
            });
        });

        // Clear form
        document.getElementById('clear-form-btn').addEventListener('click', () => {
            this.clearWorkForm();
        });

        // Today button
        document.getElementById('today-btn').addEventListener('click', () => {
            this.setCurrentDate();
        });

        // Load entries
        document.getElementById('load-entries-btn').addEventListener('click', () => {
            this.loadExistingWorkEntries();
        });

        // Export/Import
        document.getElementById('export-only-btn').addEventListener('click', () => {
            this.exportHTML();
        });

        document.getElementById('auto-commit-btn').addEventListener('click', () => {
            this.autoCommitAndPush();
        });

        document.getElementById('backup-data-btn').addEventListener('click', () => {
            this.backupData();
        });

        document.getElementById('import-data-btn').addEventListener('click', () => {
            document.getElementById('import-data-input').click();
        });

        document.getElementById('import-data-input').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Auto-generate commit hash
        document.getElementById('entry-title').addEventListener('input', () => {
            if (!document.getElementById('commit-hash').value) {
                this.generateCommitHash();
            }
            // Smart entry type suggestion
            this.suggestEntryType();
        });

        // Update preview on changes
        ['work-title', 'work-description'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updatePreview();
            });
        });
    }

    addTag() {
        const tagInput = document.getElementById('tag-input');
        const tagText = tagInput.value.trim();
        
        if (tagText && !this.hasTag(tagText)) {
            this.createTagElement(tagText);
            tagInput.value = '';
        }
    }

    addSuggestedTag(tagText) {
        if (!this.hasTag(tagText)) {
            this.createTagElement(tagText);
        }
    }

    hasTag(tagText) {
        const existingTags = document.querySelectorAll('#current-tags .tag-input');
        return Array.from(existingTags).some(tag => tag.textContent.includes(tagText));
    }

    createTagElement(tagText) {
        const tagContainer = document.getElementById('current-tags');
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-input';
        tagElement.innerHTML = `${tagText} <span class="tag-remove" onclick="this.parentElement.remove()">×</span>`;
        tagContainer.appendChild(tagElement);
    }

    generateCommitHash() {
        const chars = 'abcdef0123456789';
        let hash = '';
        for (let i = 0; i < 7; i++) {
            hash += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('commit-hash').value = hash;
    }

    addWorkEntry() {
        const formData = this.getWorkFormData();
        
        if (!this.validateWorkEntry(formData)) {
            return;
        }

        this.workEntries.unshift(formData); // Add to beginning
        this.updateEntriesList();
        this.updatePreview();
        this.clearWorkForm();
        
        this.showNotification('Entry added successfully!', 'success');
    }

    getWorkFormData() {
        const tags = Array.from(document.querySelectorAll('#current-tags .tag-input'))
            .map(tag => tag.textContent.replace('×', '').trim());

        return {
            id: Date.now(),
            commitHash: document.getElementById('commit-hash').value,
            date: document.getElementById('commit-date').value,
            statusColor: document.getElementById('status-color').value,
            entryType: document.getElementById('entry-type').value,
            title: document.getElementById('entry-title').value,
            description: document.getElementById('entry-description').value,
            tags: tags,
            timestamp: new Date().toISOString()
        };
    }

    validateWorkEntry(data) {
        if (!data.title.trim()) {
            this.showNotification('Title is required', 'error');
            return false;
        }
        
        if (!data.description.trim()) {
            this.showNotification('Description is required', 'error');
            return false;
        }

        return true;
    }

    clearWorkForm() {
        document.getElementById('work-entry-form').reset();
        document.getElementById('current-tags').innerHTML = '';
        document.getElementById('status-color').value = 'green';
        document.getElementById('entry-type').value = 'feat';
        
        // Reset entry type tracking
        document.getElementById('entry-type').dataset.userChanged = 'false';
        
        // Set current date in the format used in work.html
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        document.getElementById('commit-date').value = formattedDate;
    }

    // Auto-set date when page loads
    suggestEntryType() {
        const title = document.getElementById('entry-title').value.toLowerCase();
        const entryTypeSelect = document.getElementById('entry-type');
        
        // Don't auto-change if user has already selected something other than default
        if (entryTypeSelect.value !== 'feat' && entryTypeSelect.dataset.userChanged === 'true') {
            return;
        }
        
        // Keywords that suggest specific entry types
        const typeKeywords = {
            'experiment': ['experiment', 'trying', 'learning', 'testing', 'vs', 'comparison', 'explore'],
            'build': ['tracker', 'scraper', 'pipeline', 'infrastructure', 'deployment', 'ci/cd', 'docker'],
            'wip': ['wip', 'progress', 'working on', 'building', 'developing', 'started'],
            'fix': ['fix', 'bug', 'error', 'failed', 'broken', 'debug', 'issue'],
            'refactor': ['refactor', 'improve', 'optimize', 'cleanup', 'rewrite', 'production'],
            'docs': ['docs', 'documentation', 'paper', 'publication', 'published', 'guide', 'readme']
        };
        
        // Check for keywords in title
        for (const [type, keywords] of Object.entries(typeKeywords)) {
            if (keywords.some(keyword => title.includes(keyword))) {
                entryTypeSelect.value = type;
                return;
            }
        }
        
        // Default to feat if no specific keywords found
        entryTypeSelect.value = 'feat';
    }

    // Track when user manually changes entry type
    setupEntryTypeTracking() {
        const entryTypeSelect = document.getElementById('entry-type');
        entryTypeSelect.addEventListener('change', () => {
            entryTypeSelect.dataset.userChanged = 'true';
        });
    }

    setCurrentDate() {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        document.getElementById('commit-date').value = formattedDate;
    }

    updateEntriesList() {
        const entriesList = document.getElementById('entries-list');
        entriesList.innerHTML = '';

        // Add scroll container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'max-h-96 overflow-y-auto space-y-2';
        scrollContainer.id = 'entries-scroll-container';

        this.workEntries.forEach((entry, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'sortable-item p-3 bg-white border border-gray-200 rounded-md';
            entryElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 bg-${entry.statusColor}-500 rounded-full"></span>
                            <span class="font-mono text-xs text-gray-500">${entry.commitHash}</span>
                            <span class="text-xs text-gray-500">${entry.date}</span>
                        </div>
                        <h4 class="font-medium text-sm">${entry.entryType}: ${entry.title}</h4>
                        <p class="text-xs text-gray-600 mt-1">${entry.description.substring(0, 100)}${entry.description.length > 100 ? '...' : ''}</p>
                        <div class="flex gap-1 mt-2">
                            ${entry.tags.map(tag => `<span class="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="cms.editWorkEntry(${index})" class="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                        <button onclick="cms.deleteWorkEntry(${index})" class="text-red-600 hover:text-red-800 text-xs">Delete</button>
                    </div>
                </div>
            `;
            scrollContainer.appendChild(entryElement);
        });

        entriesList.appendChild(scrollContainer);

        // Add entry count info
        const countInfo = document.createElement('div');
        countInfo.className = 'text-xs text-gray-500 mt-2 text-center';
        countInfo.textContent = `${this.workEntries.length} entries loaded`;
        entriesList.appendChild(countInfo);

        // Make list sortable
        if (this.workEntries.length > 0) {
            new Sortable(scrollContainer, {
                animation: 150,
                onEnd: (evt) => {
                    const item = this.workEntries.splice(evt.oldIndex, 1)[0];
                    this.workEntries.splice(evt.newIndex, 0, item);
                    this.updatePreview();
                }
            });
        }
    }

    editWorkEntry(index) {
        const entry = this.workEntries[index];
        
        // Populate form with entry data
        document.getElementById('commit-hash').value = entry.commitHash;
        document.getElementById('commit-date').value = entry.date;
        document.getElementById('status-color').value = entry.statusColor;
        document.getElementById('entry-type').value = entry.entryType;
        document.getElementById('entry-title').value = entry.title;
        document.getElementById('entry-description').value = entry.description;
        
        // Populate tags
        document.getElementById('current-tags').innerHTML = '';
        entry.tags.forEach(tag => this.createTagElement(tag));
        
        // Remove the entry so it can be re-added
        this.deleteWorkEntry(index);
        
        // Scroll to form
        document.getElementById('work-entry-form').scrollIntoView({ behavior: 'smooth' });
    }

    deleteWorkEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.workEntries.splice(index, 1);
            this.updateEntriesList();
            this.updatePreview();
            this.showNotification('Entry deleted', 'success');
        }
    }

    updatePreview() {
        const preview = document.getElementById('work-preview');
        const title = document.getElementById('work-title').value || 'Build Log';
        const description = document.getElementById('work-description').value || 'Page description...';
        
        let html = `
            <div class="space-y-6">
                <div class="mb-6">
                    <h1 class="text-xl font-semibold text-gray-900 mb-2">${title}</h1>
                    <p class="text-gray-600 text-sm leading-relaxed">${description}</p>
                </div>
                <div class="space-y-4">
        `;

        this.workEntries.forEach(entry => {
            html += `
                <div class="border-l-2 border-gray-200 pl-4 pb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-1.5 h-1.5 bg-${entry.statusColor}-500 rounded-full -ml-5 border border-white"></div>
                        <span class="font-mono text-xs text-gray-500">${entry.commitHash}</span>
                        <span class="text-xs text-gray-500">•</span>
                        <span class="text-xs text-gray-500">${entry.date}</span>
                    </div>
                    <h3 class="font-medium text-gray-900 mb-1 text-sm">${entry.entryType}: ${entry.title}</h3>
                    <p class="text-gray-700 text-xs mb-2">${entry.description}</p>
                    <div class="flex gap-1">
                        ${entry.tags.map(tag => `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        preview.innerHTML = html;
    }

    async loadExistingWorkEntries() {
        try {
            // Fetch the actual work.html file
            const response = await fetch('./work.html');
            const htmlText = await response.text();
            
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            // Extract page title and description
            const titleElement = doc.querySelector('h1');
            const descriptionElement = doc.querySelector('.text-gray-600.text-base.leading-relaxed');
            
            if (titleElement) {
                document.getElementById('work-title').value = titleElement.textContent.trim();
            }
            if (descriptionElement) {
                document.getElementById('work-description').value = descriptionElement.textContent.trim();
            }
            
            // Extract all entry blocks
            const entryBlocks = doc.querySelectorAll('.border-l-2.border-gray-200');
            const entries = [];
            
            entryBlocks.forEach((block, index) => {
                try {
                    // Skip the academic section header and current status block
                    const heading = block.querySelector('h2');
                    const isCurrentStatus = block.classList.contains('bg-green-50');
                    if (heading || isCurrentStatus) return;
                    
                    // Extract commit hash
                    const commitHashElement = block.querySelector('.font-mono');
                    const commitHash = commitHashElement ? commitHashElement.textContent.trim() : `auto${index}`;
                    
                    // Extract date
                    const dateElements = block.querySelectorAll('.text-sm.text-gray-500');
                    let date = 'Unknown';
                    dateElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text !== '•' && !text.includes('auto') && text !== commitHash) {
                            date = text;
                        }
                    });
                    
                    // Extract status color from the dot
                    const dot = block.querySelector('[class*="bg-"][class*="-500"]');
                    let statusColor = 'green';
                    if (dot) {
                        const classes = dot.className;
                        if (classes.includes('bg-blue-500')) statusColor = 'blue';
                        else if (classes.includes('bg-yellow-500')) statusColor = 'yellow';
                        else if (classes.includes('bg-red-500')) statusColor = 'red';
                        else if (classes.includes('bg-purple-500')) statusColor = 'purple';
                    }
                    
                    // Extract title and entry type
                    const titleElement = block.querySelector('h3');
                    let fullTitle = titleElement ? titleElement.textContent.trim() : '';
                    let entryType = 'feat';
                    let title = fullTitle;
                    
                    // Parse entry type from title
                    const typeMatch = fullTitle.match(/^(feat|build|fix|docs|refactor|experiment|wip):\s*(.+)/);
                    if (typeMatch) {
                        entryType = typeMatch[1];
                        title = typeMatch[2];
                    }
                    
                    // Extract description
                    const descriptionElement = block.querySelector('p.text-gray-700');
                    const description = descriptionElement ? descriptionElement.textContent.trim() : '';
                    
                    // Extract tags
                    const tagElements = block.querySelectorAll('span[class*="px-2"][class*="py-1"]');
                    const tags = Array.from(tagElements).map(tag => tag.textContent.trim());
                    
                    // Create entry object
                    entries.push({
                        id: Date.now() + index,
                        commitHash: commitHash,
                        date: date,
                        statusColor: statusColor,
                        entryType: entryType,
                        title: title,
                        description: description,
                        tags: tags,
                        timestamp: new Date().toISOString()
                    });
                } catch (entryError) {
                    console.warn('Error parsing entry:', entryError);
                }
            });
            
            this.workEntries = entries;
            this.updateEntriesList();
            this.updatePreview();
            this.showNotification(`Loaded ${entries.length} entries from work.html`, 'success');
            
        } catch (error) {
            console.error('Error loading entries:', error);
            this.showNotification('Error loading entries: ' + error.message, 'error');
            
            // Fallback to sample data
            this.loadSampleEntries();
        }
    }

    loadSampleEntries() {
        // Fallback sample entries
        const sampleEntries = [
            {
                id: 1,
                commitHash: '3d2f8a1',
                date: 'Sep 3, 2025',
                statusColor: 'green',
                entryType: 'feat',
                title: 'auto-commit message generator using OpenAI API',
                description: 'Tired of writing "fix bug" for the 100th time. Built a tool that analyzes git diffs and suggests meaningful commit messages. It\'s surprisingly good at understanding what actually changed. Works with conventional commits format.',
                tags: ['Python', 'OpenAI API', 'CLI Tool'],
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                commitHash: 'a7b91c4',
                date: 'Aug 30, 2025',
                statusColor: 'blue',
                entryType: 'build',
                title: 'GPU price tracker with Sunday evening insights',
                description: 'Web scraper that tracks GPU prices across retailers. Not because I need a GPU, but curiosity about price patterns. Discovered prices drop significantly on Sunday evenings. Data visualization shows clear weekly cycles.',
                tags: ['Web Scraping', 'Data Viz', 'Python'],
                timestamp: new Date().toISOString()
            }
        ];

        this.workEntries = sampleEntries;
        this.updateEntriesList();
        this.updatePreview();
        this.showNotification('Loaded sample entries (could not fetch work.html)', 'info');
    }

    async exportHTML() {
        const title = document.getElementById('work-title').value;
        const description = document.getElementById('work-description').value;
        
        let entriesHTML = '';
        this.workEntries.forEach(entry => {
            entriesHTML += `
                            <div class="border-l-2 border-gray-200 pl-6 pb-6">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-2 h-2 bg-${entry.statusColor}-500 rounded-full -ml-7 border-2 border-white"></div>
                                    <span class="font-mono text-sm text-gray-500">${entry.commitHash}</span>
                                    <span class="text-sm text-gray-500">•</span>
                                    <span class="text-sm text-gray-500">${entry.date}</span>
                                </div>
                                <h3 class="font-medium text-gray-900 mb-2">${entry.entryType}: ${entry.title}</h3>
                                <p class="text-gray-700 text-sm mb-3">
                                    ${entry.description}
                                </p>
                                <div class="flex gap-2">
                                    ${entry.tags.map(tag => {
                                        const colorClass = this.getTagColorClass(tag);
                                        return `<span class="px-2 py-1 ${colorClass} text-xs rounded">${tag}</span>`;
                                    }).join('')}
                                </div>
                            </div>
            `;
        });

        // Generate complete HTML file
        const completeHTML = this.generateCompleteWorkHTML(title, description, entriesHTML);
        
        try {
            // Always try server-side save first
            const response = await fetch('/save-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: 'work.html',
                    content: completeHTML
                })
            });
            
            if (response.ok) {
                this.showNotification('✅ work.html saved to project directory!', 'success');
                return true;
            } else {
                throw new Error('Server save failed');
            }
        } catch (error) {
            // Fallback: download and show manual instructions
            this.showNotification('Server not available, downloading file...', 'info');
            this.downloadFile('work.html', completeHTML);
            this.showManualMoveInstructions();
            return false;
        }
    }

    generateCompleteWorkHTML(title, description, entriesHTML) {
        return `<!DOCTYPE html>
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
                            <h1 class="text-2xl font-semibold text-gray-900 mb-3">${title}</h1>
                            <p class="text-gray-600 text-base leading-relaxed">
                                ${description}
                            </p>
                        </div>
                        
                        <!-- Commit-style Entries -->
                        <div class="space-y-6">
                            ${entriesHTML}
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
    }

    async saveFileToCurrentDirectory(filename, content) {
        // Check if we have access to the File System Access API
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: 'HTML files',
                            accept: {
                                'text/html': ['.html'],
                            },
                        },
                    ],
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                return true;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error saving file:', error);
                }
                throw error;
            }
        } else {
            // Fallback: try to send to a local server endpoint
            try {
                const response = await fetch('/save-file', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: filename,
                        content: content
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Server save failed');
                }
                
                return true;
            } catch (error) {
                throw new Error('File System Access API not supported and no server endpoint available');
            }
        }
    }

    async backupData() {
        const data = {
            workEntries: this.workEntries,
            pageSettings: {
                title: document.getElementById('work-title').value,
                description: document.getElementById('work-description').value
            },
            timestamp: new Date().toISOString()
        };
        
        const jsonContent = JSON.stringify(data, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `cms-backup-${timestamp}.json`;
        
        try {
            // Try server-side save first
            const response = await fetch('/save-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: filename,
                    content: jsonContent
                })
            });
            
            if (response.ok) {
                this.showNotification(`✅ Backup saved as ${filename}`, 'success');
            } else {
                throw new Error('Server save failed');
            }
        } catch (error) {
            // Fallback to browser download
            this.downloadFile(filename, jsonContent);
            this.showNotification('Backup downloaded to Downloads folder', 'info');
        }
    }

    getTagColorClass(tag) {
        const colorMap = {
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
            'Iframe': 'bg-purple-100 text-purple-700',
            'Failed Experiment': 'bg-red-100 text-red-700',
            'Git Analysis': 'bg-blue-100 text-blue-700',
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
        };
        
        return colorMap[tag] || 'bg-gray-100 text-gray-700';
    }

    async autoCommitAndPush() {
        try {
            // First export the HTML
            this.showNotification('Exporting HTML...', 'info');
            const exportSuccess = await this.exportHTML();
            
            if (!exportSuccess) {
                // Show manual workflow if export failed
                this.showManualWorkflowInstructions();
                return;
            }
            
            // Then attempt to run git commit via server
            this.showNotification('Running git commit...', 'info');
            
            try {
                const response = await fetch('/git-commit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `feat: update work log entries via CMS (${new Date().toISOString().split('T')[0]})`
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('🎉 Changes committed and pushed successfully!', 'success');
                    
                    // Show success details
                    this.showSuccessMessage('Your changes are live! The work.html file has been updated and pushed to GitHub.');
                } else {
                    throw new Error('Git commit via server failed');
                }
            } catch (serverError) {
                // Show manual git instructions
                this.showNotification('File saved! Run git commands manually.', 'info');
                this.showManualGitInstructions();
            }
            
        } catch (error) {
            this.showNotification('Error in auto-commit workflow: ' + error.message, 'error');
        }
    }

    showManualMoveInstructions() {
        const instruction = document.createElement('div');
        instruction.className = 'fixed top-20 right-4 bg-yellow-50 border border-yellow-300 rounded-lg shadow-lg p-4 max-w-md z-50';
        instruction.innerHTML = `
            <h4 class="font-medium text-yellow-900 mb-2">📁 Manual File Move Required</h4>
            <div class="text-sm text-yellow-800 space-y-2">
                <p>The work.html file was downloaded to your Downloads folder.</p>
                <p><strong>Next steps:</strong></p>
                <ol class="list-decimal list-inside space-y-1">
                    <li>Move the downloaded work.html to this project folder</li>
                    <li>Run: <code class="bg-yellow-100 px-1 rounded">python3 git_commit.py</code></li>
                </ol>
                <p class="text-xs mt-2">Or start the server with: <code class="bg-yellow-100 px-1 rounded">python3 cms_server.py</code></p>
            </div>
            <button onclick="this.parentElement.remove()" class="mt-2 text-xs text-yellow-600 hover:text-yellow-800">Close</button>
        `;
        document.body.appendChild(instruction);
        
        setTimeout(() => {
            if (instruction.parentNode) {
                instruction.parentNode.removeChild(instruction);
            }
        }, 15000);
    }

    showManualWorkflowInstructions() {
        const instruction = document.createElement('div');
        instruction.className = 'fixed top-20 right-4 bg-blue-50 border border-blue-300 rounded-lg shadow-lg p-4 max-w-md z-50';
        instruction.innerHTML = `
            <h4 class="font-medium text-blue-900 mb-2">📋 Manual Workflow</h4>
            <div class="text-sm text-blue-800 space-y-2">
                <p>Server not available. Complete manually:</p>
                <ol class="list-decimal list-inside space-y-1">
                    <li>✅ File downloaded to Downloads</li>
                    <li>Move work.html to project folder</li>
                    <li>Run: <code class="bg-blue-100 px-1 rounded">python3 git_commit.py</code></li>
                </ol>
            </div>
            <button onclick="this.parentElement.remove()" class="mt-2 text-xs text-blue-600 hover:text-blue-800">Close</button>
        `;
        document.body.appendChild(instruction);
    }

    showManualGitInstructions() {
        const instruction = document.createElement('div');
        instruction.className = 'fixed top-20 right-4 bg-green-50 border border-green-300 rounded-lg shadow-lg p-4 max-w-md z-50';
        instruction.innerHTML = `
            <h4 class="font-medium text-green-900 mb-2">✅ File Saved! Complete with Git</h4>
            <div class="text-sm text-green-800 space-y-2">
                <p>work.html updated in project directory.</p>
                <p><strong>Complete the deployment:</strong></p>
                <div class="bg-green-100 rounded p-2 font-mono text-xs">
                    python3 git_commit.py
                </div>
                <p class="text-xs">This will commit and push your changes.</p>
            </div>
            <button onclick="this.parentElement.remove()" class="mt-2 text-xs text-green-600 hover:text-green-800">Close</button>
        `;
        document.body.appendChild(instruction);
    }

    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 bg-green-50 border border-green-300 rounded-lg shadow-lg p-4 max-w-md z-50';
        notification.innerHTML = `
            <h4 class="font-medium text-green-900 mb-2">🎉 Success!</h4>
            <p class="text-sm text-green-800">${message}</p>
            <button onclick="this.parentElement.remove()" class="mt-2 text-xs text-green-600 hover:text-green-800">Close</button>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 8000);
    }

    importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.workEntries) {
                    this.workEntries = data.workEntries;
                    this.updateEntriesList();
                    this.updatePreview();
                }
                
                if (data.pageSettings) {
                    document.getElementById('work-title').value = data.pageSettings.title || '';
                    document.getElementById('work-description').value = data.pageSettings.description || '';
                }
                
                this.showNotification('Data imported successfully!', 'success');
            } catch (error) {
                this.showNotification('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
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

// Initialize CMS when page loads
let cms;
document.addEventListener('DOMContentLoaded', () => {
    cms = new CMSManager();
});
