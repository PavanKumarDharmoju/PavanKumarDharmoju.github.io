/**
 * Enhanced Photography Gallery - Modern photo viewer with advanced features
 * Features: Zoom, touch/swipe support, keyboard navigation, fullscreen, sharing
 */

class EnhancedPhotoGallery {
    constructor(options = {}) {
        this.containerId = options.containerId || 'photoContainer';
        this.equipmentId = options.equipmentId || 'equipmentSection';
        this.loadMoreId = options.loadMoreId || 'loadMoreBtn';
        this.jsonPath = options.jsonPath || 'photos.json';
        
        // Gallery data
        this.albums = [];
        this.settings = {};
        this.equipment = {};
        this.currentPage = 0;
        this.albumsPerPage = 10;
        this.isLoading = false;
        
        // Layout options
        this.layoutMode = 'masonry'; // 'masonry' or 'grid'
        this.enableAspectRatioDetection = true;
        
        // Viewer state
        this.currentAlbumPhotos = [];
        this.currentImageIndex = 0;
        this.currentAlbumData = null;
        this.isViewerOpen = false;
        
        // Zoom and pan state
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartTranslateX = 0;
        this.dragStartTranslateY = 0;
        
        // Touch and gesture support
        this.touches = [];
        this.initialDistance = 0;
        this.initialScale = 1;
        this.lastTouchTime = 0;
        
        // UI state
        this.isFullscreen = false;
        this.hideUITimeout = null;
        this.uiVisible = true;
        
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
        
        // Bind methods
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    
    async init() {
        console.log('EnhancedPhotoGallery: Initializing...');
        try {
            await this.loadData();
            console.log('EnhancedPhotoGallery: Data loaded, albums:', this.albums.length);
            this.renderInitialAlbums();
            this.renderEquipment();
            this.setupLoadMore();
            this.setupViewer();
            this.setupLazyLoading();
            console.log('EnhancedPhotoGallery: Initialization complete');
        } catch (error) {
            console.error('EnhancedPhotoGallery: Failed to initialize:', error);
            this.showError();
        }
    }
    
    async loadData() {
        console.log('EnhancedPhotoGallery: Loading data from', this.jsonPath);
        const response = await fetch(this.jsonPath);
        if (!response.ok) {
            console.error('EnhancedPhotoGallery: Failed to fetch JSON:', response.status, response.statusText);
            throw new Error('Failed to load photos.json');
        }
        
        const data = await response.json();
        console.log('EnhancedPhotoGallery: JSON data loaded:', data);
        this.albums = data.albums || [];
        this.settings = data.settings || {};
        this.equipment = data.equipment || {};
        this.albumsPerPage = this.settings.albumsPerPage || 10;
    }
    
    getImageUrl(photo) {
        if (photo.url && photo.url.trim() !== '' && !photo.url.includes('photos.google.com/share/')) {
            let url = photo.url;
            if (url.includes('lh3.googleusercontent.com')) {
                url = url.replace(/=w\\d+-h\\d+.*$/, '');
                url = url.replace(/=s\\d+.*$/, '');
                if (!url.includes('=')) {
                    url += '=w800';
                }
            }
            return url;
        }
        
        if (photo.driveId && !photo.driveId.startsWith('REPLACE')) {
            return `https://drive.google.com/uc?export=view&id=${photo.driveId}`;
        }
        
        if (photo.id && !photo.id.startsWith('REPLACE') && !photo.id.startsWith('PHOTO')) {
            return `https://drive.google.com/uc?export=view&id=${photo.id}`;
        }
        
        console.log('EnhancedPhotoGallery: No valid URL found for photo:', photo.title);
        return null;
    }
    
    getHighResUrl(photo) {
        if (photo.url && photo.url.includes('lh3.googleusercontent.com')) {
            let url = photo.url;
            url = url.replace(/=w\\d+-h\\d+.*$/, '');
            url = url.replace(/=s\\d+.*$/, '');
            url = url.replace(/=w\\d+$/, '');
            return url + '=w2048'; // Higher res for viewer
        }
        return this.getImageUrl(photo);
    }
    
    getTagColor(tag) {
        return this.tagColors[tag] || this.defaultTagColor;
    }
    
    // Aspect ratio detection methods
    detectAspectRatio(width, height) {
        const ratio = width / height;
        
        if (ratio > 2.5) {
            return 'panorama';
        } else if (ratio > 1.3) {
            return 'landscape';
        } else if (ratio > 0.8) {
            return 'square';
        } else {
            return 'portrait';
        }
    }
    
    getAspectRatioFromUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = this.detectAspectRatio(img.naturalWidth, img.naturalHeight);
                resolve(aspectRatio);
            };
            img.onerror = () => {
                resolve('landscape'); // Default fallback
            };
            img.src = url;
        });
    }
    
    async setPhotoAspectRatio(photoElement, imageUrl) {
        if (!this.enableAspectRatioDetection || !imageUrl) return;
        
        try {
            const aspectRatio = await this.getAspectRatioFromUrl(imageUrl);
            photoElement.classList.add(aspectRatio);
            photoElement.dataset.aspectRatio = aspectRatio;
        } catch (error) {
            console.warn('Could not detect aspect ratio for:', imageUrl);
            photoElement.classList.add('landscape');
            photoElement.dataset.aspectRatio = 'landscape';
        }
    }
    
    renderAlbum(album, animate = false) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const statusColorClass = this.statusColors[album.statusColor] || 'bg-gray-500';
        const animationClass = animate ? 'album-animate-in' : '';
        const gridClass = this.layoutMode === 'masonry' ? 'masonry' : '';
        
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
                
                <div class="photo-grid ${gridClass} mb-4" data-album="${album.commitHash || album.title}">
                    ${album.photos.map((photo, index) => {
                        const imageUrl = this.getImageUrl(photo);
                        if (!imageUrl) return '';
                        return `
                            <div class="photo-item" data-photo-index="${index}" data-album-id="${album.commitHash || album.title}">
                                <img src="${imageUrl}" 
                                     alt="${photo.title || 'Photo'}" 
                                     loading="lazy"
                                     onerror="this.parentElement.style.display='none'">
                                <div class="photo-overlay">
                                    <h3>${photo.title || 'Untitled'}</h3>
                                    <p>${photo.settings || 'Settings not available'}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                ${album.tags && album.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-2">
                        ${album.tags.map(tag => {
                            const cleanTag = tag.trim();
                            const colors = this.getTagColor(cleanTag);
                            return cleanTag ? `<span class="px-2 py-1 text-xs font-medium ${colors.bg} ${colors.text} rounded-md">${cleanTag}</span>` : '';
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = albumHtml;
        const albumElement = tempDiv.firstElementChild;
        
        // Add click handlers to photo items and set up aspect ratio detection
        albumElement.querySelectorAll('.photo-item').forEach((item, index) => {
            const img = item.querySelector('img');
            if (img) {
                // Set up aspect ratio detection when image loads
                img.onload = () => {
                    this.setPhotoAspectRatio(item, img.src);
                };
                
                // If image is already loaded (cached)
                if (img.complete && img.naturalWidth > 0) {
                    this.setPhotoAspectRatio(item, img.src);
                }
            }
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const photoIndex = parseInt(item.dataset.photoIndex);
                const albumId = item.dataset.albumId;
                this.openViewer(albumId, photoIndex);
            });
        });
        
        container.appendChild(albumElement);
        
        // Handle masonry layout adjustments after images load
        if (this.layoutMode === 'masonry') {
            this.adjustMasonryLayout(albumElement);
        }
    }
    
    renderInitialAlbums() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = '';
            const albumsToShow = this.albums.slice(0, this.albumsPerPage);
            albumsToShow.forEach(album => this.renderAlbum(album));
            this.currentPage = 1;
            this.updateLoadMoreButton();
        }
    }
    
    async loadMore() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const btn = document.getElementById(this.loadMoreId);
        const text = document.getElementById('loadMoreText');
        const spinner = document.getElementById('loadMoreSpinner');
        
        if (btn) btn.disabled = true;
        if (text) text.textContent = 'Loading...';
        if (spinner) spinner.style.display = 'block';
        
        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const startIndex = this.currentPage * this.albumsPerPage;
        const endIndex = startIndex + this.albumsPerPage;
        const newAlbums = this.albums.slice(startIndex, endIndex);
        
        newAlbums.forEach(album => this.renderAlbum(album, true));
        
        this.currentPage++;
        this.isLoading = false;
        
        this.updateLoadMoreButton();
        
        if (btn) btn.disabled = false;
        if (text) text.textContent = 'git pull --more-photos';
        if (spinner) spinner.style.display = 'none';
    }
    
    updateLoadMoreButton() {
        const container = document.getElementById('loadMoreContainer');
        const hasMore = (this.currentPage * this.albumsPerPage) < this.albums.length;
        
        if (container) {
            container.style.display = hasMore ? 'block' : 'none';
        }
    }
    
    setupLoadMore() {
        const btn = document.getElementById(this.loadMoreId);
        if (btn) {
            btn.addEventListener('click', () => this.loadMore());
        }
    }
    
    renderEquipment() {
        const container = document.getElementById(this.equipmentId);
        if (!container || !this.equipment) return;
        
        const equipmentHtml = `
            <h3 class="text-lg font-medium text-gray-900 mb-4">Equipment & Process</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(this.equipment).map(([key, item]) => `
                    <div class="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-1">${item.name}</h4>
                        <p class="text-sm text-gray-600">${item.details}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = equipmentHtml;
    }
    
    // Enhanced Viewer Methods
    setupViewer() {
        this.setupViewerControls();
        this.setupViewerEvents();
        this.setupGestureHandlers();
    }
    
    setupViewerControls() {
        // Close button
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeViewer());
        }
        
        // Navigation buttons
        const navPrev = document.getElementById('navPrev');
        const navNext = document.getElementById('navNext');
        if (navPrev) {
            navPrev.addEventListener('click', () => this.navigateImage(-1));
        }
        if (navNext) {
            navNext.addEventListener('click', () => this.navigateImage(1));
        }
        
        // Zoom controls
        const zoomIn = document.getElementById('zoomIn');
        const zoomOut = document.getElementById('zoomOut');
        const zoomReset = document.getElementById('zoomReset');
        
        if (zoomIn) {
            zoomIn.addEventListener('click', () => this.zoomImage(1.5));
        }
        if (zoomOut) {
            zoomOut.addEventListener('click', () => this.zoomImage(0.75));
        }
        if (zoomReset) {
            zoomReset.addEventListener('click', () => this.resetZoom());
        }
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Download button
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadImage());
        }
        
        // Share button
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareImage());
        }
    }
    
    setupViewerEvents() {
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeydown);
        
        // Window resize
        window.addEventListener('resize', this.handleResize);
        
        // Click outside to close
        const lightbox = document.getElementById('lightbox');
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    this.closeViewer();
                }
            });
        }
        
        // Image container events for zoom and pan
        const imageContainer = document.querySelector('.image-container');
        if (imageContainer) {
            // Mouse events
            imageContainer.addEventListener('mousedown', this.handleMouseDown);
            imageContainer.addEventListener('wheel', this.handleWheel);
            
            // Touch events
            imageContainer.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            imageContainer.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            imageContainer.addEventListener('touchend', this.handleTouchEnd);
        }
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Auto-hide UI
        const viewer = document.querySelector('.photo-viewer');
        if (viewer) {
            viewer.addEventListener('mousemove', () => this.showUI());
            viewer.addEventListener('touchstart', () => this.showUI());
        }
    }
    
    setupGestureHandlers() {
        // Double-tap to zoom
        const imageWrapper = document.getElementById('imageWrapper');
        if (imageWrapper) {
            imageWrapper.addEventListener('dblclick', () => {
                if (this.scale === 1) {
                    this.zoomImage(2);
                } else {
                    this.resetZoom();
                }
            });
        }
    }
    
    openViewer(albumId, photoIndex = 0) {
        console.log('Opening viewer for album:', albumId, 'photo:', photoIndex);
        
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;
        
        // Find the album and set up navigation data
        this.currentAlbumData = this.albums.find(album => 
            album.commitHash === albumId || album.title === albumId
        );
        
        if (!this.currentAlbumData) {
            console.error('Album not found:', albumId);
            return;
        }
        
        this.currentAlbumPhotos = this.currentAlbumData.photos || [];
        this.currentImageIndex = photoIndex || 0;
        this.isViewerOpen = true;
        
        // Reset zoom and pan
        this.resetZoom();
        
        // Load and display the image
        this.displayCurrentImage();
        
        // Show lightbox with animation
        lightbox.style.display = 'flex';
        requestAnimationFrame(() => {
            lightbox.classList.add('active');
        });
        
        document.body.style.overflow = 'hidden';
        
        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Start auto-hide timer
        this.showUI();
    }
    
    displayCurrentImage() {
        const img = document.getElementById('lightbox-img');
        const loading = document.getElementById('imageLoading');
        const currentPhoto = this.currentAlbumPhotos[this.currentImageIndex];
        
        if (!img || !currentPhoto) return;
        
        // Show loading state
        if (loading) loading.style.display = 'flex';
        img.style.opacity = '0';
        
        // Set image
        const highResUrl = this.getHighResUrl(currentPhoto);
        
        const newImg = new Image();
        newImg.onload = () => {
            img.src = highResUrl;
            img.alt = currentPhoto.title || 'Photo';
            
            // Detect and apply aspect ratio
            const aspectRatio = this.detectAspectRatio(newImg.naturalWidth, newImg.naturalHeight);
            this.updateImageContainerAspectRatio(aspectRatio);
            
            // Hide loading, show image
            if (loading) loading.style.display = 'none';
            img.style.opacity = '1';
            
            // Reset zoom and pan
            this.resetZoom();
        };
        newImg.onerror = () => {
            if (loading) loading.style.display = 'none';
            console.error('Failed to load image:', highResUrl);
        };
        newImg.src = highResUrl;
        
        // Update info panel
        this.updateInfoPanel(currentPhoto);
        
        // Update counter
        this.updateImageCounter();
        
        // Update title
        const titleEl = document.getElementById('viewer-title');
        if (titleEl) {
            titleEl.textContent = currentPhoto.title || 'Photo';
        }
    }
    
    updateInfoPanel(photo) {
        // Update title
        const titleEl = document.getElementById('image-title');
        if (titleEl) {
            titleEl.textContent = photo.title || 'Untitled';
        }
        
        // Update settings
        const settingsEl = document.getElementById('image-settings');
        if (settingsEl) {
            settingsEl.textContent = photo.settings || 'Settings not available';
        }
        
        // Update album info
        const albumEl = document.getElementById('image-album');
        if (albumEl && this.currentAlbumData) {
            albumEl.textContent = this.currentAlbumData.title || 'Unknown Album';
        }
        
        // Update location
        const locationEl = document.getElementById('image-location');
        if (locationEl && this.currentAlbumData) {
            locationEl.textContent = this.currentAlbumData.location || 'Unknown Location';
        }
        
        // Update date
        const dateEl = document.getElementById('image-date');
        if (dateEl && this.currentAlbumData) {
            dateEl.textContent = this.currentAlbumData.date || 'Unknown Date';
        }
    }
    
    updateImageCounter() {
        const currentEl = document.getElementById('current-image');
        const totalEl = document.getElementById('total-images');
        
        if (currentEl) {
            currentEl.textContent = this.currentImageIndex + 1;
        }
        
        if (totalEl) {
            totalEl.textContent = this.currentAlbumPhotos.length;
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('navPrev');
        const nextBtn = document.getElementById('navNext');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentImageIndex <= 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentImageIndex >= this.currentAlbumPhotos.length - 1;
        }
    }
    
    navigateImage(direction) {
        const newIndex = this.currentImageIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.currentAlbumPhotos.length) {
            this.currentImageIndex = newIndex;
            this.displayCurrentImage();
            this.updateNavigationButtons();
            this.showUI(); // Show UI when navigating
        }
    }
    
    // Zoom and Pan Methods
    zoomImage(factor) {
        const newScale = Math.max(0.5, Math.min(5, this.scale * factor));
        
        if (newScale !== this.scale) {
            this.scale = newScale;
            this.updateImageTransform();
            
            // Show UI when zooming
            this.showUI();
        }
    }
    
    resetZoom() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.updateImageTransform();
    }
    
    updateImageTransform() {
        const wrapper = document.getElementById('imageWrapper');
        if (wrapper) {
            wrapper.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
            wrapper.classList.toggle('zoomed', this.scale > 1);
        }
    }
    
    // Event Handlers
    handleKeydown(e) {
        if (!this.isViewerOpen) return;
        
        switch (e.key) {
            case 'Escape':
                this.closeViewer();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateImage(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateImage(1);
                break;
            case '+':
            case '=':
                e.preventDefault();
                this.zoomImage(1.5);
                break;
            case '-':
                e.preventDefault();
                this.zoomImage(0.75);
                break;
            case '0':
                e.preventDefault();
                this.resetZoom();
                break;
            case 'f':
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'd':
                e.preventDefault();
                this.downloadImage();
                break;
        }
    }
    
    handleResize() {
        if (this.isViewerOpen) {
            this.resetZoom();
        }
    }
    
    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left mouse button
        
        e.preventDefault();
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartTranslateX = this.translateX;
        this.dragStartTranslateY = this.translateY;
        
        const wrapper = document.getElementById('imageWrapper');
        if (wrapper) {
            wrapper.classList.add('dragging');
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || this.scale <= 1) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        
        this.translateX = this.dragStartTranslateX + deltaX;
        this.translateY = this.dragStartTranslateY + deltaY;
        
        this.updateImageTransform();
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            const wrapper = document.getElementById('imageWrapper');
            if (wrapper) {
                wrapper.classList.remove('dragging');
            }
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomImage(zoomFactor);
    }
    
    // Touch Events
    handleTouchStart(e) {
        e.preventDefault();
        
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1) {
            // Single touch - check for double tap or start drag
            const now = Date.now();
            if (now - this.lastTouchTime < 300) {
                // Double tap
                if (this.scale === 1) {
                    this.zoomImage(2);
                } else {
                    this.resetZoom();
                }
            } else {
                // Start potential drag
                this.isDragging = true;
                this.dragStartX = this.touches[0].clientX;
                this.dragStartY = this.touches[0].clientY;
                this.dragStartTranslateX = this.translateX;
                this.dragStartTranslateY = this.translateY;
            }
            this.lastTouchTime = now;
        } else if (this.touches.length === 2) {
            // Two fingers - start pinch zoom
            this.initialDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
            this.initialScale = this.scale;
            this.isDragging = false;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1 && this.isDragging && this.scale > 1) {
            // Single finger drag when zoomed
            const deltaX = this.touches[0].clientX - this.dragStartX;
            const deltaY = this.touches[0].clientY - this.dragStartY;
            
            this.translateX = this.dragStartTranslateX + deltaX;
            this.translateY = this.dragStartTranslateY + deltaY;
            
            this.updateImageTransform();
        } else if (this.touches.length === 2) {
            // Two finger pinch zoom
            const currentDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
            const scaleChange = currentDistance / this.initialDistance;
            const newScale = Math.max(0.5, Math.min(5, this.initialScale * scaleChange));
            
            this.scale = newScale;
            this.updateImageTransform();
        }
    }
    
    handleTouchEnd(e) {
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 0) {
            this.isDragging = false;
        } else if (this.touches.length === 1) {
            // Reset for single touch
            this.isDragging = true;
            this.dragStartX = this.touches[0].clientX;
            this.dragStartY = this.touches[0].clientY;
            this.dragStartTranslateX = this.translateX;
            this.dragStartTranslateY = this.translateY;
        }
        
        // Handle swipe navigation
        if (!e.touches.length && !this.isDragging && this.scale === 1) {
            this.handleSwipeNavigation(e);
        }
    }
    
    handleSwipeNavigation(e) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.dragStartX;
        const deltaY = touch.clientY - this.dragStartY;
        
        // Check if it's a horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                this.navigateImage(-1); // Swipe right = previous
            } else {
                this.navigateImage(1);  // Swipe left = next
            }
        }
    }
    
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // UI Methods
    showUI() {
        const header = document.querySelector('.viewer-header');
        const footer = document.querySelector('.viewer-footer');
        
        if (header) header.classList.remove('hidden');
        if (footer) footer.classList.remove('hidden');
        
        this.uiVisible = true;
        
        // Clear existing timeout
        if (this.hideUITimeout) {
            clearTimeout(this.hideUITimeout);
        }
        
        // Set new timeout to hide UI
        this.hideUITimeout = setTimeout(() => {
            if (this.isViewerOpen && this.uiVisible) {
                if (header) header.classList.add('hidden');
                if (footer) footer.classList.add('hidden');
                this.uiVisible = false;
            }
        }, 3000);
    }
    
    toggleFullscreen() {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;
        
        if (!document.fullscreenElement) {
            lightbox.requestFullscreen().then(() => {
                this.isFullscreen = true;
                lightbox.classList.add('fullscreen');
            });
        } else {
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                lightbox.classList.remove('fullscreen');
            });
        }
    }
    
    downloadImage() {
        const currentPhoto = this.currentAlbumPhotos[this.currentImageIndex];
        if (!currentPhoto) return;
        
        const highResUrl = this.getHighResUrl(currentPhoto);
        const filename = `${currentPhoto.title || 'photo'}.jpg`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = highResUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    async shareImage() {
        const currentPhoto = this.currentAlbumPhotos[this.currentImageIndex];
        if (!currentPhoto) return;
        
        const shareData = {
            title: currentPhoto.title || 'Photo',
            text: `Check out this photo: ${currentPhoto.title || 'Photo'}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback to copying URL
            navigator.clipboard.writeText(window.location.href).then(() => {
                // Could show a toast notification here
                console.log('URL copied to clipboard');
            });
        }
    }
    
    closeViewer() {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;
        
        // Clear timeouts
        if (this.hideUITimeout) {
            clearTimeout(this.hideUITimeout);
        }
        
        // Reset state
        this.isViewerOpen = false;
        this.resetZoom();
        
        // Hide lightbox with animation
        lightbox.classList.remove('active');
        
        setTimeout(() => {
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
            
            // Reset navigation data
            this.currentImageIndex = 0;
            this.currentAlbumPhotos = [];
            this.currentAlbumData = null;
        }, 300);
        
        // Exit fullscreen if active
        if (this.isFullscreen && document.fullscreenElement) {
            document.exitFullscreen();
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
    
    adjustMasonryLayout(albumElement) {
        // Wait for images to load before adjusting layout
        const images = albumElement.querySelectorAll('.photo-item img');
        let loadedImages = 0;
        
        const checkAllLoaded = () => {
            loadedImages++;
            if (loadedImages === images.length) {
                // All images loaded, trigger layout reflow
                this.triggerMasonryReflow(albumElement);
            }
        };
        
        images.forEach(img => {
            if (img.complete) {
                checkAllLoaded();
            } else {
                img.addEventListener('load', checkAllLoaded);
                img.addEventListener('error', checkAllLoaded);
            }
        });
        
        // Fallback timeout
        setTimeout(() => this.triggerMasonryReflow(albumElement), 2000);
    }
    
    triggerMasonryReflow(albumElement) {
        const grid = albumElement.querySelector('.photo-grid.masonry');
        if (grid) {
            // Force reflow by temporarily changing column count
            const originalColumns = grid.style.columns;
            grid.style.columns = 'auto';
            setTimeout(() => {
                grid.style.columns = originalColumns;
            }, 10);
        }
    }
    
    updateImageContainerAspectRatio(aspectRatio) {
        const imageContainer = document.querySelector('.image-container');
        if (imageContainer) {
            // Remove existing aspect ratio classes
            imageContainer.classList.remove('portrait', 'landscape', 'panorama', 'square');
            // Add new aspect ratio class
            if (aspectRatio) {
                imageContainer.classList.add(aspectRatio);
            }
        }
    }
    
    showError(message = 'Failed to load photos. Please try refreshing the page.') {
        console.error('EnhancedPhotoGallery: Showing error:', message);
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
    
    // Cleanup method
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Clear timeouts
        if (this.hideUITimeout) {
            clearTimeout(this.hideUITimeout);
        }
        
        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Initialize enhanced gallery when DOM is ready
let gallery;
document.addEventListener('DOMContentLoaded', () => {
    gallery = new EnhancedPhotoGallery();
    gallery.init();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedPhotoGallery;
}