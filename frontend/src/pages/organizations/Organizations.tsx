import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import { useCredits } from '../../hooks/useCredits';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  BuildingOfficeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Company {
  id: number;
  name: string;
  description: string;
  logo?: string;
  website: string;
  industry: string;
  location: string;
  employee_count: string;
  is_verified: boolean;
  verification_status: string;
  is_hiring: boolean;
  allows_remote_work: boolean;
  created_at: string;
  updated_at: string;
}

const Organizations: React.FC = () => {
  const navigate = useNavigate();
  const { balance, checkSufficientCredits } = useCredits();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const ORGANIZATION_FEE = 50; // Cost for additional organizations

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await accountsApi.getCompanies();
      setCompanies(response.data);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = () => {
    // Check if user has sufficient credits for additional organizations
    if (companies.length >= 1 && !checkSufficientCredits(ORGANIZATION_FEE)) {
      toast.error(`Insufficient credits. You need ${ORGANIZATION_FEE} credits to create additional organizations.`);
      return;
    }

    navigate('/organizations/create');
  };

  const handleDeleteOrganization = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await accountsApi.deleteCompany(company.id);
      toast.success('Organization deleted successfully');
      fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast.error(error.response?.data?.error || 'Failed to delete organization');
    }
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckBadgeIcon className="w-3 h-3 mr-1" />
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unverified
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button onClick={fetchCompanies} className="btn btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Organizations</h1>
          <p className="text-gray-600 mt-2">
            Manage your companies and job postings
          </p>
        </div>
        <button
          onClick={handleCreateOrganization}
          className="btn btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Organization</span>
        </button>
      </div>

      {/* Pricing Info */}
      {companies.length >= 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Additional Organizations</h3>
              <p className="text-sm text-blue-700 mt-1">
                Creating additional organizations costs {ORGANIZATION_FEE} credits each. 
                Your current balance: <span className="font-medium">{balance} credits</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Organizations List */}
      {companies.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations yet</h3>
          <p className="text-gray-600 mb-6">Create your first organization to start posting jobs</p>
          <button
            onClick={handleCreateOrganization}
            className="btn btn-primary"
          >
            Create Your First Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id} className="card hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                  {getVerificationStatusBadge(company.verification_status)}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {company.description}
                </p>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div>📍 {company.location}</div>
                  <div>👥 {company.employee_count}</div>
                  {company.allows_remote_work && (
                    <div className="text-green-600">🏠 Remote work available</div>
                  )}
                  {!company.is_hiring && (
                    <div className="text-orange-600">⏸️ Not currently hiring</div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Link
                      to={`/organizations/${company.id}`}
                      className="text-blue-600 hover:text-blue-700"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/organizations/${company.id}/edit`}
                      className="text-green-600 hover:text-green-700"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteOrganization(company)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Created {new Date(company.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Organizations;