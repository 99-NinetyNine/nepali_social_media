import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../../services/api';
import CreditWallet from '../../components/payment/CreditWallet';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  description: string;
  balance_after: number;
  reference_id: string;
  created_at: string;
}

const CreditHistory: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getWalletTransactions();
      setTransactions(response.data);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <span className="text-green-600">↗️</span>;
      case 'debit':
        return <span className="text-red-600">↙️</span>;
      default:
        return <span className="text-gray-600">💰</span>;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wallet Summary */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Credit Wallet</h2>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </div>
          <CreditWallet size="lg" />
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Transaction History</h1>
              <button
                onClick={() => navigate('/credits/add')}
                className="btn btn-primary"
              >
                Add Credits
              </button>
            </div>

            {error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={fetchTransactions}
                  className="btn btn-outline"
                >
                  Try Again
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">💳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600 mb-6">Your transaction history will appear here</p>
                <button
                  onClick={() => navigate('/credits/add')}
                  className="btn btn-primary"
                >
                  Add Your First Credits
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction.transaction_type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                        </p>
                        {transaction.reference_id && (
                          <p className="text-xs text-gray-400">
                            Ref: {transaction.reference_id}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        {transaction.amount.toLocaleString()} Credits
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {transaction.balance_after.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {transactions.length >= 10 && (
                  <div className="text-center pt-6 border-t">
                    <p className="text-sm text-gray-500">
                      Showing recent transactions
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditHistory;