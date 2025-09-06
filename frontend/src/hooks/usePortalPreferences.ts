import { useState, useEffect } from 'react';
import { authApi } from '../services/api';

interface PortalPreferences {
  enable_job_portal: boolean;
  enable_shop_portal: boolean;
  is_business: boolean;
}

export const usePortalPreferences = () => {
  const [preferences, setPreferences] = useState<PortalPreferences>({
    enable_job_portal: true, // Default to true for better UX
    enable_shop_portal: true,
    is_business: false
  });
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    try {
      const response = await authApi.getPortalPreferences();
      setPreferences(response.data);
    } catch (error) {
      console.error('Error fetching portal preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<PortalPreferences>) => {
    try {
      const response = await authApi.updatePortalPreferences(updates);
      setPreferences(prev => ({
        ...prev,
        enable_job_portal: response.data.enable_job_portal,
        enable_shop_portal: response.data.enable_shop_portal
      }));
    } catch (error) {
      console.error('Error updating portal preferences:', error);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences
  };
};