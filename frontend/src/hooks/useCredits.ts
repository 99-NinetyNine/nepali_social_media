import { useState, useEffect } from 'react';
import { paymentsApi } from '../services/api';
import toast from 'react-hot-toast';

interface Wallet {
  id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export const useCredits = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getWallet();
      setWallet(response.data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      setError('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const checkSufficientCredits = (requiredAmount: number): boolean => {
    if (!wallet) return false;
    return wallet.balance >= requiredAmount;
  };

  const deductCredits = async (amount: number, description: string): Promise<boolean> => {
    if (!checkSufficientCredits(amount)) {
      toast.error(`Insufficient credits. You need ${amount} credits but only have ${wallet?.balance || 0}.`);
      return false;
    }

    try {
      // This would be implemented when we add the deduct credits endpoint
      // For now, we'll just refresh the wallet after any transaction
      await fetchWallet();
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to process credit transaction');
      return false;
    }
  };

  const refreshBalance = () => {
    fetchWallet();
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return {
    wallet,
    loading,
    error,
    balance: wallet?.balance || 0,
    checkSufficientCredits,
    deductCredits,
    refreshBalance
  };
};