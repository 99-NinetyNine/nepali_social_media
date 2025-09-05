import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCredits } from '../../hooks/useCredits';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Shop {
  id: number;
  name: string;
  description: string;
  logo?: string;
  is_active: boolean;
  status: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  slug: string;
  total_sales: string;
  total_orders: number;
  average_rating: string;
  product_count: number;
  max_products: number;
  can_add_product: boolean;
  created_at: string;
  updated_at: string;
}

interface ShopPricingInfo {
  shop_fee: number;
  current_balance: number;
  existing_shops_count: number;
  first_shop_free: boolean;
  can_create_shop: boolean;
}

const Shops: React.FC = () => {
  const navigate = useNavigate();
  const { balance, refreshBalance } = useCredits();
  const [shops, setShops] = useState<Shop[]>([]);
  const [pricingInfo, setPricingInfo] = useState<ShopPricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchShops();
    fetchPricingInfo();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ecommerce/shops/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch shops');
      const data = await response.json();
      setShops(data.results || data);
    } catch (error: any) {
      console.error('Error fetching shops:', error);
      setError('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingInfo = async () => {
    try {
      const response = await fetch('/api/ecommerce/shops/pricing_info/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch pricing info');
      const data = await response.json();
      setPricingInfo(data);
    } catch (error: any) {
      console.error('Error fetching pricing info:', error);
    }
  };

  const handleCreateShop = () => {
    if (pricingInfo && !pricingInfo.can_create_shop) {
      toast.error(`Insufficient credits. You need ${pricingInfo.shop_fee} credits to create additional shops.`);
      return;
    }

    navigate('/shop/create');
  };

  const handleDeleteShop = async (shop: Shop) => {
    if (!window.confirm(`Are you sure you want to delete "${shop.name}"? This action cannot be undone and will also delete all products in this shop.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ecommerce/shops/${shop.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete shop');
      
      toast.success('Shop deleted successfully');
      fetchShops();
      refreshBalance();
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      toast.error('Failed to delete shop');
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XMarkIcon className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }

    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckBadgeIcon className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XMarkIcon className="w-3 h-3 mr-1" />
            Suspended
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending Review
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button onClick={fetchShops} className="btn btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Shops</h1>
          <p className="text-gray-600 mt-2">
            Manage your online stores and products
          </p>
        </div>
        <button
          onClick={handleCreateShop}
          className="btn btn-primary flex items-center space-x-2"
          disabled={pricingInfo ? !pricingInfo.can_create_shop : false}
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Shop</span>
        </button>
      </div>

      {/* Pricing Info */}
      {pricingInfo && pricingInfo.existing_shops_count >= 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Additional Shops</h3>
              <p className="text-sm text-blue-700 mt-1">
                {pricingInfo.first_shop_free ? 'Your first shop was free! ' : ''}
                Creating additional shops costs {pricingInfo.shop_fee} credits each. 
                Your current balance: <span className="font-medium">{pricingInfo.current_balance} credits</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shops List */}
      {shops.length === 0 ? (
        <div className="text-center py-12">
          <BuildingStorefrontIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shops yet</h3>
          <p className="text-gray-600 mb-6">Create your first shop to start selling products</p>
          <button
            onClick={handleCreateShop}
            className="btn btn-primary"
          >
            Create Your First Shop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <div key={shop.id} className="card hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {shop.logo ? (
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <BuildingStorefrontIcon className="h-6 w-6 text-primary-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                      <p className="text-sm text-gray-500">{shop.product_count}/{shop.max_products} products</p>
                    </div>
                  </div>
                  {getStatusBadge(shop.status, shop.is_active)}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {shop.description}
                </p>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div>💰 Sales: NPR {parseFloat(shop.total_sales).toLocaleString()}</div>
                  <div>📦 Orders: {shop.total_orders}</div>
                  <div>⭐ Rating: {parseFloat(shop.average_rating).toFixed(1)}/5</div>
                  {shop.contact_email && <div>📧 {shop.contact_email}</div>}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Link
                      to={`/shop/${shop.id}`}
                      className="text-blue-600 hover:text-blue-700"
                      title="View Shop"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/shop/${shop.id}/edit`}
                      className="text-green-600 hover:text-green-700"
                      title="Edit Shop"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteShop(shop)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete Shop"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Created {new Date(shop.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shops;