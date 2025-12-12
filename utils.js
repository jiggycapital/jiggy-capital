// ============================================================================
// UTILITY FUNCTIONS - Shared utilities for Jiggy Capital Portfolio
// ============================================================================

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Safely set innerHTML with sanitization
 * @param {HTMLElement} element - Element to update
 * @param {string} html - HTML content (will be sanitized)
 */
function safeSetHTML(element, html) {
    if (!element) return;
    element.innerHTML = sanitizeHTML(html);
}

/**
 * Create a text node safely (preferred over innerHTML for text content)
 * @param {string} text - Text content
 * @returns {Text} - Text node
 */
function createTextNode(text) {
    return document.createTextNode(String(text || ''));
}

/**
 * Parse numbers that may include $, commas, %, or trailing units
 * @param {any} value - Value to parse
 * @returns {number} - Parsed number or 0
 */
function toNumber(value) {
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

/**
 * Parse percentage values (e.g., "+61.2%", "-5.3%", "12.5%")
 * @param {any} value - Value to parse
 * @returns {number|null} - Parsed percentage or null
 */
function toPercentage(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    const cleaned = str.replace(/[^0-9.\-+]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

/**
 * Format number with commas and optional decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number string
 */
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format percentage with sign
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Show error message to user
 * @param {string} message - Error message
 * @param {HTMLElement} container - Container element
 */
function showError(message, container) {
    if (!container) return;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c33; margin: 1rem 0;';
    errorDiv.textContent = `Error: ${message}`;
    container.innerHTML = '';
    container.appendChild(errorDiv);
}

/**
 * Show loading state
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 */
function showLoading(container, message = 'Loading...') {
    if (!container) return;
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${sanitizeHTML(message)}</p>
        </div>
    `;
}

/**
 * Remove all event listeners from an element (helper for cleanup)
 * @param {HTMLElement} element - Element to clean up
 * @param {string} eventType - Event type
 */
function removeAllListeners(element, eventType) {
    if (!element) return;
    // Clone and replace to remove all listeners
    const newElement = element.cloneNode(true);
    element.parentNode?.replaceChild(newElement, element);
    return newElement;
}

