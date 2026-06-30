/**
 * Google Analytics 4 (GA4) Integration Hook
 * 
 * This hook provides methods for tracking events and page views
 * using Google Analytics 4. It initializes the gtag.js script
 * and exposes helper functions for common e-commerce events.
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const hasValidId = GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

// Initialize gtag function dynamically to avoid network errors on local/offline development
if (typeof window !== 'undefined' && hasValidId) {
    // Inject the GA script tag dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
}

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, params);
    }
}

/**
 * Track a page view
 * @param {string} pagePath - Path of the page
 * @param {string} pageTitle - Title of the page
 */
export function trackPageView(pagePath, pageTitle) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'page_view', {
            page_path: pagePath,
            page_title: pageTitle,
        });
    }
}

// ============================================================================
// E-COMMERCE EVENTS
// ============================================================================

/**
 * Track when a user views a product
 * @param {object} product - Product details
 */
export function trackViewItem(product) {
    trackEvent('view_item', {
        currency: 'VND',
        value: product.salePrice || product.basePrice,
        items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryName,
            item_brand: product.brandName,
            price: product.salePrice || product.basePrice,
        }],
    });
}

/**
 * Track when a user adds a product to cart
 * @param {object} product - Product details
 * @param {number} quantity - Quantity added
 */
export function trackAddToCart(product, quantity = 1) {
    trackEvent('add_to_cart', {
        currency: 'VND',
        value: (product.salePrice || product.basePrice) * quantity,
        items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryName,
            item_brand: product.brandName,
            price: product.salePrice || product.basePrice,
            quantity,
        }],
    });
}

/**
 * Track when a user removes a product from cart
 * @param {object} product - Product details
 * @param {number} quantity - Quantity removed
 */
export function trackRemoveFromCart(product, quantity = 1) {
    trackEvent('remove_from_cart', {
        currency: 'VND',
        value: (product.salePrice || product.basePrice) * quantity,
        items: [{
            item_id: product.id,
            item_name: product.name,
            price: product.salePrice || product.basePrice,
            quantity,
        }],
    });
}

/**
 * Track when a user begins checkout
 * @param {array} items - Cart items
 * @param {number} total - Cart total
 */
export function trackBeginCheckout(items, total) {
    trackEvent('begin_checkout', {
        currency: 'VND',
        value: total,
        items: items.map(item => ({
            item_id: item.productId,
            item_name: item.productName,
            price: item.unitPrice,
            quantity: item.quantity,
        })),
    });
}

/**
 * Track when a purchase is completed
 * @param {object} order - Order details
 */
export function trackPurchase(order) {
    trackEvent('purchase', {
        transaction_id: order.id || order.orderNumber,
        currency: 'VND',
        value: order.totalAmount,
        shipping: order.shippingFee || 0,
        items: (order.items || []).map(item => ({
            item_id: item.productId,
            item_name: item.productName,
            price: item.unitPrice,
            quantity: item.quantity,
        })),
    });
}

/**
 * Track a search query
 * @param {string} searchTerm - Search term
 */
export function trackSearch(searchTerm) {
    trackEvent('search', {
        search_term: searchTerm,
    });
}

/**
 * Track when a user logs in
 * @param {string} method - Login method (e.g., 'phone', 'email')
 */
export function trackLogin(method = 'phone') {
    trackEvent('login', { method });
}

/**
 * Track when a user signs up
 * @param {string} method - Signup method
 */
export function trackSignUp(method = 'phone') {
    trackEvent('sign_up', { method });
}

export default {
    trackEvent,
    trackPageView,
    trackViewItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    trackSearch,
    trackLogin,
    trackSignUp,
};
