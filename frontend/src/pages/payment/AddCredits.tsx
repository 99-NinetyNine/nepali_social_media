import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../../services/api';
import CreditWallet from '../../components/payment/CreditWallet';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AddCredits: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  const predefinedAmounts = [50, 100, 250, 500, 1000, 2000];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setUseCustomAmount(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    setUseCustomAmount(true);
    if (value && !isNaN(Number(value))) {
      setSelectedAmount(Number(value));
    }
  };

  const handleAddCredits = async () => {
    const amount = useCustomAmount ? Number(customAmount) : selectedAmount;
    
    if (amount < 10) {
      toast.error('Minimum amount is NPR 10');
      return;
    }

    if (amount > 50000) {
      toast.error('Maximum amount is NPR 50,000');
      return;
    }

    setIsLoading(true);

    try {
      const response = await paymentsApi.addFunds(amount, 'khalti');
      
      if (response.data.payment_url) {
        // Store payment details for verification later
        localStorage.setItem('pending_payment', JSON.stringify({
          invoice_id: response.data.invoice_id,
          pidx: response.data.pidx,
          amount: amount,
          type: 'credits'
        }));
        
        // Redirect to Khalti payment page
        window.location.href = response.data.payment_url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Credit Wallet Display */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Current Balance</h2>
          <CreditWallet showActions={false} size="lg" />
          
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How Credits Work</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 1 NPR = 1 Credit</li>
              <li>• Use for subscriptions, boosting posts</li>
              <li>• Secure payments via Khalti</li>
              <li>• Instant credit addition</li>
            </ul>
          </div>
        </div>

        {/* Add Credits Form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Add Credits</h1>
              <button
                onClick={() => navigate('/')}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-6">
              {/* Predefined Amounts */}
              <div>
                <h3 className="text-lg font-medium mb-4">Quick Select Amount</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {predefinedAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        selectedAmount === amount && !useCustomAmount
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="text-lg font-semibold">NPR {amount}</div>
                      <div className="text-sm text-gray-500">{amount} Credits</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <h3 className="text-lg font-medium mb-4">Or Enter Custom Amount</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">NPR</span>
                  </div>
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="input pl-12"
                    placeholder="Enter amount (10 - 50,000)"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Minimum: NPR 10 • Maximum: NPR 50,000
                </p>
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span>NPR {selectedAmount?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credits to Add:</span>
                    <span>{selectedAmount?.toLocaleString() || 0} Credits</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Total Payment:</span>
                    <span>NPR {selectedAmount?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">K</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Khalti Payment</h4>
                    <p className="text-sm text-purple-100">Secure • Instant • Trusted</p>
                  </div>
                </div>
              </div>

              {/* Add Credits Button */}
              <button
                onClick={handleAddCredits}
                disabled={isLoading || selectedAmount < 10}
                className="w-full btn btn-primary py-3 text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Add ${selectedAmount?.toLocaleString() || 0} Credits`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCredits;