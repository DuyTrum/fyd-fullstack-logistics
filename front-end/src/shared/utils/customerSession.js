// Customer session management
// Supports "Remember me" functionality with localStorage/sessionStorage

const CUSTOMER_TOKEN_KEY = 'customer_token';
const CUSTOMER_DATA_KEY = 'customer_data';
const CUSTOMER_REMEMBER_KEY = 'customer_remember';

/**
 * Set customer session with remember me logic
 * @param {string} token - JWT token
 * @param {object} customer - Customer data object
 * @param {boolean} remember - If true, persist in localStorage; otherwise use sessionStorage
 * Validates: Requirements 6.1, 6.2
 */
export function setCustomerSession(token, customer, remember = false) {
  // Clear any existing session first
  clearCustomerSession();

  const storage = remember ? localStorage : sessionStorage;

  try {
    storage.setItem(CUSTOMER_TOKEN_KEY, token);
    storage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(customer));

    // Store remember preference in localStorage to know where to look on page load
    if (remember) {
      localStorage.setItem(CUSTOMER_REMEMBER_KEY, 'true');
    }
  } catch (error) {
    console.error('Failed to save customer session:', error);
  }
}

/**
 * Get customer session from storage
 * @returns {{ token: string, customer: object } | null}
 */
export function getCustomerSession() {
  try {
    // Check localStorage first (for "remember me" sessions)
    let token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    let customerData = localStorage.getItem(CUSTOMER_DATA_KEY);

    // If not in localStorage, check sessionStorage
    if (!token) {
      token = sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
    }
    if (!customerData) {
      customerData = sessionStorage.getItem(CUSTOMER_DATA_KEY);
    }

    if (token && customerData) {
      return {
        token,
        customer: JSON.parse(customerData)
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get customer session:', error);
    return null;
  }
}

/**
 * Clear customer session from both localStorage and sessionStorage
 * Validates: Requirements 6.3
 */
export function clearCustomerSession() {
  try {
    // Clear from localStorage
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_DATA_KEY);
    localStorage.removeItem(CUSTOMER_REMEMBER_KEY);

    // Clear from sessionStorage
    sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
    sessionStorage.removeItem(CUSTOMER_DATA_KEY);
  } catch (error) {
    console.error('Failed to clear customer session:', error);
  }
}

/**
 * Check if customer is logged in
 * @returns {boolean}
 */
export function isCustomerLoggedIn() {
  const session = getCustomerSession();
  return session !== null && !!session.token;
}

/**
 * Get customer token only
 * @returns {string | null}
 */
export function getCustomerToken() {
  try {
    // Check localStorage first
    let token = localStorage.getItem(CUSTOMER_TOKEN_KEY);

    // If not in localStorage, check sessionStorage
    if (!token) {
      token = sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
    }

    return token;
  } catch (error) {
    console.error('Failed to get customer token:', error);
    return null;
  }
}

/**
 * Get customer data only
 * @returns {object | null}
 */
export function getCustomerData() {
  const session = getCustomerSession();
  return session ? session.customer : null;
}

/**
 * Alias for getCustomerData for convenience
 * @returns {object | null}
 */
export function getCustomer() {
  return getCustomerData();
}

/**
 * Update current customer data in storage
 * @param {object} partialData - New data to merge into existing customer data
 */
export function updateCustomer(partialData) {
  try {
    const remember = localStorage.getItem(CUSTOMER_REMEMBER_KEY) === 'true';
    const storage = remember ? localStorage : sessionStorage;
    
    const currentCustomer = getCustomer();
    if (currentCustomer) {
      const updatedCustomer = { ...currentCustomer, ...partialData };
      storage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(updatedCustomer));
      return updatedCustomer;
    }
  } catch (error) {
    console.error('Failed to update customer session:', error);
  }
  return null;
}

/**
 * Logout customer - alias for clearCustomerSession
 */
export function logout() {
  clearCustomerSession();
}
