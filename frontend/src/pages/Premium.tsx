import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface SubscriptionTier {
  tier: number;
  name: string;
  description: string;
  daily_posts: number;
  media_per_post: number;
  shows_ads: boolean;
  monthly_price: number;
  yearly_price: number;
  badge_number: number | null;
  upgrade_cost?: {
    monthly: {
      total_cost: number;
      credit_applied: number;
      amount_to_pay: number;
    };
    yearly: {
      total_cost: number;
      credit_applied: number;
      amount_to_pay: number;
    };
  };
}

interface SubscriptionData {
  tiers: SubscriptionTier[];
  current_tier: number;
  current_balance: number;
  subscription_expires: string | null;
  is_yearly: boolean;
}

const Premium: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmPurchase, setConfirmPurchase] = useState<{
    tier: number;
    isYearly: boolean;
    tierName: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    fetchSubscriptionTiers();
    // Also refresh user profile to get latest credit balance
    refreshUserProfile();
  }, []);

  const refreshUserProfile = async () => {
    try {
      const response = await authApi.getProfile();
      console.log('Current user profile:', response.data);
      setUser(response.data.user);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const fetchSubscriptionTiers = async () => {
    try {
      const response = await authApi.getSubscriptionTiers();
      console.log('Subscription tiers response:', response.data);
      setSubscriptionData(response.data);
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const showPurchaseConfirmation = (tier: number, isYearly: boolean) => {
    if (!user) {
      toast.error('Please log in to purchase a subscription');
      navigate('/login');
      return;
    }

    const tierData = subscriptionData?.tiers.find(t => t.tier === tier);
    if (!tierData) return;

    const amount = tierData.upgrade_cost ? 
      (isYearly ? tierData.upgrade_cost.yearly.amount_to_pay : tierData.upgrade_cost.monthly.amount_to_pay) :
      (isYearly ? tierData.yearly_price : tierData.monthly_price);

    setConfirmPurchase({
      tier,
      isYearly,
      tierName: tierData.name,
      amount
    });
  };

  const handleConfirmedPurchase = async () => {
    if (!confirmPurchase) return;

    const { tier, isYearly } = confirmPurchase;
    const purchaseKey = `${tier}-${isYearly ? 'yearly' : 'monthly'}`;
    setPurchasing(purchaseKey);

    try {
      const response = await authApi.purchaseSubscriptionTier({
        target_tier: tier,
        is_yearly: isYearly
      });

      toast.success(response.data.message);
      
      // Refresh both subscription data and user profile
      await Promise.all([
        fetchSubscriptionTiers(),
        refreshUserProfile()
      ]);
      
      setConfirmPurchase(null);
    } catch (error: any) {
      console.error('Purchase error:', error);
      const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                          error.response?.data?.error || 
                          'Failed to purchase subscription';
      toast.error(errorMessage);
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getBadgeIcon = (badgeNumber: number | null) => {
    if (!badgeNumber) return null;
    
    const badges = {
      1: '🌺', // LaliGurans (Rhododendron) for Tier 1
      2: '🦚', // Danphe (Himalayan Monal) for Tier 2  
      3: '🏔️' // Sagarmatha (Mount Everest) for Tier 3
    };
    
    return badges[badgeNumber as keyof typeof badges] || '⭐';
  };

  const getTierColor = (tier: number, isCurrent: boolean) => {
    if (isCurrent) return 'border-green-500 bg-green-50';
    if (tier === 0) return 'border-gray-300';
    if (tier === 1) return 'border-blue-500';
    if (tier === 2) return 'border-purple-500';
    if (tier === 3) return 'border-yellow-500';
    return 'border-gray-300';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">Failed to load subscription plans</p>
          <button onClick={fetchSubscriptionTiers} className="btn btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 mb-6">
          Unlock more features with our flexible subscription tiers
        </p>
        
        {/* Current Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 inline-block">
          <p className="text-blue-800">
            <strong>Current Plan:</strong> {subscriptionData.tiers.find(t => t.tier === subscriptionData.current_tier)?.name || 'Free'} 
            {subscriptionData.subscription_expires && (
              <span className="ml-2 text-sm">
                (Expires: {new Date(subscriptionData.subscription_expires).toLocaleDateString()})
              </span>
            )}
          </p>
          <p className="text-blue-700 mt-1">
            <strong>Credit Balance:</strong> {formatPrice(subscriptionData.current_balance)}
          </p>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {subscriptionData.tiers.map((tier) => {
          const isCurrent = tier.tier === subscriptionData.current_tier;
          const canUpgrade = tier.tier > subscriptionData.current_tier;
          
          return (
            <div 
              key={tier.tier}
              className={`relative bg-white rounded-xl shadow-lg border-2 p-6 ${getTierColor(tier.tier, isCurrent)}`}
            >
              {/* Badge */}
              {tier.badge_number && (
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 rounded-full w-8 h-8 flex items-center justify-center text-lg">
                  {getBadgeIcon(tier.badge_number)}
                </div>
              )}
              
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                
                {/* Features */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Daily Posts</span>
                    <span className="font-semibold">{tier.daily_posts}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Media per Post</span>
                    <span className="font-semibold">{tier.media_per_post}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Advertisements</span>
                    <span className={`font-semibold ${tier.shows_ads ? 'text-red-600' : 'text-green-600'}`}>
                      {tier.shows_ads ? 'Shown' : 'Hidden'}
                    </span>
                  </div>
                  {tier.badge_number && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Profile Badge</span>
                      <span className="font-semibold">
                        {tier.badge_number === 1 && '🌺 LaliGurans'}
                        {tier.badge_number === 2 && '🦚 Danphe'}
                        {tier.badge_number === 3 && '🏔️ Sagarmatha'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                {tier.tier === 0 ? (
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-green-600">FREE</p>
                    <p className="text-sm text-gray-500">Forever</p>
                  </div>
                ) : (
                  <div className="mb-6 space-y-4">
                    {/* Monthly Pricing */}
                    <div className="border rounded-lg p-3">
                      <p className="text-lg font-bold">{formatPrice(tier.monthly_price)}</p>
                      <p className="text-sm text-gray-500">per month</p>
                      {canUpgrade && tier.upgrade_cost && (
                        <div className="mt-2">
                          {tier.upgrade_cost.monthly.credit_applied > 0 && (
                            <p className="text-xs text-green-600">
                              -{formatPrice(tier.upgrade_cost.monthly.credit_applied)} credit applied
                            </p>
                          )}
                          <p className="text-sm font-semibold text-blue-600">
                            Pay: {formatPrice(tier.upgrade_cost.monthly.amount_to_pay)}
                          </p>
                        </div>
                      )}
                      
                      {canUpgrade && (
                        <button
                          onClick={() => showPurchaseConfirmation(tier.tier, false)}
                          disabled={purchasing === `${tier.tier}-monthly`}
                          className="btn btn-outline w-full mt-2 text-sm"
                        >
                          {purchasing === `${tier.tier}-monthly` ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            'Upgrade Monthly'
                          )}
                        </button>
                      )}
                    </div>

                    {/* Yearly Pricing */}
                    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-center mb-1">
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          BEST VALUE
                        </span>
                      </div>
                      <p className="text-lg font-bold text-blue-600">{formatPrice(tier.yearly_price)}</p>
                      <p className="text-sm text-gray-600">per year</p>
                      <p className="text-xs text-green-600">
                        Save {formatPrice((tier.monthly_price * 12) - tier.yearly_price)}
                      </p>
                      {canUpgrade && tier.upgrade_cost && (
                        <div className="mt-2">
                          {tier.upgrade_cost.yearly.credit_applied > 0 && (
                            <p className="text-xs text-green-600">
                              -{formatPrice(tier.upgrade_cost.yearly.credit_applied)} credit applied
                            </p>
                          )}
                          <p className="text-sm font-semibold text-blue-600">
                            Pay: {formatPrice(tier.upgrade_cost.yearly.amount_to_pay)}
                          </p>
                        </div>
                      )}
                      
                      {canUpgrade && (
                        <button
                          onClick={() => showPurchaseConfirmation(tier.tier, true)}
                          disabled={purchasing === `${tier.tier}-yearly`}
                          className="btn btn-primary w-full mt-2 text-sm"
                        >
                          {purchasing === `${tier.tier}-yearly` ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            'Upgrade Yearly'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div className="text-green-600 font-medium text-sm">
                    ✓ Your Current Plan
                  </div>
                )}
                
                {tier.tier < subscriptionData.current_tier && (
                  <div className="text-gray-500 text-sm">
                    Cannot downgrade
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Credits CTA */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Need More Credits?</h3>
        <p className="text-gray-600 mb-4">
          Add credits to your account to purchase subscriptions and premium features
        </p>
        <button 
          onClick={() => navigate('/credits/add')}
          className="btn btn-outline"
        >
          Add Credits
        </button>
      </div>

      {/* Purchase Confirmation Modal */}
      {confirmPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Purchase</h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                You are about to upgrade to <strong>{confirmPurchase.tierName}</strong>
              </p>
              <p className="text-gray-700 mb-2">
                Duration: <strong>{confirmPurchase.isYearly ? 'Yearly' : 'Monthly'}</strong>
              </p>
              <p className="text-lg font-semibold text-blue-600">
                Total Cost: {formatPrice(confirmPurchase.amount)}
              </p>
              {subscriptionData && (
                <p className="text-sm text-gray-500 mt-2">
                  Current Balance: {formatPrice(subscriptionData.current_balance)}
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmPurchase(null)}
                className="flex-1 btn btn-outline"
                disabled={purchasing !== null}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedPurchase}
                disabled={purchasing !== null}
                className="flex-1 btn btn-primary"
              >
                {purchasing ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Processing...</span>
                  </div>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Premium;