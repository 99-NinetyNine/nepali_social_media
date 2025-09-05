import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCredits } from '../../hooks/useCredits';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

interface ShopFormData {
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  business_license: string;
  tax_id: string;
  max_products: number;
  is_active: boolean;
}

const ShopForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { balance, checkSufficientCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [error, setError] = useState<string>('');

  const SHOP_FEE = 75;
  const isEditing = !!id;

  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    business_license: '',
    tax_id: '',
    max_products: 100,
    is_active: true
  });

  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    if (isEditing) {
      fetchShopData();
    }
  }, [id]);

  const fetchShopData = async () => {
    if (!id) return;

    try {
      setInitialLoading(true);
      const response = await fetch(`/api/ecommerce/shops/${id}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch shop data');
      const shop = await response.json();
      
      setFormData({
        name: shop.name || '',
        description: shop.description || '',
        contact_email: shop.contact_email || '',
        contact_phone: shop.contact_phone || '',
        address: shop.address || '',
        business_license: shop.business_license || '',
        tax_id: shop.tax_id || '',
        max_products: shop.max_products || 100,
        is_active: shop.is_active ?? true
      });

      if (shop.logo) {
        setLogoPreview(shop.logo);
      }
    } catch (error: any) {
      console.error('Error fetching shop:', error);
      setError('Failed to load shop data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Logo file must be smaller than 5MB');
        return;
      }
      
      setLogo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check credits for new shops
    if (!isEditing && !checkSufficientCredits(SHOP_FEE)) {
      // Check if this is the first shop (free)
      try {
        const pricingResponse = await fetch('/api/ecommerce/shops/pricing_info/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          if (!pricingData.first_shop_free) {
            toast.error(`Insufficient credits. You need ${SHOP_FEE} credits to create additional shops.`);
            return;
          }
        }
      } catch (error) {
        // If we can't check, let the backend handle it
      }
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          submitData.append(key, value.toString());
        } else if (value !== null && value !== undefined) {
          submitData.append(key, value.toString());
        }
      });

      if (logo) {
        submitData.append('logo', logo);
      }

      const url = isEditing ? `/api/ecommerce/shops/${id}/` : '/api/ecommerce/shops/';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save shop');
      }

      const responseData = await response.json();
      toast.success(isEditing ? 'Shop updated successfully' : 'Shop created successfully');
      navigate(`/shop/${responseData.id}`);
    } catch (error: any) {
      console.error('Error saving shop:', error);
      toast.error(error.message || 'Failed to save shop');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate('/shops')}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Shop' : 'Create Shop'}
          </h1>
          {!isEditing && (
            <p className="text-gray-600 mt-2">
              First shop is free. Additional shops cost {SHOP_FEE} credits.
              Current balance: <span className="font-medium">{balance} credits</span>
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Shop Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter shop name"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input"
                rows={4}
                placeholder="Describe your shop..."
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Shop Logo</label>
              <div className="flex items-center space-x-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border">
                    <BuildingStorefrontIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="input"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 5MB. Recommended: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                className="input"
                placeholder="contact@shop.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contact Phone</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                className="input"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="input"
                rows={3}
                placeholder="Shop address..."
              />
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Business Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Business License</label>
              <input
                type="text"
                name="business_license"
                value={formData.business_license}
                onChange={handleInputChange}
                className="input"
                placeholder="License number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tax ID</label>
              <input
                type="text"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
                className="input"
                placeholder="Tax identification number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Maximum Products</label>
              <input
                type="number"
                name="max_products"
                value={formData.max_products}
                onChange={handleInputChange}
                className="input"
                min="1"
                max="10000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of products allowed in this shop
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm font-medium">Shop is active</label>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/shops')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
              </div>
            ) : (
              isEditing ? 'Update Shop' : 'Create Shop'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShopForm;