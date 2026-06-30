// customerAuthApi.js - API service for Customer Authentication

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_BASE = `${VITE_API_URL}/api/customer/auth`;

/**
 * Helper function for customer auth API calls
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - API response
 */
async function fetchCustomerAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Get token from localStorage or sessionStorage
  const token = localStorage.getItem('customer_token') || sessionStorage.getItem('customer_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response body
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Return error response with success: false
      return {
        success: false,
        message: data.message || `HTTP ${response.status}`,
        ...data,
      };
    }

    return data;
  } catch (error) {
    console.error(`Customer Auth API Error [${endpoint}]:`, error);
    return {
      success: false,
      message: 'Không thể kết nối server',
    };
  }
}

/**
 * Customer Authentication API
 * Provides methods for customer login, registration, OAuth, and session management
 */
export const customerAuthAPI = {
  /**
   * Login with email and password
   * @param {string} email - Customer email
   * @param {string} password - Customer password
   * @returns {Promise<AuthResponse>} - Authentication response with token and customer data
   * 
   * Validates: Requirements 1.2
   */
  login: (email, password) =>
    fetchCustomerAPI('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /**
   * Register a new customer account
   * @param {RegisterData} data - Registration data (fullName, email, password)
   * @returns {Promise<AuthResponse>} - Authentication response
   * 
   * Validates: Requirements 3.3
   */
  register: (data) =>
    fetchCustomerAPI('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Login with Google OAuth token
   * @param {string} token - Google OAuth access token
   * @returns {Promise<AuthResponse>} - Authentication response with token and customer data
   * 
   * Validates: Requirements 2.3
   */
  googleLogin: (token) =>
    fetchCustomerAPI('/oauth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken: token }),
    }),

  /**
   * Login with Facebook OAuth token
   * @param {string} token - Facebook OAuth access token
   * @returns {Promise<AuthResponse>} - Authentication response with token and customer data
   * 
   * Validates: Requirements 2.3
   */
  facebookLogin: (token) =>
    fetchCustomerAPI('/oauth/facebook', {
      method: 'POST',
      body: JSON.stringify({ accessToken: token }),
    }),

  /**
   * Get current authenticated customer info
   * @returns {Promise<CustomerData>} - Current customer data
   * 
   * Validates: Requirements 7.5
   */
  getMe: () => fetchCustomerAPI('/me'),

  /**
   * Logout - clears customer session
   * Note: This is a client-side operation that clears stored tokens
   */
  logout: () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_data');
    sessionStorage.removeItem('customer_token');
    sessionStorage.removeItem('customer_data');
  },
};

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Whether authentication was successful
 * @property {string} [token] - JWT token if successful
 * @property {CustomerData} [customer] - Customer data if successful
 * @property {string} [message] - Error message if failed
 */

/**
 * @typedef {Object} RegisterData
 * @property {string} fullName - Customer full name
 * @property {string} email - Customer email
 * @property {string} password - Customer password
 */

/**
 * @typedef {Object} CustomerData
 * @property {number} id - Customer ID
 * @property {string} fullName - Customer full name
 * @property {string} email - Customer email
 * @property {string} [phone] - Customer phone number
 * @property {string} [avatar] - Customer avatar URL
 */

export default customerAuthAPI;
