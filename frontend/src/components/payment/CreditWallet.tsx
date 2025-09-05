import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { CreditCardIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Wallet {
  id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

interface CreditWalletProps {
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CreditWallet: React.FC<CreditWalletProps> = ({ 
  showActions = true, 
  size = 'md' 
}) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getWallet();
      setWallet(response.data);
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      setError('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={fetchWallet}
          className="text-primary-600 hover:text-primary-700 text-sm mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const textSizes = {
    sm: { balance: 'text-lg', label: 'text-xs' },
    md: { balance: 'text-xl', label: 'text-sm' },
    lg: { balance: 'text-2xl', label: 'text-base' }
  };

  return (
    <div className={`bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg text-white ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white bg-opacity-20 rounded-full p-2">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div>
            <p className={`font-bold ${textSizes[size].balance}`}>
              {wallet?.balance?.toLocaleString() || '0'} Credits
            </p>
            <p className={`text-primary-100 ${textSizes[size].label}`}>
              Available Balance
            </p>
          </div>
        </div>

        {showActions && (
          <Link 
            to="/credits/add"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
            title="Add Credits"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        )}
      </div>

      {size !== 'sm' && wallet && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-primary-400">
          <div>
            <p className={`font-medium ${textSizes[size].balance}`}>
              {wallet.total_earned?.toLocaleString() || '0'}
            </p>
            <p className={`text-primary-100 ${textSizes[size].label}`}>
              Total Earned
            </p>
          </div>
          <div>
            <p className={`font-medium ${textSizes[size].balance}`}>
              {wallet.total_spent?.toLocaleString() || '0'}
            </p>
            <p className={`text-primary-100 ${textSizes[size].label}`}>
              Total Spent
            </p>
          </div>
        </div>
      )}

      {wallet?.is_frozen && (
        <div className="mt-3 p-2 bg-red-500 bg-opacity-80 rounded text-sm">
          ⚠️ Wallet is frozen. Contact support for assistance.
        </div>
      )}
    </div>
  );
};

export default CreditWallet;