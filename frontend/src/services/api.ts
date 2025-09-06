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
  
  getPortalPreferences: () =>
    api.get('/auth/portal-preferences/'),
  
  updatePortalPreferences: (data: any) =>
    api.post('/auth/portal-preferences/update/', data),
  
  getGoogleAuthUrl: () =>
    api.get('/auth/google/auth-url/'),
  
  handleGoogleCallback: (data: any) =>
    api.post('/auth/google/callback/', data),
  
  completeProfile: (data: any) =>
    api.post('/auth/complete-profile/', data),
  
  getPurchaseOptions: () =>
    api.get('/auth/purchase-options/'),
  
  purchaseTick: (tickType: string, durationMonths: number = 1) =>
    api.post('/auth/purchase/tick/', { tick_type: tickType, duration_months: durationMonths }),
  
  purchasePremium: (durationMonths: number = 1) =>
    api.post('/auth/purchase/premium/', { duration_months: durationMonths }),
  
  getSubscriptionTiers: () =>
    api.get('/auth/subscription-tiers/'),
  
  purchaseSubscriptionTier: (data: { target_tier: number; is_yearly: boolean }) =>
    api.post('/auth/purchase/subscription-tier/', data),
  
  getUserSubscriptionStatus: () =>
    api.get('/auth/subscription-status/'),
};

// Accounts API (for organizations and other account-related features)
export const accountsApi = {
  getCompanies: () =>
    api.get('/auth/companies/'),
  
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
  
  // Jobs API
  getJobs: (params?: any) =>
    api.get('/auth/jobs/', { params }),
  
  getJobRecommendations: () =>
    api.get('/auth/jobs/recommendations/'),
  
  applyForJob: (data: any) =>
    api.post('/auth/jobs/apply/', data),
  
  getJobApplicationsToReview: (jobId: number) =>
    api.get(`/auth/jobs/${jobId}/applications_to_review/`),
  
  reviewJobApplication: (jobId: number, data: any) =>
    api.post(`/auth/jobs/${jobId}/review_application/`, data),
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
  
  trackView: (postId: number, duration?: number) =>
    api.post(`/posts/${postId}/track_view/`, { duration }),
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
  
  // Shop management
  getShops: () =>
    api.get('/ecommerce/shops/'),
  
  getShop: (id: number) =>
    api.get(`/ecommerce/shops/${id}/`),
  
  createShop: (data: FormData) =>
    api.post('/ecommerce/shops/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  updateShop: (id: number, data: FormData) =>
    api.put(`/ecommerce/shops/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  deleteShop: (id: number) =>
    api.delete(`/ecommerce/shops/${id}/`),
  
  getShopStats: (id: number) =>
    api.get(`/ecommerce/shops/${id}/stats/`),
  
  getShopPricingInfo: () =>
    api.get('/ecommerce/shops/pricing_info/'),
  
  createProduct: (data: FormData) =>
    api.post('/ecommerce/products/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  updateProduct: (id: number, data: FormData) =>
    api.put(`/ecommerce/products/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  deleteProduct: (id: number) =>
    api.delete(`/ecommerce/products/${id}/`),
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