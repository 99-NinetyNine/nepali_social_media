import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';

const PaymentFailed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const status = searchParams.get('status');
  const message = searchParams.get('message');

  const getErrorMessage = () => {
    switch (status) {
      case 'Cancelled':
        return 'Payment was cancelled by user';
      case 'Failed':
        return 'Payment failed to process';
      case 'Expired':
        return 'Payment session expired';
      default:
        return message || 'Payment could not be completed';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircleIcon className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">{getErrorMessage()}</p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 text-sm">💡</span>
            <div className="text-left">
              <h4 className="font-medium text-yellow-800 text-sm">What you can do:</h4>
              <ul className="mt-1 text-yellow-700 text-xs space-y-1">
                <li>• Check your account balance</li>
                <li>• Try a different payment method</li>
                <li>• Contact Khalti support if needed</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/credits/add')}
            className="w-full btn btn-primary"
          >
            Try Payment Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full btn btn-outline"
          >
            Go to Dashboard
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Need help?</p>
          <div className="flex justify-center space-x-4">
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
              Contact Support
            </a>
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
              FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;