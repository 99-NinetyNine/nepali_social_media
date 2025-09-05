import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Category } from '../../types';

const CreateProduct: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    product_type: 'other',
    price: '',
    original_price: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    is_realtime_delivery: false,
    preparation_time: '30',
    weight: '',
    dimensions: { length: '', width: '', height: '' },
    is_featured: false,
    meta_title: '',
    meta_description: ''
  });
  const [images, setImages] = useState<FileList | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await shopApi.getCategories();
      setCategories(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('dimensions.')) {
      const dimensionKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimensionKey]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim() || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.category) {
      alert('Please select a category');
      return;
    }

    setIsLoading(true);
    try {
      const productData = new FormData();
      
      // Basic product info
      productData.append('name', formData.name);
      productData.append('description', formData.description);
      productData.append('category', formData.category);
      productData.append('product_type', formData.product_type);
      productData.append('price', formData.price);
      
      if (formData.original_price) {
        productData.append('original_price', formData.original_price);
      }
      
      productData.append('stock_quantity', formData.stock_quantity || '0');
      productData.append('low_stock_threshold', formData.low_stock_threshold);
      productData.append('is_realtime_delivery', formData.is_realtime_delivery.toString());
      
      if (formData.is_realtime_delivery) {
        productData.append('preparation_time', formData.preparation_time);
      }
      
      if (formData.weight) {
        productData.append('weight', formData.weight);
      }
      
      // Dimensions
      const dimensionsObj = {
        length: parseFloat(formData.dimensions.length) || 0,
        width: parseFloat(formData.dimensions.width) || 0,
        height: parseFloat(formData.dimensions.height) || 0
      };
      productData.append('dimensions', JSON.stringify(dimensionsObj));
      
      productData.append('is_featured', formData.is_featured.toString());
      
      if (formData.meta_title) {
        productData.append('meta_title', formData.meta_title);
      }
      
      if (formData.meta_description) {
        productData.append('meta_description', formData.meta_description);
      }

      // Add images
      if (images) {
        Array.from(images).forEach((image, index) => {
          productData.append('images', image);
        });
      }

      const response = await fetch('/api/ecommerce/products/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: productData
      });

      if (response.ok) {
        alert('Product created successfully!');
        navigate('/shop/manage');
      } else {
        const errorData = await response.json();
        alert(`Failed to create product: ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      console.error('Error creating product:', err);
      alert('Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Create Product</h1>
        <button
          onClick={() => navigate('/shop/manage')}
          className="btn btn-outline"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Name *
              </label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input" 
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input"
                required
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description *
            </label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input" 
              rows={4} 
              placeholder="Describe your product..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Product Type
            </label>
            <select
              name="product_type"
              value={formData.product_type}
              onChange={handleInputChange}
              className="input"
            >
              <option value="food_realtime">Food - Real Time</option>
              <option value="food_packaged">Food - Packaged</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="books">Books</option>
              <option value="home_garden">Home & Garden</option>
              <option value="sports">Sports & Outdoors</option>
              <option value="beauty">Beauty & Personal Care</option>
              <option value="automotive">Automotive</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Pricing & Inventory</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Price (NPR) *
              </label>
              <input 
                type="number" 
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="input" 
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Original Price (NPR)
              </label>
              <input 
                type="number" 
                name="original_price"
                value={formData.original_price}
                onChange={handleInputChange}
                className="input" 
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">For showing discounts</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Stock Quantity
              </label>
              <input 
                type="number" 
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleInputChange}
                className="input" 
                placeholder="0"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Low Stock Threshold
            </label>
            <input 
              type="number" 
              name="low_stock_threshold"
              value={formData.low_stock_threshold}
              onChange={handleInputChange}
              className="input" 
              placeholder="10"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when stock goes below this number</p>
          </div>
        </div>

        {formData.product_type === 'food_realtime' && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Real-time Delivery Settings</h2>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="is_realtime_delivery"
                name="is_realtime_delivery"
                checked={formData.is_realtime_delivery}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="is_realtime_delivery" className="text-sm font-medium">
                Enable real-time delivery
              </label>
            </div>
            
            {formData.is_realtime_delivery && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preparation Time (minutes)
                </label>
                <input 
                  type="number" 
                  name="preparation_time"
                  value={formData.preparation_time}
                  onChange={handleInputChange}
                  className="input" 
                  placeholder="30"
                  min="1"
                />
              </div>
            )}
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Product Images</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Images
            </label>
            <input 
              type="file" 
              onChange={handleImageChange}
              className="input" 
              multiple
              accept="image/*"
            />
            <p className="text-xs text-gray-500 mt-1">Upload multiple images. First image will be primary.</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Weight (kg)
              </label>
              <input 
                type="number" 
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                className="input" 
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_featured"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="is_featured" className="text-sm font-medium">
                Featured Product
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Length (cm)
              </label>
              <input 
                type="number" 
                name="dimensions.length"
                value={formData.dimensions.length}
                onChange={handleInputChange}
                className="input" 
                placeholder="0"
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Width (cm)
              </label>
              <input 
                type="number" 
                name="dimensions.width"
                value={formData.dimensions.width}
                onChange={handleInputChange}
                className="input" 
                placeholder="0"
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Height (cm)
              </label>
              <input 
                type="number" 
                name="dimensions.height"
                value={formData.dimensions.height}
                onChange={handleInputChange}
                className="input" 
                placeholder="0"
                step="0.1"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">SEO Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Title
              </label>
              <input 
                type="text" 
                name="meta_title"
                value={formData.meta_title}
                onChange={handleInputChange}
                className="input" 
                placeholder="SEO title for search engines"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">Max 60 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Description
              </label>
              <textarea 
                name="meta_description"
                value={formData.meta_description}
                onChange={handleInputChange}
                className="input" 
                rows={2} 
                placeholder="SEO description for search engines"
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">Max 160 characters</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate('/shop/manage')}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProduct;