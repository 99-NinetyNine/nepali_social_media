import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const pidx = searchParams.get('pidx');
      const status = searchParams.get('status');
      
      if (status !== 'Completed') {
        setError('Payment was not completed successfully');
        setVerifying(false);
        return;
      }

      if (!pidx) {
        setError('Invalid payment reference');
        setVerifying(false);
        return;
      }

      // Get pending payment details from localStorage
      const pendingPayment = localStorage.getItem('pending_payment');
      if (!pendingPayment) {
        setError('Payment session expired');
        setVerifying(false);
        return;
      }

      const paymentData = JSON.parse(pendingPayment);
      
      if (paymentData.pidx !== pidx) {
        setError('Payment reference mismatch');
        setVerifying(false);
        return;
      }

      // Verify payment with backend
      const response = await paymentsApi.verifyKhaltiPayment(
        paymentData.invoice_id, 
        pidx
      );

      if (response.data.success) {
        setVerified(true);
        setPaymentDetails(paymentData);
        toast.success(response.data.message || 'Payment verified successfully!');
        
        // Clear pending payment data
        localStorage.removeItem('pending_payment');
      } else {
        setError(response.data.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setError(error.response?.data?.error || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-gray-600">Verifying your payment...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we confirm your transaction</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/credits/add')}
              className="w-full btn btn-primary"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full btn btn-outline"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Your payment has been processed successfully</p>
        
        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">NPR {paymentDetails.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Credits Added:</span>
                <span className="font-medium text-green-600">
                  +{paymentDetails.amount?.toLocaleString()} Credits
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">Khalti</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/credits/history')}
            className="w-full btn btn-primary"
          >
            View Transaction History
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full btn btn-outline"
          >
            Go to Dashboard
          </button>
        </div>
        
        <p className="mt-6 text-xs text-gray-500">
          You will receive a confirmation email shortly
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;