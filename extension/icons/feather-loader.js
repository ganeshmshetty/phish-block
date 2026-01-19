/**
 * Feather Icons Loader for PhishBlock
 * Lightweight utility to load and display Feather icons
 */

// Icon cache to avoid repeated fetches
const iconCache = new Map();

/**
 * Load a Feather icon by name
 * @param {string} name - Icon name (e.g., 'shield', 'alert-triangle')
 * @param {string} className - Optional CSS class
 * @param {number} size - Optional size (default: 24)
 * @returns {Promise<HTMLElement>} Icon element
 */
async function loadFeatherIcon(name, className = '', size = 24) {
    const cacheKey = `${name}-${size}`;

    // Return cached icon if available
    if (iconCache.has(cacheKey)) {
        const cached = iconCache.get(cacheKey);
        const clone = cached.cloneNode(true);
        if (className) clone.className = className;
        return clone;
    }

    try {
        const response = await fetch(`../icons/feather/${name}.svg`);
        const svgText = await response.text();

        // Create a container to parse the SVG
        const container = document.createElement('div');
        container.innerHTML = svgText;

        const svg = container.querySelector('svg');
        if (!svg) throw new Error(`Invalid SVG for ${name}`);

        // Set size and styling
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.display = 'inline-block';
        svg.style.verticalAlign = 'middle';

        if (className) svg.className = className;

        // Cache the icon
        iconCache.set(cacheKey, svg.cloneNode(true));

        return svg;
    } catch (error) {
        console.error(`Failed to load icon: ${name}`, error);
        // Return a placeholder
        const placeholder = document.createElement('span');
        placeholder.textContent = '?';
        placeholder.style.display = 'inline-block';
        placeholder.style.width = `${size}px`;
        placeholder.style.height = `${size}px`;
        return placeholder;
    }
}

/**
 * Replace an element with a Feather icon
 * @param {string} selector - CSS selector
 * @param {string} iconName - Icon name
 * @param {string} className - Optional CSS class
 * @param {number} size - Optional size
 */
async function replaceWithIcon(selector, iconName, className = '', size = 24) {
    const element = document.querySelector(selector);
    if (!element) return;

    const icon = await loadFeatherIcon(iconName, className, size);
    element.replaceWith(icon);
}

/**
 * Insert icon before an element
 * @param {string} selector - CSS selector
 * @param {string} iconName - Icon name
 * @param {string} className - Optional CSS class
 * @param {number} size - Optional size
 */
async function insertIconBefore(selector, iconName, className = '', size = 24) {
    const element = document.querySelector(selector);
    if (!element || !element.parentNode) return;

    const icon = await loadFeatherIcon(iconName, className, size);
    element.parentNode.insertBefore(icon, element);
}

/**
 * Set icon as innerHTML of element
 * @param {string} selector - CSS selector
 * @param {string} iconName - Icon name
 * @param {number} size - Optional size
 */
async function setIconContent(selector, iconName, size = 24) {
    const element = document.querySelector(selector);
    if (!element) return;

    const icon = await loadFeatherIcon(iconName, '', size);
    element.innerHTML = '';
    element.appendChild(icon);
}

/**
 * Batch load icons for elements with data-feather attribute
 * Usage: <div data-feather="shield" data-size="24"></div>
 */
function initFeatherIcons() {
    document.querySelectorAll('[data-feather]').forEach(async (element) => {
        const iconName = element.getAttribute('data-feather');
        const size = parseInt(element.getAttribute('data-size') || '24');
        const className = element.className;

        if (!iconName) return;

        const icon = await loadFeatherIcon(iconName, className, size);
        element.innerHTML = '';
        element.appendChild(icon);
    });
}

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeatherIcons);
} else {
    initFeatherIcons();
}
