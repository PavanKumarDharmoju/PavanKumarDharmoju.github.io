/**
 * Relative Time Utility
 * Calculates and displays relative time for elements with data-date attributes
 * 
 * Usage:
 * 1. Add class "relative-time" to any element
 * 2. Add data-date attribute with ISO date string (YYYY-MM-DD)
 * 3. Include this script in your HTML
 * 
 * Example:
 * <span class="relative-time" data-date="2025-09-01">3 days ago</span>
 * 
 * The text content serves as a fallback if JavaScript is disabled.
 */

// Function to calculate relative time
function getRelativeTime(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count >= 1) {
            return count === 1 ? `1 ${interval.label} ago` : `${count} ${interval.label}s ago`;
        }
    }
    
    return 'just now';
}

// Update all relative time elements
function updateRelativeTimes() {
    const relativeTimeElements = document.querySelectorAll('.relative-time');
    
    relativeTimeElements.forEach(element => {
        const dateString = element.getAttribute('data-date');
        if (dateString) {
            element.textContent = getRelativeTime(dateString);
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    updateRelativeTimes();
    
    // Optional: Update times every minute to keep them current
    setInterval(updateRelativeTimes, 60000);
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getRelativeTime, updateRelativeTimes };
}
