import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePortalPreferences } from './hooks/usePortalPreferences';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import GoogleCallback from './pages/auth/GoogleCallback';
import Profile from './pages/Profile';
import Shop from './pages/shop/Shop';
import ProductDetail from './pages/shop/ProductDetail';
import Cart from './pages/shop/Cart';
import Checkout from './pages/shop/Checkout';
import Orders from './pages/shop/Orders';
import Shops from './pages/shop/Shops';
import ShopForm from './pages/shop/ShopForm';
import ShopDetail from './pages/shop/ShopDetail';
import Premium from './pages/Premium';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Jobs from './pages/Jobs';
import Stories from './pages/Stories';
import Shorts from './pages/Shorts';
import Settings from './pages/Settings';
import AddCredits from './pages/payment/AddCredits';
import PaymentSuccess from './pages/payment/PaymentSuccess';
import PaymentFailed from './pages/payment/PaymentFailed';
import CreditHistory from './pages/payment/CreditHistory';

function App() {
  const { user, isLoading } = useAuthStore();
  const { preferences } = usePortalPreferences();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      
      <main className={user ? 'pt-16' : ''}>
        <Routes>
          {/* Public routes */}
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<GoogleCallback />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              {/* Protected routes */}
              <Route path="/" element={<Home />} />
              <Route path="/profile/:username?" element={<Profile />} />
              <Route path="/create-post" element={<CreatePost />} />
              <Route path="/post/:postId" element={<PostDetail />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/shorts" element={<Shorts />} />
              {preferences.enable_job_portal && <Route path="/jobs" element={<Jobs />} />}
              <Route path="/premium" element={<Premium />} />
              <Route path="/settings" element={<Settings />} />
              
              {/* Payment routes */}
              <Route path="/credits/add" element={<AddCredits />} />
              <Route path="/credits/history" element={<CreditHistory />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              
              {/* Shop routes - conditional */}
              {preferences.enable_shop_portal && (
                <>
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/shop/product/:productId" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/orders" element={<Orders />} />
                  
                  {/* Shop Management Routes */}
                  <Route path="/shops" element={<Shops />} />
                  <Route path="/shop/create" element={<ShopForm />} />
                  <Route path="/shop/:id" element={<ShopDetail />} />
                  <Route path="/shop/:id/edit" element={<ShopForm />} />
                </>
              )}
              
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/auth/callback" element={<GoogleCallback />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

export default App;