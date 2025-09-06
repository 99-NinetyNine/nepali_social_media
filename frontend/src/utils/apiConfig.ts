// API Configuration utility
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Helper function to construct full API URLs consistently
 * @param endpoint - The API endpoint (e.g., '/posts/', '/auth/login/')
 * @returns Complete API URL
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Helper function to create fetch requests with consistent base URL and auth headers
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  return fetch(getApiUrl(endpoint), {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    }
  });
};