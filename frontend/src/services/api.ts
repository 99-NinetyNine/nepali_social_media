import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          const newToken = response.data.access;
          useAuthStore.getState().updateToken(newToken);
          
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  
  register: (userData: any) =>
    api.post('/auth/register/', userData),
  
  getProfile: () =>
    api.get('/auth/profile/'),
  
  updateProfile: (data: any) =>
    api.patch('/auth/profile/', data),
  
  getPublicProfile: (username: string) =>
    api.get(`/auth/profile/${username}/`),
  
  followUser: (username: string) =>
    api.post(`/auth/follow/${username}/`),
  
  getFollowRequests: () =>
    api.get('/auth/follow-requests/'),
  
  approveFollowRequest: (connectionId: number, action: 'approve' | 'reject') =>
    api.post(`/auth/follow-requests/${connectionId}/`, { action }),
  
  getFollowers: (username: string) =>
    api.get(`/auth/profile/${username}/followers/`),
  
  getFollowing: (username: string) =>
    api.get(`/auth/profile/${username}/following/`),
  
  getUserPosts: (username: string) =>
    api.get(`/auth/profile/${username}/posts/`),
};

// Accounts API (for organizations and other account-related features)
export const accountsApi = {
  getCompanies: () =>
    api.get('/accounts/companies/'),
  
  getCompany: (id: number) =>
    api.get(`/accounts/companies/${id}/`),
  
  createCompany: (data: FormData) =>
    api.post('/accounts/companies/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  updateCompany: (id: number, data: FormData) =>
    api.put(`/accounts/companies/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  deleteCompany: (id: number) =>
    api.delete(`/accounts/companies/${id}/`),
  
  getCompanyStats: (id: number) =>
    api.get(`/accounts/companies/${id}/stats/`),
  
  verifyCompany: (id: number) =>
    api.post(`/accounts/companies/${id}/verify/`),
};

// Posts API
export const postsApi = {
  getPosts: (params?: any) =>
    api.get('/posts/', { params }),
  
  getPost: (id: number) =>
    api.get(`/posts/${id}/`),
  
  createPost: (data: FormData) =>
    api.post('/posts/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  likePost: (postId: number, reactionType: string = 'like') =>
    api.post(`/posts/${postId}/like/`, { reaction_type: reactionType }),
  
  sharePost: (postId: number, message: string = '') =>
    api.post(`/posts/${postId}/share/`, { message }),
  
  getComments: (postId: number) =>
    api.get(`/posts/${postId}/comments/`),
  
  createComment: (postId: number, content: string, parentId?: number) =>
    api.post(`/posts/${postId}/comments/`, { content, parent: parentId }),
};

// E-commerce API
export const shopApi = {
  getProducts: (params?: any) =>
    api.get('/ecommerce/products/', { params }),
  
  getProduct: (id: number) =>
    api.get(`/ecommerce/products/${id}/`),
  
  getCategories: () =>
    api.get('/ecommerce/categories/'),
  
  getCart: () =>
    api.get('/ecommerce/cart/'),
  
  addToCart: (productId: number, quantity: number, variantId?: number) =>
    api.post('/ecommerce/cart/add_item/', { 
      product_id: productId, 
      quantity, 
      variant_id: variantId 
    }),
  
  updateCartItem: (itemId: number, quantity: number) =>
    api.patch(`/ecommerce/cart/items/${itemId}/`, { quantity }),
  
  removeFromCart: (itemId: number) =>
    api.delete(`/ecommerce/cart/items/${itemId}/`),
  
  createOrder: (data: any) =>
    api.post('/ecommerce/orders/', data),
  
  getOrders: () =>
    api.get('/ecommerce/orders/'),
};

// Payments API
export const paymentsApi = {
  getPremiumPlans: () =>
    api.get('/payments/plans/'),
  
  subscribePremium: (planId: number, paymentMethod: string = 'khalti') =>
    api.post('/payments/subscribe/', { plan_id: planId, payment_method: paymentMethod }),
  
  confirmPayment: (invoiceId: string, paymentIntentId: string) =>
    api.post('/payments/confirm-payment/', { 
      invoice_id: invoiceId, 
      payment_intent_id: paymentIntentId 
    }),
  
  verifyKhaltiPayment: (invoiceId: string, pidx: string) =>
    api.post('/payments/verify-khalti/', { 
      invoice_id: invoiceId, 
      pidx: pidx 
    }),
  
  getWallet: () =>
    api.get('/payments/wallet/'),
  
  addFunds: (amount: number, paymentMethod: string = 'khalti') =>
    api.post('/payments/wallet/add-funds/', { amount, payment_method: paymentMethod }),
  
  getInvoices: () =>
    api.get('/payments/invoices/'),
  
  getWalletTransactions: () =>
    api.get('/payments/wallet/transactions/'),
};

export default api;