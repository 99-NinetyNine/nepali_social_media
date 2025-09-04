import React from 'react';

const Shop: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shop</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="card p-4">
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <h3 className="font-semibold mb-2">Product {i}</h3>
            <p className="text-primary-600 font-bold">$99.99</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;