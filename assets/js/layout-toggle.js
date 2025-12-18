// Layout toggle functionality for enhanced photo gallery
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const layoutToggle = document.getElementById('layoutToggle');
        if (layoutToggle && gallery) {
            layoutToggle.addEventListener('click', () => {
                const layoutText = document.getElementById('layoutText');
                
                // Switch layout mode
                gallery.layoutMode = gallery.layoutMode === 'masonry' ? 'grid' : 'masonry';
                
                // Update button
                if (layoutToggle && layoutText) {
                    layoutToggle.dataset.layout = gallery.layoutMode;
                    layoutText.textContent = gallery.layoutMode === 'masonry' ? 'Masonry' : 'Grid';
                }
                
                // Apply new layout
                const photoGrids = document.querySelectorAll('.photo-grid');
                photoGrids.forEach(grid => {
                    if (gallery.layoutMode === 'masonry') {
                        grid.classList.add('masonry');
                        grid.querySelectorAll('.photo-item').forEach(item => {
                            item.classList.remove('portrait', 'landscape', 'panorama', 'square');
                        });
                    } else {
                        grid.classList.remove('masonry');
                        grid.querySelectorAll('.photo-item').forEach(item => {
                            const aspectRatio = item.dataset.aspectRatio;
                            if (aspectRatio) {
                                item.classList.add(aspectRatio);
                            }
                        });
                    }
                });
            });
        }
    }, 500);
});