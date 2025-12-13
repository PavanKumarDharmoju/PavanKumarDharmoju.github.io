/**
 * Photography CMS - Manage photo albums for photography.html
 * Works with photos.json structure
 */

class PhotographyCMS {
    constructor() {
        this.albums = [];
        this.settings = {};
        this.equipment = {};
        this.currentEditingId = null;
        this.serverAvailable = false;
        
        this.statusColors = [
            { value: 'green', label: 'Green (Success/Nature)', color: '#10B981' },
            { value: 'blue', label: 'Blue (Info/Tech)', color: '#3B82F6' },
            { value: 'orange', label: 'Orange (Street Photography)', color: '#F59E0B' },
            { value: 'yellow', label: 'Yellow (Warning/Sunset)', color: '#EAB308' },
            { value: 'red', label: 'Red (Error/Dramatic)', color: '#EF4444' },
            { value: 'purple', label: 'Purple (Creative/Art)', color: '#8B5CF6' }
        ];
        
        this.entryTypes = [
            'feat', 'build', 'fix', 'docs', 'style', 'refactor', 
            'test', 'chore', 'experiment', 'merge'
        ];
        
        this.tagSuggestions = [
            'Street Photography', 'Landscape', 'Portrait', 'Architecture',
            'Golden Hour', 'Blue Hour', 'Long Exposure', 'Black & White',
            'Sony A7 III', 'Canon EOS R6', 'Nikon Z6', 'Fujifilm X-T4',
            '24-70mm', '50mm', '85mm', '16-35mm', '70-200mm',
            'Chicago', 'Nature', 'Urban', 'Travel', 'Ambient Light'
        ];
    }
    
    async init() {
        console.log('PhotographyCMS: Initializing...');
        await this.checkServerStatus();
        await this.loadData();
        this.setupEventListeners();
        this.populateForm();
        this.updateEntriesList();
        this.updatePreview();
        console.log('PhotographyCMS: Ready');
    }
    
    async checkServerStatus() {
        try {
            const response = await fetch('/');
            this.serverAvailable = response.ok;
        } catch (error) {
            this.serverAvailable = false;
        }
        
        const statusEl = document.getElementById('photography-server-status');
        if (statusEl) {
            if (this.serverAvailable) {
                statusEl.textContent = '✅ Server running - Direct save enabled';
                statusEl.className = 'text-sm text-green-800';
            } else {
                statusEl.textContent = '❌ No server - Files will download';
                statusEl.className = 'text-sm text-orange-800';
            }
        }
    }
    
