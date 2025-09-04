import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Product } from '@/types';
import Button from '@/components/common/Button';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product.id);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarIconSolid key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        ))}
      </div>
    );
  };

  const getDiscountPercentage = () => {
    if (product.original_price && product.original_price > product.price) {
      return Math.round(((product.original_price - product.price) / product.original_price) * 100);
    }
    return 0;
  };

  return (
    <div className="card card-hover overflow-hidden">
      <Link to={`/shop/product/${product.id}`}>
        <div className="relative">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].image}
              alt={product.images[0].alt_text || product.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
            {product.is_featured && (
              <span className="bg-primary-600 text-white px-2 py-1 rounded text-xs font-medium">
                Featured
              </span>
            )}
            {getDiscountPercentage() > 0 && (
              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                -{getDiscountPercentage()}%
              </span>
            )}
            {product.is_realtime_delivery && (
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                Fast Delivery
              </span>
            )}
          </div>
          
          {!product.stock_quantity && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-2 rounded font-medium">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/shop/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>
        
        {/* Rating */}
        <div className="flex items-center space-x-2 mb-3">
          {renderStars(Math.round(product.average_rating))}
          <span className="text-sm text-gray-500">
            ({product.review_count})
          </span>
        </div>
        
        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">
              NPR {product.price.toLocaleString()}
            </span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-sm text-gray-500 line-through">
                NPR {product.original_price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        
        {/* Seller info */}
        <div className="flex items-center justify-between mb-4">
          <Link 
            to={`/profile/${product.seller.username}`}
            className="text-sm text-gray-500 hover:text-primary-600"
          >
            by {product.seller.username}
          </Link>
          <span className="text-sm text-gray-500">
            {product.stock_quantity} left
          </span>
        </div>
        
        {/* Add to cart button */}
        <Button
          onClick={handleAddToCart}
          disabled={!product.stock_quantity}
          className="w-full"
          size="sm"
        >
          <ShoppingCartIcon className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;