/**
 * Photography Gallery - Dynamic loader with commit-style entries
 * Loads photos from photos.json with lazy loading and pagination
 */

class PhotoGallery {
    constructor(options = {}) {
        this.containerId = options.containerId || 'photoContainer';
        this.equipmentId = options.equipmentId || 'equipmentSection';
        this.loadMoreId = options.loadMoreId || 'loadMoreBtn';
        this.jsonPath = options.jsonPath || 'photos.json';
        
        this.albums = [];
        this.settings = {};
        this.equipment = {};
        this.currentPage = 0;
        this.albumsPerPage = 10;
        this.isLoading = false;
        
        this.statusColors = {
            'green': 'bg-green-500',
            'blue': 'bg-blue-500',
            'orange': 'bg-orange-500',
            'yellow': 'bg-yellow-500',
            'red': 'bg-red-500',
            'purple': 'bg-purple-500'
        };
        
        this.tagColors = {
            'Street Photography': { bg: 'bg-orange-100', text: 'text-orange-700' },
            'Landscape': { bg: 'bg-green-100', text: 'text-green-700' },
            'Golden Hour': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            'Long Exposure': { bg: 'bg-purple-100', text: 'text-purple-700' },
            'Architecture': { bg: 'bg-blue-100', text: 'text-blue-700' },
            'Weather': { bg: 'bg-red-100', text: 'text-red-700' },
            'Tech Documentation': { bg: 'bg-blue-100', text: 'text-blue-700' },
            'Workspace': { bg: 'bg-purple-100', text: 'text-purple-700' },
            'Ambient Light': { bg: 'bg-gray-100', text: 'text-gray-700' }
        };
        
        this.defaultTagColor = { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
    
    async init() {
        console.log('PhotoGallery: Initializing...');
        try {
            await this.loadData();
            console.log('PhotoGallery: Data loaded, albums:', this.albums.length);
            this.renderInitialAlbums();
            this.renderEquipment();
            this.setupLoadMore();
            this.setupLightbox();
            this.setupLazyLoading();
            console.log('PhotoGallery: Initialization complete');
        } catch (error) {
            console.error('PhotoGallery: Failed to initialize:', error);
            this.showError();
        }
    }
    
    async loadData() {
        console.log('PhotoGallery: Loading data from', this.jsonPath);
        const response = await fetch(this.jsonPath);
        if (!response.ok) {
            console.error('PhotoGallery: Failed to fetch JSON:', response.status, response.statusText);
            throw new Error('Failed to load photos.json');
        }
        
        const data = await response.json();
        console.log('PhotoGallery: JSON data loaded:', data);
        this.albums = data.albums || [];
        this.settings = data.settings || {};
        this.equipment = data.equipment || {};
        this.albumsPerPage = this.settings.albumsPerPage || 10;
    }
    
    getImageUrl(photo) {
        // If a direct URL is provided, use it (works with Google Photos lh3 URLs)
        if (photo.url && photo.url.trim() !== '' && !photo.url.includes('photos.google.com/share/')) {
            // Google Photos URLs can have size parameters, ensure good quality
            let url = photo.url;
            if (url.includes('lh3.googleusercontent.com')) {
                // Remove any existing size params and add high quality
                url = url.replace(/=w\d+-h\d+.*$/, '');
                url = url.replace(/=s\d+.*$/, '');
                // Add reasonable size for gallery (800px width)
                if (!url.includes('=')) {
                    url += '=w800';
                }
            }
            return url;
        }
        
        // If a Google Drive ID is provided, construct the URL
        if (photo.driveId && !photo.driveId.startsWith('REPLACE')) {
            return `https://drive.google.com/uc?export=view&id=${photo.driveId}`;
        }
        
        // Legacy support for 'id' field as Drive ID
        if (photo.id && !photo.id.startsWith('REPLACE') && !photo.id.startsWith('PHOTO')) {
            return `https://drive.google.com/uc?export=view&id=${photo.id}`;
        }
        
        console.log('PhotoGallery: No valid URL found for photo:', photo.title);
        // Return placeholder
        return null;
    }
    
    // Get high-res URL for lightbox
    getHighResUrl(photo) {
        if (photo.url && photo.url.includes('lh3.googleusercontent.com')) {
            // For lightbox, use larger size
            let url = photo.url;
            url = url.replace(/=w\d+-h\d+.*$/, '');
            url = url.replace(/=s\d+.*$/, '');
            url = url.replace(/=w\d+$/, '');
            return url + '=w1600';
        }
        return this.getImageUrl(photo);
    }
    
    getTagColor(tag) {
        return this.tagColors[tag] || this.defaultTagColor;
    }
    
    renderAlbum(album, animate = false) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const statusColorClass = this.statusColors[album.statusColor] || 'bg-gray-500';
        const animationClass = animate ? 'album-animate-in' : '';
        
        const albumHtml = `
            <div class="album-entry ${animationClass} border-l-2 border-gray-200 pl-6 pb-6" data-album-id="${album.id}">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-2 h-2 ${statusColorClass} rounded-full -ml-7 border-2 border-white"></div>
                    <span class="font-mono text-sm text-gray-500">${album.commitHash}</span>
                    <span class="text-sm text-gray-500">•</span>
                    <span class="text-sm text-gray-500">${album.date}</span>
                    <span class="text-sm text-gray-500">•</span>
                    <span class="text-sm text-gray-500">${album.location}</span>
                </div>
                <h3 class="font-medium text-gray-900 mb-2">
                    ${album.entryType}: ${album.title}
                </h3>
                <p class="text-gray-700 text-sm mb-4">
                    ${album.description}
                </p>
                
                <div class="photo-grid mb-4">
                    ${album.photos.map(photo => this.renderPhoto(photo)).join('')}
                </div>
                
                <div class="flex flex-wrap gap-2">
                    ${album.tags.map(tag => {
                        const color = this.getTagColor(tag);
                        return `<span class="px-2 py-1 ${color.bg} ${color.text} text-xs rounded">${tag}</span>`;
                    }).join('')}
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', albumHtml);
    }
    
    renderPhoto(photo) {
        const imageUrl = this.getImageUrl(photo);
        const highResUrl = this.getHighResUrl(photo);
        const hasImage = imageUrl !== null;
        
        // Escape quotes in title for onclick handler
        const escapedTitle = (photo.title || '').replace(/'/g, "\\'");
        
        if (hasImage) {
            return `
                <div class="photo-item" onclick="gallery.openLightbox('${highResUrl}', '${escapedTitle}')">
                    <img 
                        src="${imageUrl}" 
                        alt="${photo.title}"
                        loading="lazy"
                        onerror="this.parentElement.innerHTML = gallery.getPlaceholderHtml('${escapedTitle}')"
                    >
                    <div class="photo-overlay">
                        <h3>${photo.title}</h3>
                        <p>${photo.settings}</p>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="photo-item photo-placeholder">
                    <div class="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4">
                        <svg class="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span class="text-gray-400 text-sm text-center">${photo.title}</span>
                    </div>
                    <div class="photo-overlay">
                        <h3>${photo.title}</h3>
                        <p>${photo.settings}</p>
                    </div>
                </div>
            `;
        }
    }
    
    getPlaceholderHtml(title) {
        return `
            <div class="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4">
                <svg class="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="text-gray-400 text-sm text-center">${title}</span>
            </div>
            <div class="photo-overlay">
                <h3>${title}</h3>
            </div>
        `;
    }
    
    renderInitialAlbums() {
        console.log('PhotoGallery: Rendering initial albums...');
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('PhotoGallery: Container not found:', this.containerId);
            return;
        }
        
        console.log('PhotoGallery: Clearing container and rendering', this.albumsPerPage, 'albums');
        // Clear any existing content (including skeleton)
        container.innerHTML = '';
        
        // Render first page of albums
        const initialAlbums = this.albums.slice(0, this.albumsPerPage);
        console.log('PhotoGallery: Initial albums to render:', initialAlbums);
        
        if (initialAlbums.length === 0) {
            console.warn('PhotoGallery: No albums to render');
            this.showError('No photos found');
            return;
        }
        
        initialAlbums.forEach((album, index) => {
            console.log('PhotoGallery: Rendering album', index + 1, ':', album.title);
            this.renderAlbum(album, false);
        });
        
        this.currentPage = 1;
        this.updateLoadMoreButton();
        console.log('PhotoGallery: Initial render complete');
    }
    
    renderEquipment() {
        const container = document.getElementById(this.equipmentId);
        if (!container || !this.equipment) return;
        
        const equipmentHtml = `
            <h2 class="text-lg font-semibold text-gray-900 mb-4">📷 Current Stack</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                ${Object.entries(this.equipment).map(([key, item]) => `
                    <div>
                        <h3 class="font-medium text-gray-900 mb-2">${this.formatEquipmentLabel(key)}</h3>
                        <p class="text-gray-600">${item.name}</p>
                        <p class="text-gray-500 text-xs">${item.details}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = equipmentHtml;
    }
    
    formatEquipmentLabel(key) {
        const labels = {
            'camera': 'Camera Body',
            'lens': 'Primary Lens',
            'postProcessing': 'Post-Processing',
            'philosophy': 'Philosophy'
        };
        return labels[key] || key;
    }
    
    setupLoadMore() {
        const btn = document.getElementById(this.loadMoreId);
        if (!btn) return;
        
        btn.addEventListener('click', () => this.loadMore());
    }
    
    async loadMore() {
        if (this.isLoading) return;
        
        const btn = document.getElementById(this.loadMoreId);
        const btnText = btn.querySelector('#loadMoreText');
        const spinner = btn.querySelector('#loadMoreSpinner');
        
        this.isLoading = true;
        btn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';
        
        // Simulate network delay for smooth UX
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
        
        const startIndex = this.currentPage * this.albumsPerPage;
        const endIndex = startIndex + this.albumsPerPage;
        const nextAlbums = this.albums.slice(startIndex, endIndex);
        
        nextAlbums.forEach(album => this.renderAlbum(album, true));
        
        this.currentPage++;
        this.isLoading = false;
        
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        btn.disabled = false;
        
        this.updateLoadMoreButton();
        
        // Scroll to newly loaded content
        if (nextAlbums.length > 0) {
            const firstNew = document.querySelector(`[data-album-id="${nextAlbums[0].id}"]`);
            if (firstNew) {
                setTimeout(() => {
                    firstNew.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    }
    
    updateLoadMoreButton() {
        const btn = document.getElementById(this.loadMoreId);
        const btnText = btn?.querySelector('#loadMoreText');
        const container = btn?.parentElement;
        
        const hasMore = this.currentPage * this.albumsPerPage < this.albums.length;
        
        if (!hasMore && container) {
            container.style.display = 'none';
        } else if (btnText) {
            const remaining = this.albums.length - (this.currentPage * this.albumsPerPage);
            btnText.textContent = `git pull --more-photos (${remaining} remaining)`;
        }
    }
    
    setupLightbox() {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;
        
        // Close on background click
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
                this.closeLightbox();
            }
        });
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeLightbox();
        });
    }
    
    openLightbox(imageUrl, title) {
        const lightbox = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        
        if (lightbox && img) {
            img.src = imageUrl;
            img.alt = title || 'Photo';
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    setupLazyLoading() {
        if (!('IntersectionObserver' in window)) return;
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe photo items as they're added
        const observeNewItems = () => {
            document.querySelectorAll('.photo-item:not(.observed)').forEach(item => {
                item.classList.add('observed');
                this.observer.observe(item);
            });
        };
        
        // Initial observation
        observeNewItems();
        
        // Re-observe after load more
        const originalLoadMore = this.loadMore.bind(this);
        this.loadMore = async () => {
            await originalLoadMore();
            setTimeout(observeNewItems, 100);
        };
    }
    
    showError(message = 'Failed to load photos. Please try refreshing the page.') {
        console.error('PhotoGallery: Showing error:', message);
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-gray-500">${message}</p>
                </div>
            `;
        }
    }
}

// Initialize gallery when DOM is ready
let gallery;
document.addEventListener('DOMContentLoaded', () => {
    gallery = new PhotoGallery();
    gallery.init();
});