    async loadData() {
        try {
            const response = await fetch('photos.json');
            if (response.ok) {
                const data = await response.json();
                this.albums = data.albums || [];
                this.settings = data.settings || {};
                this.equipment = data.equipment || {};
                console.log('PhotographyCMS: Loaded', this.albums.length, 'albums');
            }
        } catch (error) {
            console.error('PhotographyCMS: Failed to load data:', error);
            this.albums = [];
        }
    }
    
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('photography-entry-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addOrUpdateAlbum();
            });
        }
        
        // Generate hash button
        const hashBtn = document.getElementById('photography-generate-hash');
        if (hashBtn) {
            hashBtn.addEventListener('click', () => {
                document.getElementById('photography-commit-hash').value = this.generateHash();
            });
        }
        
        // Today button
        const todayBtn = document.getElementById('photography-today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                document.getElementById('photography-commit-date').value = this.getTodayString();
            });
        }
        
        // Tag input
        this.setupTagInput();
        
        // Photo management
        this.setupPhotoManagement();
        
        // Action buttons
        this.setupActionButtons();
        
        // Clear form
        const clearBtn = document.getElementById('photography-clear-form-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearForm());
        }
    }
    
    setupTagInput() {
        const tagInput = document.getElementById('photography-tags-input');
        const tagsList = document.getElementById('photography-tags-list');
        
        if (tagInput) {
            // Create datalist for suggestions
            let datalist = document.getElementById('photography-tags-datalist');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'photography-tags-datalist';
                this.tagSuggestions.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    datalist.appendChild(option);
                });
                tagInput.parentNode.appendChild(datalist);
                tagInput.setAttribute('list', 'photography-tags-datalist');
            }
            
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTag(tagInput.value.trim());
                    tagInput.value = '';
                }
            });
        }
    }
    
    setupPhotoManagement() {
        const addPhotoBtn = document.getElementById('photography-add-photo-btn');
        if (addPhotoBtn) {
            addPhotoBtn.addEventListener('click', () => this.addPhotoField());
        }
    }
    
    setupActionButtons() {
        const exportBtn = document.getElementById('photography-export-only-btn');
        const autoCommitBtn = document.getElementById('photography-auto-commit-btn');
        const backupBtn = document.getElementById('photography-backup-data-btn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPhotosJSON());
        }
        
        if (autoCommitBtn) {
            autoCommitBtn.addEventListener('click', () => this.exportAndCommit());
        }
        
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.backupData());
        }
    }
    
    populateForm() {
        // Set default values
        document.getElementById('photography-commit-hash').value = this.generateHash();
        document.getElementById('photography-commit-date').value = this.getTodayString();
        document.getElementById('photography-title').value = 'Visual Commit Log';
        document.getElementById('photography-description').value = 
            'Capturing moments between building systems. Street scenes, landscapes, and life through the lens of a developer who sees the world in frames and functions.';
    }
    
    addPhotoField() {
        const container = document.getElementById('photography-photos-container');
        if (!container) return;
        
        const photoIndex = container.children.length;
        const photoHtml = `
            <div class="photo-entry bg-gray-50 p-3 rounded border" data-photo-index="${photoIndex}">
                <div class="flex justify-between items-center mb-2">
                    <h5 class="font-medium">Photo ${photoIndex + 1}</h5>
                    <button type="button" class="text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.parentElement.remove()">
                        Remove
                    </button>
                </div>
                <div class="space-y-2">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Google Photos URL (lh3.googleusercontent.com)</label>
                        <input type="url" class="photo-url w-full p-2 text-xs border border-gray-300 rounded" 
                               placeholder="https://lh3.googleusercontent.com/pw/...">
                        <p class="text-xs text-blue-600 mt-1">💡 Right-click on Google Photos shared image → Copy image address</p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" class="photo-title w-full p-2 text-xs border border-gray-300 rounded" 
                                   placeholder="Photo title">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Camera Settings</label>
                            <input type="text" class="photo-settings w-full p-2 text-xs border border-gray-300 rounded" 
                                   placeholder="f/2.8 • 1/125s • ISO 400">
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', photoHtml);
    }
    
    addTag(tagText) {
        if (!tagText) return;
        
        const tagsList = document.getElementById('photography-tags-list');
        if (!tagsList) return;
        
        // Check if tag already exists
        const existingTags = Array.from(tagsList.querySelectorAll('.tag')).map(el => el.textContent.trim());
        if (existingTags.includes(tagText)) return;
        
        const tagEl = document.createElement('span');
        tagEl.className = 'tag inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1 mb-1';
        tagEl.innerHTML = `
            ${tagText}
            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="this.parentElement.remove()">×</button>
        `;
        tagsList.appendChild(tagEl);
    }
    
    addOrUpdateAlbum() {
        console.log('PhotographyCMS: Adding/updating album...');
        const formData = this.getFormData();
        if (!formData) {
            console.log('PhotographyCMS: Form data validation failed');
            return;
        }
        
        console.log('PhotographyCMS: Form data valid:', formData);
        
        if (this.currentEditingId) {
            // Update existing
            const index = this.albums.findIndex(a => a.id === this.currentEditingId);
            if (index !== -1) {
                this.albums[index] = { ...formData, id: this.currentEditingId };
                console.log('PhotographyCMS: Updated existing album at index', index);
            }
            this.currentEditingId = null;
        } else {
            // Add new
            formData.id = this.generateId();
            this.albums.unshift(formData); // Add to beginning
            console.log('PhotographyCMS: Added new album with ID:', formData.id);
        }
        
        console.log('PhotographyCMS: Total albums now:', this.albums.length);
        
        this.clearForm();
        this.updateEntriesList();
        this.updatePreview();
        
        // Show success message
        this.showMessage('Album added successfully!', 'success');
    }
    
    getFormData() {
        const commitHash = document.getElementById('photography-commit-hash').value.trim();
        const date = document.getElementById('photography-commit-date').value.trim();
        const location = document.getElementById('photography-location').value.trim();
        const statusColor = document.getElementById('photography-status-color').value;
        const entryType = document.getElementById('photography-entry-type').value;
        const title = document.getElementById('photography-album-title').value.trim();
        const description = document.getElementById('photography-description-text').value.trim();
        
        console.log('PhotographyCMS: Getting form data...');
        console.log('PhotographyCMS: Title:', title);
        console.log('PhotographyCMS: Description:', description);
        
        if (!commitHash || !date || !title || !description) {
            this.showMessage('Please fill in all required fields', 'error');
            return null;
        }
        
        // Get tags
        const tags = Array.from(document.querySelectorAll('#photography-tags-list .tag'))
            .map(el => el.textContent.trim().replace('×', ''));
        
        console.log('PhotographyCMS: Tags:', tags);
        
        // Get photos
        const photoEntries = document.querySelectorAll('#photography-photos-container .photo-entry');
        console.log('PhotographyCMS: Found', photoEntries.length, 'photo entries');
        
        const photos = Array.from(photoEntries)
            .map((entry, index) => {
                const url = entry.querySelector('.photo-url').value.trim();
                const title = entry.querySelector('.photo-title').value.trim();
                const settings = entry.querySelector('.photo-settings').value.trim();
                
                console.log(`PhotographyCMS: Photo ${index + 1}:`, { url, title, settings });
                
                return { url, title, settings };
            })
            .filter(photo => {
                const hasUrl = photo.url.length > 0;
                const hasTitle = photo.title.length > 0;
                console.log('PhotographyCMS: Photo validation:', { hasUrl, hasTitle, photo });
                return hasUrl && hasTitle;
            });
        
        console.log('PhotographyCMS: Valid photos:', photos.length, photos);
        
        if (photos.length === 0) {
            this.showMessage('Please add at least one photo with URL and title', 'error');
            return null;
        }
        
        return {
            commitHash,
            date,
            location,
            statusColor,
            entryType,
            title,
            description,
            tags,
            photos
        };
    }
    
    updateEntriesList() {
        const container = document.getElementById('photography-entries-list');
        if (!container) return;
        
        if (this.albums.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No albums yet. Add your first photo album!</p>';
            return;
        }
        
        container.innerHTML = this.albums.map((album, index) => `
            <div class="sortable-item bg-white p-3 border border-gray-200 rounded">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${this.getStatusColor(album.statusColor)}"></span>
                            <span class="font-mono">${album.commitHash}</span>
                            <span>•</span>
                            <span>${album.date}</span>
                            <span>•</span>
                            <span>${album.location}</span>
                        </div>
                        <h4 class="font-medium text-sm">${album.entryType}: ${album.title}</h4>
                        <p class="text-xs text-gray-600 mt-1 line-clamp-2">${album.description}</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-xs text-gray-500">${album.photos.length} photo${album.photos.length !== 1 ? 's' : ''}</span>
                            <div class="flex gap-1">
                                ${album.tags.slice(0, 3).map(tag => 
                                    `<span class="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">${tag}</span>`
                                ).join('')}
                                ${album.tags.length > 3 ? `<span class="text-xs text-gray-500">+${album.tags.length - 3}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 ml-2">
                        <button onclick="photographyCMS.editAlbum('${album.id}')" 
                                class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                            Edit
                        </button>
                        <button onclick="photographyCMS.deleteAlbum('${album.id}')" 
                                class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    editAlbum(albumId) {
        const album = this.albums.find(a => a.id === albumId);
        if (!album) return;
        
        this.currentEditingId = albumId;
        
        // Populate form with album data
        document.getElementById('photography-commit-hash').value = album.commitHash;
        document.getElementById('photography-commit-date').value = album.date;
        document.getElementById('photography-location').value = album.location;
        document.getElementById('photography-status-color').value = album.statusColor;
        document.getElementById('photography-entry-type').value = album.entryType;
        document.getElementById('photography-album-title').value = album.title;
        document.getElementById('photography-description-text').value = album.description;
        
        // Clear and populate tags
        document.getElementById('photography-tags-list').innerHTML = '';
        album.tags.forEach(tag => this.addTag(tag));
        
        // Clear and populate photos
        document.getElementById('photography-photos-container').innerHTML = '';
        album.photos.forEach(photo => {
            this.addPhotoField();
            const lastEntry = document.querySelector('#photography-photos-container .photo-entry:last-child');
            lastEntry.querySelector('.photo-url').value = photo.url;
            lastEntry.querySelector('.photo-title').value = photo.title;
            lastEntry.querySelector('.photo-settings').value = photo.settings;
        });
        
        // Update form button
        const submitBtn = document.querySelector('#photography-entry-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Update Album';
        }
        
        // Scroll to form
        document.getElementById('photography-entry-form').scrollIntoView({ behavior: 'smooth' });
    }
    
    deleteAlbum(albumId) {
        if (!confirm('Are you sure you want to delete this album?')) return;
        
        this.albums = this.albums.filter(a => a.id !== albumId);
        this.updateEntriesList();
        this.updatePreview();
        this.showMessage('Album deleted', 'success');
    }
    
    clearForm() {
        document.getElementById('photography-entry-form').reset();
        document.getElementById('photography-tags-list').innerHTML = '';
        document.getElementById('photography-photos-container').innerHTML = '';
        this.currentEditingId = null;
        
        // Reset defaults
        this.populateForm();
        
        // Add one photo field
        this.addPhotoField();
        
        // Reset button text
        const submitBtn = document.querySelector('#photography-entry-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Add Album';
        }
    }
    
    updatePreview() {
        const preview = document.getElementById('photography-preview');
        if (!preview) return;
        
        const albums = this.albums.slice(0, 2); // Show first 2 albums in preview
        
        preview.innerHTML = `
            <div class="bg-white p-6 rounded border">
                <h3 class="text-lg font-semibold mb-4">Visual Commit Log</h3>
                <div class="space-y-6">
                    ${albums.map(album => `
                        <div class="border-l-2 border-gray-200 pl-6 pb-6">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-2 h-2 rounded-full -ml-7 border-2 border-white" style="background-color: ${this.getStatusColor(album.statusColor)}"></div>
                                <span class="font-mono text-sm text-gray-500">${album.commitHash}</span>
                                <span class="text-sm text-gray-500">•</span>
                                <span class="text-sm text-gray-500">${album.date}</span>
                                <span class="text-sm text-gray-500">•</span>
                                <span class="text-sm text-gray-500">${album.location}</span>
                            </div>
                            <h4 class="font-medium text-gray-900 mb-2">${album.entryType}: ${album.title}</h4>
                            <p class="text-gray-700 text-sm mb-4">${album.description}</p>
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                ${album.photos.slice(0, 4).map(photo => `
                                    <div class="aspect-video bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                                        ${photo.url ? `<img src="${photo.url}" alt="${photo.title}" class="w-full h-full object-cover rounded" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                                        <span style="display:none">${photo.title}</span>` : photo.title}
                                    </div>
                                `).join('')}
                            </div>
                            <div class="flex gap-1 flex-wrap">
                                ${album.tags.map(tag => `
                                    <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${tag}</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                    ${this.albums.length > 2 ? `<p class="text-gray-500 text-sm text-center">... and ${this.albums.length - 2} more albums</p>` : ''}
                </div>
            </div>
        `;
    }
    
    async exportPhotosJSON() {
        const data = {
            settings: this.settings,
            equipment: this.equipment,
            albums: this.albums
        };
        
        if (this.serverAvailable) {
            try {
                const response = await fetch('/save-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: 'photos.json',
                        content: JSON.stringify(data, null, 2)
                    })
                });
                
                if (response.ok) {
                    this.showMessage('✅ photos.json saved successfully!', 'success');
                    return true;
                } else {
                    throw new Error('Server save failed');
                }
            } catch (error) {
                console.error('Server save failed, falling back to download:', error);
            }
        }
        
        // Fallback to download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'photos.json';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('📁 photos.json downloaded', 'info');
        return false;
    }
    
    async exportAndCommit() {
        const saved = await this.exportPhotosJSON();
        
        if (saved && this.serverAvailable) {
            // Trigger git commit
            try {
                const response = await fetch('/git-commit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `feat: update photography gallery with ${this.albums.length} albums`
                    })
                });
                
                if (response.ok) {
                    this.showMessage('🚀 Photography updated and committed!', 'success');
                } else {
                    this.showMessage('✅ File saved, but commit failed', 'warning');
                }
            } catch (error) {
                this.showMessage('✅ File saved, commit manually with git_commit.py', 'warning');
            }
        }
    }
    
    backupData() {
        const backup = {
            albums: this.albums,
            settings: this.settings,
            equipment: this.equipment,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photography-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('📦 Backup created', 'success');
    }
    
    // Utility methods
    generateHash() {
        return Math.random().toString(36).substring(2, 9);
    }
    
    generateId() {
        return Date.now().toString();
    }
    
    getTodayString() {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }
    
    getStatusColor(color) {
        const colorMap = {
            'green': '#10B981',
            'blue': '#3B82F6',
            'orange': '#F59E0B',
            'yellow': '#EAB308',
            'red': '#EF4444',
            'purple': '#8B5CF6'
        };
        return colorMap[color] || '#6B7280';
    }
    
    showMessage(message, type = 'info') {
        console.log(`PhotographyCMS [${type}]:`, message);
        
        // Create toast notification
        const toast = document.createElement('div');
        const bgColor = {
            'success': 'bg-green-100 border-green-500 text-green-700',
            'error': 'bg-red-100 border-red-500 text-red-700',
            'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700',
            'info': 'bg-blue-100 border-blue-500 text-blue-700'
        }[type] || 'bg-gray-100 border-gray-500 text-gray-700';
        
        toast.className = `fixed top-4 right-4 p-4 border-l-4 rounded shadow-lg z-50 max-w-sm ${bgColor}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize when DOM is ready
let photographyCMS;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('photography-tab')) {
        photographyCMS = new PhotographyCMS();
        
        // Initialize when photography tab is first clicked
        const photographyTab = document.querySelector('[data-tab="photography"]');
        if (photographyTab) {
            photographyTab.addEventListener('click', () => {
                if (!photographyCMS.initialized) {
                    photographyCMS.init();
                    photographyCMS.initialized = true;
                }
            });
        }
    }
});