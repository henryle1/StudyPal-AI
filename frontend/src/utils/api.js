import { API_URL } from '../config.js'

/**
 * Get the authentication token from localStorage
 */
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

/**
 * Make an authenticated API request
 * Automatically includes the Authorization header with the JWT token
 * 
 * @param {string} endpoint - API endpoint (e.g., '/api/tasks')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}) {
  const token = getToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Build full URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers,
    // Preserve signal if provided (for AbortController)
    signal: options.signal,
  })

  return response
}

/**
 * Helper function to handle API responses with error handling
 * 
 * @param {string} endpoint - API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiCall(endpoint, options = {}) {
  const response = await apiRequest(endpoint, options)

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return null
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }

  return data
}

