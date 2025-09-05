import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface OrderItem {
  id: number;
  product_name: string;
  variant_info: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

interface Order {
  id: number;
  order_id: string;
  status: string;
  payment_status: string;
  subtotal: string;
  tax_amount: string;
  delivery_fee: string;
  discount_amount: string;
  total_amount: string;
  delivery_address: string;
  delivery_phone: string;
  delivery_instructions: string;
  estimated_delivery_time: string | null;
  created_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  items: OrderItem[];
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/ecommerce/orders/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.results || data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-indigo-100 text-indigo-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-red-600">
        <p>{error}</p>
        <button onClick={fetchOrders} className="btn btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
        <p className="mb-6">Start shopping to see your orders here!</p>
        <button className="btn btn-primary">Start Shopping</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {orders.map((order) => (
        <div key={order.id} className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Order #{order.order_id}</h3>
              <p className="text-gray-600">
                Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {formatStatus(order.status)}
              </div>
              <p className="text-lg font-bold mt-1">NPR {parseFloat(order.total_amount).toLocaleString()}</p>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Items ({order.items.length})</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    • {item.product_name} {item.variant_info && `(${item.variant_info})`} - Qty: {item.quantity}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Delivery Address</h4>
              <p className="text-sm text-gray-600">
                {order.delivery_address.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < order.delivery_address.split('\n').length - 1 && <br />}
                  </span>
                ))}
                <br />
                Phone: {order.delivery_phone}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex space-x-3">
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">View Details</button>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">Track Order</button>
              {order.status === 'delivered' && (
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">Rate & Review</button>
              )}
            </div>

            <div className="text-right text-sm text-gray-600">
              <p>Payment: <span className="font-medium capitalize">{order.payment_status}</span></p>
              {order.estimated_delivery_time && (
                <p>Est. Delivery: {new Date(order.estimated_delivery_time).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Orders;
