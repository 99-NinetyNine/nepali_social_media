import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  XMarkIcon,
  PlusIcon,
  ChartBarIcon,
  ArrowLeftIcon
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
  business_license: string;
  tax_id: string;
  max_products: number;
  slug: string;
  total_sales: string;
  total_orders: number;
  average_rating: string;
  product_count: number;
  can_add_product: boolean;
  created_at: string;
  updated_at: string;
}

interface ShopStats {
  total_products: number;
  max_products: number;
  can_add_product: boolean;
  total_sales: number;
  total_orders: number;
  average_rating: number;
  status: string;
}

const ShopDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchShopDetails();
    }
  }, [id]);

  const fetchShopDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [shopRes, statsRes] = await Promise.all([
        fetch(`/api/ecommerce/shops/${id}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`/api/ecommerce/shops/${id}/stats/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      if (!shopRes.ok) throw new Error('Failed to fetch shop details');
      
      const shopData = await shopRes.json();
      setShop(shopData);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error: any) {
      console.error('Error fetching shop details:', error);
      setError('Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shop) return;
    
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
      navigate('/shops');
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      toast.error('Failed to delete shop');
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <XMarkIcon className="w-4 h-4 mr-2" />
          Inactive
        </span>
      );
    }

    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckBadgeIcon className="w-4 h-4 mr-2" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XMarkIcon className="w-4 h-4 mr-2" />
            Suspended
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
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

  if (error || !shop) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>{error || 'Shop not found'}</p>
          <Link to="/shops" className="btn btn-primary mt-4">
            Back to Shops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/shops')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{shop.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              {getStatusBadge(shop.status, shop.is_active)}
              <span className="text-gray-600 text-sm">
                {shop.product_count}/{shop.max_products} products
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/shop/${shop.id}/edit`}
            className="btn btn-outline flex items-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            className="btn btn-outline-red flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shop Overview */}
          <div className="card p-6">
            <div className="flex items-start space-x-4 mb-6">
              {shop.logo ? (
                <img
                  src={shop.logo}
                  alt={shop.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 bg-primary-100 rounded-lg flex items-center justify-center">
                  <BuildingStorefrontIcon className="h-10 w-10 text-primary-600" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">About {shop.name}</h2>
                <p className="text-gray-600">{shop.description}</p>
              </div>
            </div>
          </div>

          {/* Shop Stats */}
          {stats && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Shop Performance
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_products}</div>
                  <div className="text-sm text-gray-600">Products</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">NPR {stats.total_sales.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Sales</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.total_orders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.average_rating.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Product Limit</span>
                  <span className="text-sm font-medium">
                    {stats.total_products}/{stats.max_products}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(stats.total_products / stats.max_products) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shop Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Shop Details</h3>
            <div className="space-y-3 text-sm">
              {shop.business_license && (
                <div>
                  <span className="text-gray-600">Business License:</span>
                  <span className="ml-2 font-medium">{shop.business_license}</span>
                </div>
              )}
              {shop.tax_id && (
                <div>
                  <span className="text-gray-600">Tax ID:</span>
                  <span className="ml-2 font-medium">{shop.tax_id}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Max Products:</span>
                <span className="ml-2 font-medium">{shop.max_products}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{shop.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {(shop.contact_email || shop.contact_phone || shop.address) && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3 text-sm">
                {shop.contact_email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <a href={`mailto:${shop.contact_email}`} className="ml-2 text-blue-600 hover:text-blue-700">
                      {shop.contact_email}
                    </a>
                  </div>
                )}
                {shop.contact_phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <a href={`tel:${shop.contact_phone}`} className="ml-2 text-blue-600 hover:text-blue-700">
                      {shop.contact_phone}
                    </a>
                  </div>
                )}
                {shop.address && (
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <div className="ml-2 text-gray-900 whitespace-pre-line">{shop.address}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to={`/products/create?shop=${shop.id}`}
                className={`w-full btn ${shop.can_add_product ? 'btn-primary' : 'btn-outline'} flex items-center justify-center space-x-2`}
                title={shop.can_add_product ? 'Add new product' : 'Product limit reached'}
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Product</span>
              </Link>
              <Link
                to={`/products?shop=${shop.id}`}
                className="w-full btn btn-outline flex items-center justify-center space-x-2"
              >
                <span>View Products</span>
              </Link>
              {!shop.can_add_product && (
                <p className="text-xs text-red-600 text-center">
                  Product limit reached ({shop.product_count}/{shop.max_products})
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopDetail;