import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, updateToken } = useAuthStore();
  const [processing, setProcessing] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    location: '',
    phone_number: ''
  });

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google authentication was cancelled or failed');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('Invalid authentication response');
        navigate('/login');
        return;
      }

      try {
        const response = await authApi.handleGoogleCallback({ code });

        if (response.data.user && response.data.access_token) {
          // Store user and tokens using Zustand
          setUser(response.data.user);
          updateToken(response.data.access_token);
          
          // Store refresh token (handled by Zustand persist)
          useAuthStore.setState({ 
            refreshToken: response.data.refresh_token 
          });

          if (response.data.created) {
            // New user - show profile completion form
            setShowCompleteProfile(true);
            setProcessing(false);
            toast.success('Welcome! Please complete your profile.');
          } else {
            // Existing user - redirect to dashboard
            toast.success('Welcome back!');
            navigate('/');
          }
        } else {
          throw new Error('Authentication failed - invalid response from server');
        }
      } catch (error: any) {
        console.error('Google auth error:', error);
        toast.error(error.message || 'Authentication failed');
        navigate('/login');
      } finally {
        if (!showCompleteProfile) {
          setProcessing(false);
        }
      }
    };

    handleGoogleCallback();
  }, [searchParams, navigate, setUser]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await authApi.completeProfile(profileData);
      setUser(response.data.user);
      toast.success('Profile completed successfully!');
      navigate('/');
    } catch (error) {
      console.error('Profile completion error:', error);
      toast.error('Failed to complete profile');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Authenticating with Google...</p>
        </div>
      </div>
    );
  }

  if (showCompleteProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Complete Your Profile
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Just a few more details to get started
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleCompleteProfile}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={profileData.full_name}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (optional)
              </label>
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleInputChange}
                className="input"
                rows={3}
                placeholder="Tell us about yourself"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (optional)
              </label>
              <input
                type="text"
                name="location"
                value={profileData.location}
                onChange={handleInputChange}
                className="input"
                placeholder="Your location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                name="phone_number"
                value={profileData.phone_number}
                onChange={handleInputChange}
                className="input"
                placeholder="Your phone number"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 btn btn-outline"
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary"
              >
                Complete Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default GoogleCallback;