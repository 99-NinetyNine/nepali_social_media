import React, { useState } from 'react';
import { 
  CogIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { usePortalPreferences } from '../hooks/usePortalPreferences';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'account' | 'portals' | 'privacy' | 'notifications'>('portals');
  const { preferences, loading, updatePreferences } = usePortalPreferences();
  const [saving, setSaving] = useState(false);

  const handlePortalToggle = async (portal: 'job' | 'shop') => {
    setSaving(true);
    const updates = {
      [portal === 'job' ? 'enable_job_portal' : 'enable_shop_portal']: 
        portal === 'job' ? !preferences.enable_job_portal : !preferences.enable_shop_portal
    };
    await updatePreferences(updates);
    setSaving(false);
  };

  const tabs = [
    { id: 'account', name: 'Account', icon: UserIcon },
    { id: 'portals', name: 'Portals', icon: CogIcon },
    { id: 'privacy', name: 'Privacy', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'account' && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-6">Account Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center">
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <button className="btn btn-outline btn-sm">
                        Change Photo
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input type="text" className="input" placeholder="Your display name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea 
                    className="input min-h-[100px]" 
                    placeholder="Tell people about yourself..."
                  />
                </div>

                <div>
                  <button className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portals' && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-6">Portal Preferences</h2>
              <p className="text-gray-600 mb-6">
                Choose which features you want to see in your social media experience.
              </p>

              <div className="space-y-6">
                {/* Jobs Portal */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <BriefcaseIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Jobs Portal</h3>
                      <p className="text-sm text-gray-500">
                        Access job listings, post jobs, and apply for positions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {saving && (
                      <LoadingSpinner size="sm" />
                    )}
                    <label className="inline-flex relative items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.enable_job_portal}
                        onChange={() => handlePortalToggle('job')}
                        disabled={saving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                {/* Shop Portal */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <ShoppingBagIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Shop Portal</h3>
                      <p className="text-sm text-gray-500">
                        Browse products, make purchases, and manage your store
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {saving && (
                      <LoadingSpinner size="sm" />
                    )}
                    <label className="inline-flex relative items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.enable_shop_portal}
                        onChange={() => handlePortalToggle('shop')}
                        disabled={saving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                {preferences.is_business && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">Business Account</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      As a business account, you have access to additional features like advanced analytics and business tools.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-6">Privacy Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Profile Visibility</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="radio" name="privacy" className="mr-3" />
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-sm text-gray-500">Anyone can see your profile</div>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="privacy" className="mr-3" />
                      <div>
                        <div className="font-medium">Friends Only</div>
                        <div className="text-sm text-gray-500">Only your connections can see your profile</div>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="privacy" className="mr-3" />
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-sm text-gray-500">Only you can see your profile</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" />
                    <span>Require approval for follow requests</span>
                  </label>
                </div>

                <div>
                  <button className="btn btn-primary">
                    Save Privacy Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-6">Notification Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span>New followers</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span>Comments on your posts</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span>Likes on your posts</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span>New job opportunities</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Push Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span>Direct messages</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span>Live videos from people you follow</span>
                    </label>
                  </div>
                </div>

                <div>
                  <button className="btn btn-primary">
                    Save Notification Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;