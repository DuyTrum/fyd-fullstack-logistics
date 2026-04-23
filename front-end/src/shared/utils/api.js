// api.js - API service for FYD Admin

import { getSession } from './authSession';
import { Capacitor } from '@capacitor/core';

/**
 * Dynamic BASE_URL logic:
 * - Native (Android emulator): 10.0.2.2 routes to host machine's localhost
 * - Native (real device): use VITE_API_URL or your LAN IP
 * - Web browser: localhost
 * - Production: use VITE_API_URL environment variable
 */
function getBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl; // Production or custom env always wins

  if (Capacitor.isNativePlatform()) {
    // For real device: use your PC's LAN IP
    // For emulator only: change to 'http://10.0.2.2:8080'
    return 'http://192.168.1.20:8080';
  }

  return 'http://localhost:8080';
}

export const BASE_URL = getBaseUrl();
const API_BASE = `${BASE_URL}/api`;

export const getAssetUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getSession();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  // Nếu body là FormData, browser sẽ tự động set Content-Type là multipart/form-data với boundary
  // Chúng ta cần xóa header Content-Type mặc định (application/json)
  if (options.body instanceof FormData) {
    if (headers['Content-Type'] === 'application/json') {
      delete headers['Content-Type'];
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      const error = new Error(errorData.message || `HTTP ${response.status}`);
      error.data = errorData; // Attach full response data
      error.status = response.status;
      throw error;
    }

    // Handle empty responses (204 No Content or empty body)
    const text = await response.text();
    if (!text) {
      return {};
    }
    return JSON.parse(text);
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ============ AUTH ============
export const authAPI = {
  login: (username, password) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => fetchAPI('/admin/profile'),
  updateProfile: (data) =>
    fetchAPI('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data) =>
    fetchAPI('/admin/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSessions: () => fetchAPI('/auth/sessions'),
  getActivities: () => fetchAPI('/admin/profile/activities'),
};

// ============ DASHBOARD ============
export const dashboardAPI = {
  get: () => fetchAPI('/dashboard'),
  getRevenue: (days = 7) => fetchAPI(`/dashboard/revenue?days=${days}`),
  getAiSuggestions: () => fetchAPI('/dashboard/ai-suggestions'),
  applyAiAction: (insightId, category, data) =>
    fetchAPI('/dashboard/ai-action/apply', {
      method: 'POST',
      body: JSON.stringify({ insightId, category, data }),
    }),

  getProfileStats: () => fetchAPI('/admin/profile/stats'),
};

// ============ REPORTS (Excel Export) ============
export const reportAPI = {
  exportOrders: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = `${API_BASE}/reports/orders/export${query ? `?${query}` : ''}`;
    const token = getSession();

    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'orders.xlsx';
    downloadBlob(blob, filename);
  },

  exportRevenue: async (days = 30) => {
    const url = `${API_BASE}/reports/revenue/export?days=${days}`;
    const token = getSession();

    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'revenue.xlsx';
    downloadBlob(blob, filename);
  },

  exportInventory: async (lowStock = false) => {
    const url = `${API_BASE}/reports/inventory/export${lowStock ? '?lowStock=true' : ''}`;
    const token = getSession();

    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'inventory.xlsx';
    downloadBlob(blob, filename);
  },

  printInvoice: (orderId) => {
    const url = `${API_BASE}/orders/${orderId}/invoice`;
    window.open(url, '_blank');
  },
};

// Helper to trigger file download
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============ PRODUCTS ============
export const productAPI = {
  getAll: (params = {}) => {
    // Filter out undefined, null, and empty string values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/products${query ? `?${query}` : ''}`);
  },

  getById: (id) => fetchAPI(`/products/${id}`),

  getBrands: () => fetchAPI('/products/brands'),

  getBySku: (sku) => fetchAPI(`/products/sku/${sku}`),

  create: (data) =>
    fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    fetchAPI(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    fetchAPI(`/products/${id}`, { method: 'DELETE' }),

  updateStock: (id, variantId, quantity) =>
    fetchAPI(`/products/${id}/stock?variantId=${variantId}&quantity=${quantity}`, {
      method: 'PATCH',
    }),

  setPrimaryImage: (productId, imageId) =>
    fetchAPI(`/products/${productId}/primary-image?imageId=${imageId}`, {
      method: 'PATCH',
    }),

  uploadImage: async (productId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('fyd_token');
    const response = await fetch(`${API_BASE}/products/${productId}/images`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
    return response.json();
  },

  deleteImage: (productId, imageId) =>
    fetchAPI(`/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    }),

  getFeatured: () => fetchAPI('/products/list/featured'),
  getNew: () => fetchAPI('/products/list/new'),
  getFlashSale: () => fetchAPI('/products/list/flash-sale'),
  getTopSelling: (limit = 10) => fetchAPI(`/products/list/top-selling?limit=${limit}`),
};

// ============ ORDERS ============
export const orderAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/orders${query ? `?${query}` : ''}`);
  },

  getById: (id) => fetchAPI(`/orders/${id}`),

  getByNumber: (orderNumber) => fetchAPI(`/orders/number/${orderNumber}`),

  create: (data) =>
    fetchAPI('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id, status) =>
    fetchAPI(`/orders/${id}/status?status=${status}`, {
      method: 'PATCH',
    }),

  delete: (id) =>
    fetchAPI(`/orders/${id}`, { method: 'DELETE' }),

  requestCancel: (id, reason) =>
    fetchAPI(`/orders/${id}/cancel-request?reason=${encodeURIComponent(reason)}`, {
      method: 'PATCH',
    }),

  // Track order by code and phone (for guest customers)
  track: (orderCode, phone) => {
    const params = new URLSearchParams({ orderCode, phone }).toString();
    return fetch(`${API_BASE}/orders/track?${params}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) {
            return res.json().then(data => ({ error: data.error }));
          }
          if (res.status === 404) {
            return { error: 'Không tìm thấy đơn hàng với mã này' };
          }
          throw new Error('Network error');
        }
        return res.json();
      });
  },

  getByCustomer: (customerId, params = {}) => {
    const query = new URLSearchParams({ ...params, customerId }).toString();
    return fetchAPI(`/orders?${query}`);
  },

  confirmPayment: (id) =>
    fetchAPI(`/orders/${id}/confirm-payment`, {
      method: 'PATCH',
    }),
};

// ============ CUSTOMERS ============
export const customerAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/customers${query ? `?${query}` : ''}`);
  },

  getById: (id) => fetchAPI(`/customers/${id}`),

  getByPhone: (phone) => fetchAPI(`/customers/phone/${phone}`),

  getByEmail: (email) => fetchAPI(`/customers/email/${email}`),

  update: (id, data) =>
    fetchAPI(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadAvatar: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);

    // For FormData, we must not set 'Content-Type': 'application/json'.
    // The browser will automatically set the correct 'Content-Type' header
    // including the boundary for multipart/form-data.
    // We pass an empty headers object to fetchAPI to prevent it from adding 'Content-Type: application/json'.
    return fetchAPI(`/customers/${id}/avatar`, {
      method: "POST",
      body: formData,
      headers: {}, // Override default 'Content-Type: application/json'
    });
  }
};

// ============ INVENTORY ============
export const inventoryAPI = {
  getAll: (params = {}) => {
    // Filter out undefined, null, and empty string values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/inventory${query ? `?${query}` : ''}`);
  },

  getLowStock: (threshold = 6) => fetchAPI(`/inventory/low-stock?threshold=${threshold}`),

  getOutOfStock: () => fetchAPI('/inventory/out-of-stock'),

  updateVariantStock: (variantId, quantity) =>
    fetchAPI(`/inventory/variant/${variantId}?quantity=${quantity}`, {
      method: 'PATCH',
    }),

  setVariantStock: (variantId, stock) =>
    fetchAPI(`/inventory/variant/${variantId}/stock?stock=${stock}`, {
      method: 'PUT',
    }),
};

// ============ CATEGORIES ============
export const categoryAPI = {
  getAll: () => fetchAPI('/categories'),
  getFlat: () => fetchAPI('/categories/flat'),
  getById: (id) => fetchAPI(`/categories/${id}`),
  create: (data) =>
    fetchAPI('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/categories/${id}`, { method: 'DELETE' }),
};

// ============ COLORS, SIZES, BRANDS ============
export const colorAPI = {
  getAll: () => fetchAPI('/colors'),
  getById: (id) => fetchAPI(`/colors/${id}`),
  create: (data) =>
    fetchAPI('/colors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/colors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/colors/${id}`, { method: 'DELETE' }),
};

export const sizeAPI = {
  getAll: () => fetchAPI('/sizes'),
  getById: (id) => fetchAPI(`/sizes/${id}`),
  create: (data) =>
    fetchAPI('/sizes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/sizes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/sizes/${id}`, { method: 'DELETE' }),
  reorder: (orders) =>
    fetchAPI('/sizes/reorder', {
      method: 'PUT',
      body: JSON.stringify(orders),
    }),
};

export const brandAPI = {
  getAll: () => fetchAPI('/brands'),
  getById: (id) => fetchAPI(`/brands/${id}`),
  create: (data) =>
    fetchAPI('/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/brands/${id}`, { method: 'DELETE' }),
};

// ============ REVIEWS ============
export const reviewAPI = {
  // Shop: Get approved reviews for a product
  getProductReviews: (productId, customerId = null) => {
    const query = customerId ? `?customerId=${customerId}` : '';
    return fetchAPI(`/reviews/product/${productId}${query}`);
  },

  // Shop: Create a new review
  create: (data) =>
    fetchAPI('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin: Get all reviews with pagination and filters
  getAll: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/reviews${query ? `?${query}` : ''}`);
  },

  // Admin: Get single review
  getById: (id) => fetchAPI(`/reviews/${id}`),

  // Admin: Update review status (approve/reject)
  updateStatus: (id, status) =>
    fetchAPI(`/reviews/${id}/status?status=${status}`, { method: 'PATCH' }),

  // Admin: Reply to review
  reply: (id, reply) =>
    fetchAPI(`/reviews/${id}/reply`, {
      method: 'PATCH',
      body: JSON.stringify({ reply }),
    }),

  // Admin: Delete review
  delete: (id) => fetchAPI(`/reviews/${id}`, { method: 'DELETE' }),

  // Admin: Bulk approve reviews
  bulkApprove: (ids) =>
    fetchAPI('/reviews/bulk-approve', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// ============ SHOP API HELPERS ============
export async function fetchProducts() {
  try {
    const response = await productAPI.getAll({ size: 100 }); // Get more products for shop
    // Backend returns { products: [...], currentPage, totalItems, totalPages }
    return response.products || [];
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
}

export async function fetchCategories() {
  try {
    const categories = await categoryAPI.getAll();
    // Transform to include children structure
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      children: cat.children || []
    }));
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

export async function fetchColors() {
  try {
    const colors = await colorAPI.getAll();
    return colors || [];
  } catch (error) {
    console.error('Failed to fetch colors:', error);
    return [];
  }
}

export async function fetchSizes() {
  try {
    const sizes = await sizeAPI.getAll();
    return sizes || [];
  } catch (error) {
    console.error('Failed to fetch sizes:', error);
    return [];
  }
}

// ============ HELPERS ============
export function formatVND(n) {
  try {
    return new Intl.NumberFormat('vi-VN').format(n) + '₫';
  } catch {
    return `${n}₫`;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Status mapping
export const ORDER_STATUS = {
  PENDING: 'Chờ xử lý',
  PENDING_CANCEL: 'Chờ duyệt hủy',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Hoàn trả',
};

export const PAYMENT_METHOD = {
  COD: 'COD',
  BANK_TRANSFER: 'Chuyển khoản',
  MOMO: 'Momo',
  VNPAY: 'VNPay',
  ZALOPAY: 'ZaloPay',
};

// ============ AI API ============
export const aiAPI = {
  chat: (message, context = 'shop') =>
    fetchAPI('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),

  shopChat: (message, customerId = null) =>
    fetchAPI('/ai/shop-chat', {
      method: 'POST',
      body: JSON.stringify({ message, customerId }),
    }),

  adminChat: (message) =>
    fetchAPI('/ai/admin-chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getAdminSummary: () => fetchAPI('/ai/admin-summary'),

  // AI Size Advisor - supports category-specific measurements
  suggestSize: (productId, height, weight, fit = 'regular', extraParams = {}) => {
    const params = new URLSearchParams({ productId, height, weight, fit }).toString();
    // Add optional category-specific params (bust, waist, footLength)
    const extraQuery = Object.entries(extraParams)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const fullQuery = extraQuery ? `${params}&${extraQuery}` : params;
    return fetchAPI(`/ai/size-advisor?${fullQuery}`);
  },

  // AI Flash Sale Product Suggestions
  getFlashSaleSuggestions: () => fetchAPI('/ai/flash-sale-suggestions'),

  // AI Product Management
  generateDescription: (productName, category) =>
    fetchAPI('/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify({ productName, category }),
    }),

  suggestCategory: (productName, description) =>
    fetchAPI('/ai/suggest-category', {
      method: 'POST',
      body: JSON.stringify({ productName, description }),
    }),

  // AI Anomaly Detection
  getAnomalies: () => fetchAPI('/ai/anomalies'),
};

// ============ NOTIFICATION API ============
export const notificationAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/notifications${query ? `?${query}` : ''}`);
  },

  markRead: (id) =>
    fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    fetchAPI('/notifications/read-all', { method: 'PATCH' }),

  delete: (id) =>
    fetchAPI(`/notifications/${id}`, { method: 'DELETE' }),

  create: (data) =>
    fetchAPI('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============ FEATURED ZONES API ============
export const featuredAPI = {
  getZones: () => fetchAPI('/featured-zones'),

  getZone: (id) => fetchAPI(`/featured-zones/${id}`),

  getZoneBySlug: (slug) => fetchAPI(`/featured-zones/slug/${slug}`),

  getActiveZones: () => fetchAPI('/featured-zones/active'),

  createZone: (data) =>
    fetchAPI('/featured-zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateZone: (id, data) =>
    fetchAPI(`/featured-zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteZone: (id) =>
    fetchAPI(`/featured-zones/${id}`, { method: 'DELETE' }),
};

// ============ PROMOTION API ============
export const promotionAPI = {
  getAll: () => fetchAPI('/promotions'),
  getActive: () => fetchAPI('/promotions/list/active'),
  getFlashSales: () => fetchAPI('/promotions/list/flash-sale'),
  getById: (id) => fetchAPI(`/promotions/${id}`),
  create: (data) =>
    fetchAPI('/promotions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/promotions/${id}`, {
      method: 'DELETE',
    }),
  validate: (code, subtotal) =>
    fetchAPI('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),
  apply: (code) =>
    fetchAPI('/promotions/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

// ============ LUCKY SPIN API ============
export const luckySpinAPI = {
  // Get spin wheel info (requires customer auth)
  getInfo: (token) =>
    fetchAPI('/lucky-spin/info', {
      headers: { 'Authorization': `Bearer ${token}` },
    }),

  // Perform a free spin
  play: (token) =>
    fetchAPI('/lucky-spin/play', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }),

  // Exchange points for a spin
  exchangePoints: (token) =>
    fetchAPI('/lucky-spin/exchange-points', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }),

  // Get customer's coupons
  getMyCoupons: (token, status = 'all') =>
    fetchAPI(`/customer/coupons?status=${status}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }),

  // Get active coupons count
  getCouponCount: (token) =>
    fetchAPI('/customer/coupons/count', {
      headers: { 'Authorization': `Bearer ${token}` },
    }),

  // Validate a coupon for checkout
  validateCoupon: (token, code, orderSubtotal) =>
    fetchAPI('/customer/coupons/validate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ code, orderSubtotal }),
    }),
};

// ============ LUCKY SPIN ADMIN API ============
export const luckySpinAdminAPI = {
  getAdminInfo: () => fetchAPI('/admin/lucky-spin/info'),
  updateProgram: (data) =>
    fetchAPI('/admin/lucky-spin/program', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateReward: (id, data) =>
    fetchAPI(`/admin/lucky-spin/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============ NIGHT MARKET ADMIN API ============
export const nightMarketAdminAPI = {
  getConfig: () => fetchAPI('/admin/night-market/config'),
  updateConfig: (data) =>
    fetchAPI('/admin/night-market/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============ FLASH SALE ADMIN API ============
export const flashSaleAdminAPI = {
  // Config CRUD
  getConfigs: () => fetchAPI('/admin/flash-sale/configs'),
  getConfig: (id) => fetchAPI(`/admin/flash-sale/configs/${id}`),
  createConfig: (data) =>
    fetchAPI('/admin/flash-sale/configs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateConfig: (id, data) =>
    fetchAPI(`/admin/flash-sale/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteConfig: (id) =>
    fetchAPI(`/admin/flash-sale/configs/${id}`, { method: 'DELETE' }),

  // Items CRUD
  getItems: (configId) => fetchAPI(`/admin/flash-sale/items?configId=${configId}`),
  addItem: (data) =>
    fetchAPI('/admin/flash-sale/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateItem: (id, data) =>
    fetchAPI(`/admin/flash-sale/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteItem: (id) =>
    fetchAPI(`/admin/flash-sale/items/${id}`, { method: 'DELETE' }),
};

// ============ FLASH SALE PUBLIC API ============
export const flashSalePublicAPI = {
  getActive: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/flash-sale/active${query ? `?${query}` : ''}`);
  },
};

// ============ POINTS API ============
export const pointsAPI = {
  getBalance: (customerId) => fetchAPI(`/points/balance/${customerId}`),
  calculate: (customerId, orderAmount, pointsToUse = 0) =>
    fetchAPI('/points/calculate', {
      method: 'POST',
      body: JSON.stringify({ customerId, orderAmount, pointsToUse }),
    }),
  getTiers: () => fetchAPI('/points/tiers'),
  getTierStats: () => fetchAPI('/points/tiers/stats'),
  updateTier: (id, data) =>
    fetchAPI(`/points/tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============ STAFF API ============
export const staffAPI = {
  getAll: (role) => {
    const query = role ? `?role=${role}` : '';
    return fetchAPI(`/staff${query}`);
  },
  getById: (id) => fetchAPI(`/staff/${id}`),
  getRoles: () => fetchAPI('/staff/roles'),
  create: (data) =>
    fetchAPI('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (id, newPassword) =>
    fetchAPI(`/staff/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),
  toggleStatus: (id) =>
    fetchAPI(`/staff/${id}/toggle-status`, {
      method: 'PUT',
    }),
  delete: (id) =>
    fetchAPI(`/staff/${id}`, { method: 'DELETE' }),
};

// ============ SHIPPING API ============
export const shippingAPI = {
  pushToGHTK: (orderId) =>
    fetchAPI(`/shipping/ghtk/push/${orderId}`, { method: 'POST' }),
  getTracking: (orderId) => fetchAPI(`/shipping/tracking/${orderId}`),
};

// ============ ACTIVITY LOGS API ============
export const activityLogAPI = {
  getAll: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/activity-logs${query ? `?${query}` : ''}`);
  },

  getById: (id) => fetchAPI(`/activity-logs/${id}`),
};

// ============ NIGHT MARKET API ============
export const nightMarketAPI = {
  getStatus: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/night-market/status${query ? `?${query}` : ''}`);
  },

  getOffers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/night-market/offers${query ? `?${query}` : ''}`);
  },

  revealOffer: (id, token) =>
    fetchAPI(`/night-market/reveal/${id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }),
};

export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  product: productAPI,
  order: orderAPI,
  customer: customerAPI,
  inventory: inventoryAPI,
  category: categoryAPI,
  color: colorAPI,
  size: sizeAPI,
  brand: brandAPI,
  ai: aiAPI,
  notification: notificationAPI,
  promotion: promotionAPI,
  points: pointsAPI,
  luckySpin: luckySpinAPI,
  luckySpinAdmin: luckySpinAdminAPI,
  nightMarket: nightMarketAPI,
  nightMarketAdmin: nightMarketAdminAPI,
};

