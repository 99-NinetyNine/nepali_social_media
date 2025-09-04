import React from 'react';
import { useParams } from 'react-router-dom';

const ProductDetail: React.FC = () => {
  const { productId } = useParams();
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <div className="h-96 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
        
        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">Product {productId}</h1>
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl font-bold text-primary-600">NPR 2,999</span>
            <span className="text-lg text-gray-500 line-through">NPR 3,999</span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">25% OFF</span>
          </div>
          
          <p className="text-gray-700 mb-6">
            This is a detailed description of the product. It includes all the important 
            features and specifications that customers need to know.
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center space-x-2">
                <button className="btn btn-secondary px-3">-</button>
                <span className="px-4 py-2 border rounded">1</span>
                <button className="btn btn-secondary px-3">+</button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Size</label>
              <select className="input">
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            <button className="btn btn-primary w-full">
              Add to Cart
            </button>
            <button className="btn btn-outline w-full">
              Buy Now
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">Product Details</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Free delivery within Kathmandu</li>
              <li>• 7 days return policy</li>
              <li>• Warranty: 1 year</li>
              <li>• Cash on delivery available</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;