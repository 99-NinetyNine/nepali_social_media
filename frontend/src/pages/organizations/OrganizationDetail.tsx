import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  ClockIcon,
  XCircleIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ArrowLeftIcon
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
  contact_email: string;
  contact_phone: string;
  linkedin_url: string;
  twitter_url: string;
  company_culture: string;
  benefits: string[];
  founded_year?: number;
  created_at: string;
  updated_at: string;
}

interface CompanyStats {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  pending_applications: number;
  recent_applications: number;
  recent_jobs: number;
}

const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchCompanyDetails();
    }
  }, [id]);

  const fetchCompanyDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [companyRes, statsRes] = await Promise.all([
        accountsApi.getCompany(parseInt(id)),
        accountsApi.getCompanyStats(parseInt(id))
      ]);
      
      setCompany(companyRes.data);
      setStats(statsRes.data.stats);
    } catch (error: any) {
      console.error('Error fetching company details:', error);
      setError('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    
    if (!confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await accountsApi.deleteCompany(company.id);
      toast.success('Organization deleted successfully');
      navigate('/organizations');
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast.error(error.response?.data?.error || 'Failed to delete organization');
    }
  };

  const handleVerifyRequest = async () => {
    if (!company) return;

    try {
      await accountsApi.verifyCompany(company.id);
      toast.success('Verification request submitted');
      fetchCompanyDetails();
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification request');
    }
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckBadgeIcon className="w-4 h-4 mr-2" />
            Verified Organization
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-2" />
            Verification Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-2" />
            Verification Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
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

  if (error || !company) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>{error || 'Organization not found'}</p>
          <Link to="/organizations" className="btn btn-primary mt-4">
            Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/organizations')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              {getVerificationStatusBadge(company.verification_status)}
              {!company.is_hiring && (
                <span className="text-orange-600 text-sm">⏸️ Not hiring</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/organizations/${company.id}/edit`}
            className="btn btn-outline flex items-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            className="btn btn-outline-red flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Overview */}
          <div className="card p-6">
            <div className="flex items-start space-x-4 mb-6">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 bg-primary-100 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="h-10 w-10 text-primary-600" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">About {company.name}</h2>
                <p className="text-gray-600">{company.description}</p>
              </div>
            </div>

            {company.company_culture && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Company Culture</h3>
                <p className="text-gray-600">{company.company_culture}</p>
              </div>
            )}

            {company.benefits && company.benefits.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Benefits</h3>
                <div className="flex flex-wrap gap-2">
                  {company.benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Company Stats */}
          {stats && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Performance Overview
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_jobs}</div>
                  <div className="text-sm text-gray-600">Total Jobs</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.active_jobs}</div>
                  <div className="text-sm text-gray-600">Active Jobs</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.total_applications}</div>
                  <div className="text-sm text-gray-600">Total Applications</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending_applications}</div>
                  <div className="text-sm text-gray-600">Pending Review</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">{stats.recent_applications}</div>
                  <div className="text-sm text-gray-600">Recent Apps (30d)</div>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">{stats.recent_jobs}</div>
                  <div className="text-sm text-gray-600">New Jobs (30d)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Company Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Industry:</span>
                <span className="ml-2 font-medium">{company.industry}</span>
              </div>
              <div>
                <span className="text-gray-600">Location:</span>
                <span className="ml-2 font-medium">{company.location}</span>
              </div>
              <div>
                <span className="text-gray-600">Company Size:</span>
                <span className="ml-2 font-medium">{company.employee_count}</span>
              </div>
              {company.founded_year && (
                <div>
                  <span className="text-gray-600">Founded:</span>
                  <span className="ml-2 font-medium">{company.founded_year}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Remote Work:</span>
                <span className={`ml-2 font-medium ${company.allows_remote_work ? 'text-green-600' : 'text-red-600'}`}>
                  {company.allows_remote_work ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {(company.contact_email || company.contact_phone || company.website) && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3 text-sm">
                {company.contact_email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <a href={`mailto:${company.contact_email}`} className="ml-2 text-blue-600 hover:text-blue-700">
                      {company.contact_email}
                    </a>
                  </div>
                )}
                {company.contact_phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <a href={`tel:${company.contact_phone}`} className="ml-2 text-blue-600 hover:text-blue-700">
                      {company.contact_phone}
                    </a>
                  </div>
                )}
                {company.website && (
                  <div>
                    <span className="text-gray-600">Website:</span>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-700">
                      {company.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(company.linkedin_url || company.twitter_url) && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Social Media</h3>
              <div className="space-y-3">
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    LinkedIn Profile
                  </a>
                )}
                {company.twitter_url && (
                  <a
                    href={company.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700"
                  >
                    Twitter Profile
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Verification */}
          {company.verification_status === 'unverified' && (
            <div className="card p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Get Verified</h3>
              <p className="text-blue-700 text-sm mb-4">
                Verify your organization to build trust with job seekers and improve your visibility.
              </p>
              <button
                onClick={handleVerifyRequest}
                className="w-full btn btn-primary"
              >
                Submit for Verification
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to={`/jobs/create?company=${company.id}`}
                className="w-full btn btn-outline flex items-center justify-center space-x-2"
              >
                <BriefcaseIcon className="h-4 w-4" />
                <span>Post New Job</span>
              </Link>
              <Link
                to={`/jobs?company=${company.id}`}
                className="w-full btn btn-outline flex items-center justify-center space-x-2"
              >
                <UserGroupIcon className="h-4 w-4" />
                <span>View All Jobs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetail;