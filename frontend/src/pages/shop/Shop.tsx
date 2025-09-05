import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopApi } from '../../services/api';
import { Product, Category } from '../../types';
import ProductCard from '../../components/shop/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState<number>(0);

  useEffect(() => {
    fetchInitialData();
    fetchCartItemCount();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchTerm]);

  const fetchInitialData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        shopApi.getProducts(),
        shopApi.getCategories()
      ]);
      setProducts(productsRes.data.results || productsRes.data);
      setCategories(categoriesRes.data.results);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching shop data:', error);
      setError('Failed to load shop data');
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      
      const response = await shopApi.getProducts(params);
      setProducts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCartItemCount = async () => {
    try {
      const response = await shopApi.getCart();
      const cart = response.data;
      const totalItems = cart.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;
      setCartItemCount(totalItems);
    } catch (error) {
      console.log('No cart items or error fetching cart');
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await shopApi.addToCart(productId, 1);
      alert('Product added to cart!');
      fetchCartItemCount(); // Refresh cart count
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center">
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
          <button onClick={fetchInitialData} className="btn btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Shop</h1>
        <Link to="/cart" className="btn btn-primary relative">
          🛒 Cart
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Search Products</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for products..."
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p>No products found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => handleAddToCart(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Shop;