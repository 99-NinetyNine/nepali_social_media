import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import { useCredits } from '../../hooks/useCredits';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface CompanyFormData {
  name: string;
  description: string;
  website: string;
  industry: string;
  location: string;
  employee_count: string;
  founded_year: string;
  contact_email: string;
  contact_phone: string;
  linkedin_url: string;
  twitter_url: string;
  company_culture: string;
  benefits: string[];
  is_hiring: boolean;
  allows_remote_work: boolean;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Marketing',
  'Real Estate',
  'Transportation',
  'Entertainment',
  'Non-profit',
  'Government',
  'Other'
];

const EMPLOYEE_COUNTS = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' }
];

const COMMON_BENEFITS = [
  'Health Insurance',
  'Dental Insurance',
  'Vision Insurance',
  'Retirement Plan',
  'Paid Time Off',
  'Remote Work',
  'Flexible Hours',
  'Professional Development',
  'Gym Membership',
  'Free Lunch',
  'Stock Options',
  'Parental Leave'
];

const OrganizationForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { balance, checkSufficientCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [error, setError] = useState<string>('');

  const ORGANIZATION_FEE = 50;
  const isEditing = !!id;

  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    description: '',
    website: '',
    industry: '',
    location: '',
    employee_count: '',
    founded_year: '',
    contact_email: '',
    contact_phone: '',
    linkedin_url: '',
    twitter_url: '',
    company_culture: '',
    benefits: [],
    is_hiring: true,
    allows_remote_work: false
  });

  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    if (isEditing) {
      fetchCompanyData();
    }
  }, [id]);

  const fetchCompanyData = async () => {
    if (!id) return;

    try {
      setInitialLoading(true);
      const response = await accountsApi.getCompany(parseInt(id));
      const company = response.data;
      
      setFormData({
        name: company.name || '',
        description: company.description || '',
        website: company.website || '',
        industry: company.industry || '',
        location: company.location || '',
        employee_count: company.employee_count || '',
        founded_year: company.founded_year?.toString() || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
        linkedin_url: company.linkedin_url || '',
        twitter_url: company.twitter_url || '',
        company_culture: company.company_culture || '',
        benefits: company.benefits || [],
        is_hiring: company.is_hiring ?? true,
        allows_remote_work: company.allows_remote_work ?? false
      });

      if (company.logo) {
        setLogoPreview(company.logo);
      }
    } catch (error: any) {
      console.error('Error fetching company:', error);
      setError('Failed to load organization data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Logo file must be smaller than 5MB');
        return;
      }
      
      setLogo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBenefitToggle = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter(b => b !== benefit)
        : [...prev.benefits, benefit]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check credits for new organizations
    if (!isEditing && !checkSufficientCredits(ORGANIZATION_FEE)) {
      // Check if this is the first organization (free)
      try {
        const companiesResponse = await accountsApi.getCompanies();
        if (companiesResponse.data.length >= 1) {
          toast.error(`Insufficient credits. You need ${ORGANIZATION_FEE} credits to create additional organizations.`);
          return;
        }
      } catch (error) {
        // If we can't check, assume it's fine and let the backend handle it
      }
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'benefits') {
          submitData.append(key, JSON.stringify(value));
        } else if (key === 'founded_year' && value) {
          submitData.append(key, value.toString());
        } else if (typeof value === 'boolean') {
          submitData.append(key, value.toString());
        } else if (value) {
          submitData.append(key, value as string);
        }
      });

      if (logo) {
        submitData.append('logo', logo);
      }

      let response;
      if (isEditing) {
        response = await accountsApi.updateCompany(parseInt(id!), submitData);
        toast.success('Organization updated successfully');
      } else {
        response = await accountsApi.createCompany(submitData);
        toast.success('Organization created successfully');
      }

      navigate(`/organizations/${response.data.id}`);
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast.error(error.response?.data?.error || 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
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
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate('/organizations')}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Organization' : 'Create Organization'}
          </h1>
          {!isEditing && (
            <p className="text-gray-600 mt-2">
              First organization is free. Additional organizations cost {ORGANIZATION_FEE} credits.
              Current balance: <span className="font-medium">{balance} credits</span>
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter organization name"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input"
                rows={4}
                placeholder="Describe your organization..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Industry *</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="input"
                required
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="input"
                placeholder="City, Country"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Size</label>
              <select
                name="employee_count"
                value={formData.employee_count}
                onChange={handleInputChange}
                className="input"
              >
                <option value="">Select size</option>
                {EMPLOYEE_COUNTS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Founded Year</label>
              <input
                type="number"
                name="founded_year"
                value={formData.founded_year}
                onChange={handleInputChange}
                className="input"
                min="1800"
                max={new Date().getFullYear()}
                placeholder="e.g. 2020"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Organization Logo</label>
            <div className="flex items-center space-x-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-lg object-cover border"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border">
                  <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="input"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum file size: 5MB. Recommended: 200x200px
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="input"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                className="input"
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contact Phone</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                className="input"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleInputChange}
                className="input"
                placeholder="https://linkedin.com/company/..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Twitter URL</label>
              <input
                type="url"
                name="twitter_url"
                value={formData.twitter_url}
                onChange={handleInputChange}
                className="input"
                placeholder="https://twitter.com/..."
              />
            </div>
          </div>
        </div>

        {/* Company Culture */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Company Culture & Benefits</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Company Culture</label>
              <textarea
                name="company_culture"
                value={formData.company_culture}
                onChange={handleInputChange}
                className="input"
                rows={4}
                placeholder="Describe your company culture, values, and work environment..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Benefits & Perks</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {COMMON_BENEFITS.map(benefit => (
                  <label key={benefit} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.benefits.includes(benefit)}
                      onChange={() => handleBenefitToggle(benefit)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">{benefit}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_hiring"
                  checked={formData.is_hiring}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">Currently hiring</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="allows_remote_work"
                  checked={formData.allows_remote_work}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">Allows remote work</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/organizations')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
              </div>
            ) : (
              isEditing ? 'Update Organization' : 'Create Organization'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationForm;