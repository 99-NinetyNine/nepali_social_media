import React from 'react';

const Checkout: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Shipping Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <input type="text" className="input" placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <input type="text" className="input" placeholder="Doe" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address</label>
                <input type="text" className="input" placeholder="123 Main Street" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input type="text" className="input" placeholder="Kathmandu" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input type="tel" className="input" placeholder="+977-xxx-xxxx" />
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="radio" name="payment" className="mr-3" defaultChecked />
                <span>Cash on Delivery</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="payment" className="mr-3" />
                <span>Credit/Debit Card</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="payment" className="mr-3" />
                <span>Digital Wallet</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>NPR 2,999</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>NPR 100</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>NPR 390</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>NPR 3,489</span>
              </div>
            </div>
            
            <button className="btn btn-primary w-full">
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
