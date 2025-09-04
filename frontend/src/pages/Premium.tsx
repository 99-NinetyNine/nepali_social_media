import React from 'react';

const Premium: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Go Premium</h1>
        <p className="text-gray-600">Unlock exclusive features and ad-free experience</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Monthly</h3>
          <p className="text-3xl font-bold text-primary-600 mb-4">$9.99</p>
          <button className="btn btn-primary w-full">Subscribe</button>
        </div>
        
        <div className="card p-6 text-center border-2 border-primary-500">
          <h3 className="text-xl font-bold mb-2">Yearly</h3>
          <p className="text-3xl font-bold text-primary-600 mb-4">$99.99</p>
          <button className="btn btn-primary w-full">Subscribe</button>
        </div>
        
        <div className="card p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Lifetime</h3>
          <p className="text-3xl font-bold text-primary-600 mb-4">$299.99</p>
          <button className="btn btn-primary w-full">Subscribe</button>
        </div>
      </div>
    </div>
  );
};

export default Premium;