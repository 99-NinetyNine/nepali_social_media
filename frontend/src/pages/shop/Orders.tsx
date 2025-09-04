import React from 'react';

const Orders: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      
      <div className="space-y-6">
        {[1, 2, 3].map((order) => (
          <div key={order} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Order #ORD-2024-{order.toString().padStart(3, '0')}
                </h3>
                <p className="text-gray-600">
                  Placed on January {15 + order}, 2024
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  order === 1 ? 'bg-green-100 text-green-800' :
                  order === 2 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order === 1 ? 'Delivered' : order === 2 ? 'In Transit' : 'Processing'}
                </div>
                <p className="text-lg font-bold mt-1">NPR {(2999 + order * 500).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Items ({order + 1})</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Product {order} - Qty: {order}</li>
                    <li>• Product {order + 1} - Qty: 1</li>
                    {order > 1 && <li>• Product {order + 2} - Qty: 2</li>}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Delivery Address</h4>
                  <p className="text-sm text-gray-600">
                    123 Main Street<br />
                    Kathmandu, Nepal<br />
                    Phone: +977-98XXXXXXXX
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="flex space-x-3">
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View Details
                  </button>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Track Order
                  </button>
                  {order === 1 && (
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Rate & Review
                    </button>
                  )}
                </div>
                
                {order === 1 && (
                  <button className="btn btn-outline btn-sm">
                    Reorder
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty state would go here if no orders */}
      <div className="text-center py-12 hidden">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
        <p className="text-gray-600 mb-6">Start shopping to see your orders here!</p>
        <button className="btn btn-primary">
          Start Shopping
        </button>
      </div>
    </div>
  );
};

export default Orders;
