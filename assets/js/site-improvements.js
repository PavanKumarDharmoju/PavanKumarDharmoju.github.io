// Site-wide UX improvements
(function() {
    'use strict';
    
    // Preload pages on hover for faster navigation
    const preloadedPages = new Set();
    
    function preloadPage(url) {
        if (preloadedPages.has(url)) return;
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
        preloadedPages.add(url);
    }
    
    // Add hover preloading to navigation links
    document.addEventListener('DOMContentLoaded', function() {
        const navLinks = document.querySelectorAll('nav a[href$=".html"]');
        
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', function() {
                preloadPage(this.href);
            });
        });
        
        // Lazy load images with fade-in effect
        const images = document.querySelectorAll('img[loading="lazy"]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.addEventListener('load', function() {
                        this.classList.add('loaded');
                    });
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
        
        // Add smooth scrolling for hash links
        const hashLinks = document.querySelectorAll('a[href^="#"]');
        hashLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Add loading state for external links
        const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="pavankumardharmoju.github.io"])');
        externalLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Simple page transition effect
        document.addEventListener('beforeunload', function() {
            document.body.style.opacity = '0.7';
        });
        
        // Show page with fade-in effect
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease-in-out';
        
        window.addEventListener('load', function() {
            document.body.style.opacity = '1';
        });
    });
    
    // Skip to main content for accessibility
    function addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded';
        skipLink.style.cssText = `
            position: absolute;
            left: -10000px;
            top: auto;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        
        skipLink.addEventListener('focus', function() {
            this.style.cssText = `
                position: absolute;
                top: 1rem;
                left: 1rem;
                z-index: 1000;
                padding: 0.5rem 1rem;
                background: #2563eb;
                color: white;
                border-radius: 0.375rem;
                text-decoration: none;
            `;
        });
        
        skipLink.addEventListener('blur', function() {
            this.style.cssText = `
                position: absolute;
                left: -10000px;
                top: auto;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSkipLink);
    } else {
        addSkipLink();
    }
})();
