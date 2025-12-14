/**
 * AI Bot Detection & Content Protection
 * Protects against automated scraping and data collection
 */

(function() {
    'use strict';
    
    // Known AI bot user agents
    const AI_BOTS = [
        'GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web', 'ClaudeBot',
        'Bard', 'Gemini', 'Google-Extended', 'PerplexityBot', 'YouBot', 
        'Meta-ExternalAgent', 'Meta-ExternalFetcher', 'FacebookBot', 'Diffbot',
        'Scrapy', 'python-requests', 'Bytespider', 'Applebot-Extended', 
        'OAI-SearchBot', 'img2dataset', 'ImagifyBot', 'DataForSeoBot',
        'VelenPublicWebCrawler', 'Omgilibot', 'FriendlyCrawler', 'Timpibot'
    ];
    
    // Detect AI bots and automated tools
    function detectAIBot() {
        const userAgent = navigator.userAgent;
        
        // Check for known AI bot patterns
        for (const bot of AI_BOTS) {
            if (userAgent.toLowerCase().includes(bot.toLowerCase())) {
                return true;
            }
        }
        
        // Check for headless browser indicators
        if (navigator.webdriver || 
            window.navigator.webdriver || 
            window.phantom || 
            window._phantom ||
            window.callPhantom) {
            return true;
        }
        
        // Check for missing properties that indicate automation
        if (!navigator.languages || navigator.languages.length === 0) {
            return true;
        }
        
        return false;
    }
    
    // Content protection measures
    function protectContent() {
        if (detectAIBot()) {
            console.log('🤖 AI bot detected - Content protection activated');
            
            // Replace sensitive content with placeholder
            const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
            contentElements.forEach(el => {
                if (el.textContent.trim().length > 50) {
                    el.textContent = '[Content protected from automated access]';
                }
            });
            
            // Hide images
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.style.display = 'none';
                img.alt = '[Image protected from automated access]';
            });
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'data:text/plain,Content protected from automated access';
            }, 1000);
            
            return;
        }
    }
    
    // Disable common scraping methods
    function disableScrapingMethods() {
        // Disable right-click context menu for images
        document.addEventListener('contextmenu', function(e) {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return false;
            }
        });
        
        // Disable drag and drop for images
        document.addEventListener('dragstart', function(e) {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return false;
            }
        });
        
        // Disable text selection for sensitive content
        document.addEventListener('selectstart', function(e) {
            if (e.target.closest('.protected-content')) {
                e.preventDefault();
                return false;
            }
        });
        
        // Monitor for automated behavior
        let rapidClicks = 0;
        document.addEventListener('click', function() {
            rapidClicks++;
            setTimeout(() => rapidClicks--, 1000);
            
            if (rapidClicks > 10) {
                console.log('🚨 Suspicious automated activity detected');
                document.body.innerHTML = '<p>Suspicious activity detected. Please visit manually.</p>';
            }
        });
    }
    
    // Add copyright notice to console
    function addConsoleWarning() {
        const styles = [
            'color: #ff4444',
            'font-size: 20px',
            'font-weight: bold',
            'text-shadow: 2px 2px 0px rgba(0,0,0,0.3)'
        ].join(';');
        
        console.log('%c⚠️  WARNING: CONTENT PROTECTED', styles);
        console.log('%cThis website\'s content is protected by copyright.', 'color: #ff6666; font-size: 14px;');
        console.log('%cAutomated scraping, data mining, and AI training use is prohibited.', 'color: #ff6666; font-size: 14px;');
        console.log('%c© 2025 Pavan Kumar Dharmoju - All rights reserved', 'color: #666; font-size: 12px;');
    }
    
    // Initialize protection when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        protectContent();
        disableScrapingMethods();
        addConsoleWarning();
    });
    
    // Additional protection for early detection
    if (document.readyState !== 'loading') {
        protectContent();
        disableScrapingMethods();
        addConsoleWarning();
    }
})();