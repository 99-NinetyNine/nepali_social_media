import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MapPinIcon, 
  ClockIcon, 
  BriefcaseIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TinderReview from '../components/jobs/TinderReview';
import { useAuthStore } from '../store/authStore';
import { accountsApi } from '../services/api';

interface Company {
  id: number;
  name: string;
  description: string;
  logo: string | null;
  website: string;
  industry: string;
  location: string;
  employee_count: string;
  is_verified: boolean;
}

interface Job {
  id: number;
  company: Company;
  title: string;
  description: string;
  requirements: string;
  job_type: string;
  experience_level: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: boolean;
  is_active: boolean;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  // AI matching scores
  match_score?: number;
  skills_match?: number;
  experience_match?: number;
  location_match?: number;
  salary_match?: number;
}

interface JobFilters {
  job_type: string;
  experience_level: string;
  location: string;
  is_remote: boolean | null;
}

const Jobs: React.FC = () => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recommendations, setRecommendations] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'recommendations'>('recommendations');
  const [showTinderReview, setShowTinderReview] = useState(false);
  const [selectedJobForReview, setSelectedJobForReview] = useState<Job | null>(null);
  const [filters, setFilters] = useState<JobFilters>({
    job_type: '',
    experience_level: '',
    location: '',
    is_remote: null
  });

  useEffect(() => {
    fetchJobs();
    fetchRecommendations();
    if (user?.is_business) {
      fetchUserCompanies();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.job_type) params.append('job_type', filters.job_type);
      if (filters.experience_level) params.append('experience_level', filters.experience_level);
      if (filters.location) params.append('location', filters.location);
      if (filters.is_remote !== null) params.append('is_remote', filters.is_remote.toString());

      const response = await  accountsApi.getJobs(params);
      setJobs(response.results || response.data);
     
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await accountsApi.getJobRecommendations();
      
      setRecommendations(response.data || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  };

  const fetchUserCompanies = async () => {
    try {
      const response = await accountsApi.getCompanies();
      
        setCompanies(response.result);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleApplyFilters = () => {
    fetchJobs();
  };

  const resetFilters = () => {
    setFilters({
      job_type: '',
      experience_level: '',
      location: '',
      is_remote: null
    });
    setTimeout(fetchJobs, 100);
  };

  const handleApplyJob = async (job: Job) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleReviewApplications = (job: Job) => {
    setSelectedJobForReview(job);
    setShowTinderReview(true);
  };

  const handleCloseReview = () => {
    setShowTinderReview(false);
    setSelectedJobForReview(null);
    // Refresh jobs to get updated application counts
    fetchJobs();
  };

  const submitJobApplication = async (applicationData: { cover_letter: string; resume: File }) => {
    if (!selectedJob) return;

    try {
      const formData = new FormData();
      formData.append('job', selectedJob.id.toString());
      formData.append('cover_letter', applicationData.cover_letter);
      formData.append('resume', applicationData.resume);

      const response = await fetch('/api/auth/jobs/apply/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Application submitted successfully!');
        setShowApplicationModal(false);
        setSelectedJob(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to submit application: ${Object.values(errorData).join(', ')}`);
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      alert('Failed to submit application');
    }
  };

  const formatJobType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatExperienceLevel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1) + ' Level';
  };

  const formatSalaryRange = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return 'Salary not specified';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Jobs</h1>
        {user?.is_business && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowPostJobModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Post a Job
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* View Mode Selector */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setViewMode('recommendations')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'recommendations' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎯 AI Recommendations {recommendations.length > 0 && `(${recommendations.length})`}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'all' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 All Jobs {jobs.length > 0 && `(${jobs.length})`}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Filters</h3>
              <button 
                onClick={resetFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Job Type</label>
                <select 
                  className="input"
                  value={filters.job_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, job_type: e.target.value }))}
                >
                  <option value="">All Types</option>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Experience Level</label>
                <select 
                  className="input"
                  value={filters.experience_level}
                  onChange={(e) => setFilters(prev => ({ ...prev, experience_level: e.target.value }))}
                >
                  <option value="">All Levels</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Enter location..."
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={filters.is_remote === true}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      is_remote: e.target.checked ? true : null 
                    }))}
                  />
                  <span className="text-sm font-medium">Remote Only</span>
                </label>
              </div>
              
              <button 
                className="btn btn-primary w-full"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Job Listings */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {(() => {
              const currentJobs = viewMode === 'recommendations' ? recommendations : jobs;
              
              if (currentJobs.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <BriefcaseIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {viewMode === 'recommendations' ? 'No Recommendations Yet' : 'No Jobs Found'}
                    </h3>
                    <p className="text-gray-600">
                      {viewMode === 'recommendations' 
                        ? 'Update your skills and preferences in your profile to get AI-powered job recommendations!' 
                        : 'Try adjusting your filters to see more jobs.'}
                    </p>
                  </div>
                );
              }
              
              return currentJobs.map((job) => (
                <div key={job.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        {job.company.logo ? (
                          <img
                            src={job.company.logo}
                            alt={job.company.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">
                          {job.title}
                        </h3>
                        <div className="flex items-center mb-2">
                          <p className="text-gray-600 font-medium">{job.company.name}</p>
                          {job.company.is_verified && (
                            <span className="ml-2 text-blue-600 text-sm">✓ Verified</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {job.is_remote ? 'Remote' : job.location}
                          </span>
                          <span className="flex items-center">
                            <BriefcaseIcon className="h-4 w-4 mr-1" />
                            {formatJobType(job.job_type)}
                          </span>
                          <span className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{formatExperienceLevel(job.experience_level)}</span>
                          <span className="flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                            {formatSalaryRange(job.salary_min, job.salary_max)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {/* Show different buttons based on user type */}
                      {user?.is_business && companies.some((company) => company.id === job.company.id) ? (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleReviewApplications(job)}
                        >
                          👥 Review Applications
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApplyJob(job)}
                        >
                          Apply Now
                        </button>
                      )}
                      {job.deadline && (
                        <span className="text-xs text-gray-500 text-center">
                          <CalendarIcon className="h-3 w-3 inline mr-1" />
                          Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* AI Match Scores (only in recommendations view) */}
                  {viewMode === 'recommendations' && job.match_score && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          🎯 AI Match Score
                        </span>
                        <span className={`text-lg font-bold ${
                          job.match_score >= 80 ? 'text-green-600' :
                          job.match_score >= 60 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {Math.round(job.match_score)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className={`w-full h-2 rounded-full mb-1 ${
                            (job.skills_match || 0) >= 70 ? 'bg-green-200' : 'bg-gray-200'
                          }`}>
                            <div 
                              className={`h-2 rounded-full ${
                                (job.skills_match || 0) >= 70 ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${job.skills_match || 0}%` }}
                            />
                          </div>
                          <span className="text-gray-600">Skills</span>
                          <div className="font-medium">{Math.round(job.skills_match || 0)}%</div>
                        </div>
                        <div className="text-center">
                          <div className={`w-full h-2 rounded-full mb-1 ${
                            (job.experience_match || 0) >= 70 ? 'bg-green-200' : 'bg-gray-200'
                          }`}>
                            <div 
                              className={`h-2 rounded-full ${
                                (job.experience_match || 0) >= 70 ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${job.experience_match || 0}%` }}
                            />
                          </div>
                          <span className="text-gray-600">Experience</span>
                          <div className="font-medium">{Math.round(job.experience_match || 0)}%</div>
                        </div>
                        <div className="text-center">
                          <div className={`w-full h-2 rounded-full mb-1 ${
                            (job.location_match || 0) >= 70 ? 'bg-green-200' : 'bg-gray-200'
                          }`}>
                            <div 
                              className={`h-2 rounded-full ${
                                (job.location_match || 0) >= 70 ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${job.location_match || 0}%` }}
                            />
                          </div>
                          <span className="text-gray-600">Location</span>
                          <div className="font-medium">{Math.round(job.location_match || 0)}%</div>
                        </div>
                        <div className="text-center">
                          <div className={`w-full h-2 rounded-full mb-1 ${
                            (job.salary_match || 0) >= 70 ? 'bg-green-200' : 'bg-gray-200'
                          }`}>
                            <div 
                              className={`h-2 rounded-full ${
                                (job.salary_match || 0) >= 70 ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${job.salary_match || 0}%` }}
                            />
                          </div>
                          <span className="text-gray-600">Salary</span>
                          <div className="font-medium">{Math.round(job.salary_match || 0)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2 font-medium">Requirements:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {job.requirements}
                    </p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Job Application Modal */}
      {showApplicationModal && selectedJob && (
        <JobApplicationModal
          job={selectedJob}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedJob(null);
          }}
          onSubmit={submitJobApplication}
        />
      )}

      {/* Post Job Modal */}
      {showPostJobModal && (
        <PostJobModal
          companies={companies}
          onClose={() => setShowPostJobModal(false)}
          onJobPosted={() => {
            setShowPostJobModal(false);
            fetchJobs();
          }}
        />
      )}

      {/* Tinder-style Review Modal */}
      {showTinderReview && selectedJobForReview && (
        <TinderReview
          jobId={selectedJobForReview.id}
          jobTitle={selectedJobForReview.title}
          onClose={handleCloseReview}
        />
      )}
    </div>
  );
};

// Job Application Modal Component
const JobApplicationModal: React.FC<{
  job: Job;
  onClose: () => void;
  onSubmit: (data: { cover_letter: string; resume: File }) => void;
}> = ({ job, onClose, onSubmit }) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume || !coverLetter.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ cover_letter: coverLetter, resume });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Apply for {job.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">{job.title}</h3>
            <p className="text-gray-600">{job.company.name}</p>
            <p className="text-sm text-gray-500">{job.location}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cover Letter</label>
              <textarea
                className="input min-h-[150px]"
                placeholder="Tell us why you're interested in this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Resume</label>
              <input
                type="file"
                className="input"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX (Max 5MB)
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Post Job Modal Component  
const PostJobModal: React.FC<{
  companies: Company[];
  onClose: () => void;
  onJobPosted: () => void;
}> = ({ companies, onClose, onJobPosted }) => {
  const [formData, setFormData] = useState({
    company: '',
    title: '',
    description: '',
    requirements: '',
    job_type: 'full_time',
    experience_level: 'mid',
    location: '',
    salary_min: '',
    salary_max: '',
    is_remote: false,
    deadline: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/jobs/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
          deadline: formData.deadline || null
        })
      });

      if (response.ok) {
        alert('Job posted successfully!');
        onJobPosted();
      } else {
        const errorData = await response.json();
        alert(`Failed to post job: ${Object.values(errorData).join(', ')}`);
      }
    } catch (err) {
      console.error('Error posting job:', err);
      alert('Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Post a New Job</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Company *</label>
                <select
                  className="input"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  required
                >
                  <option value="">Select Company</option>
                  {companies?.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Job Title *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Job Type</label>
                <select
                  className="input"
                  value={formData.job_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_type: e.target.value }))}
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Experience Level</label>
                <select
                  className="input"
                  value={formData.experience_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience_level: e.target.value }))}
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  className="input"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. New York, NY"
                />
              </div>

              <div>
                <label className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.is_remote}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_remote: e.target.checked }))}
                  />
                  <span className="text-sm font-medium">Remote Position</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Minimum Salary</label>
                <input
                  type="number"
                  className="input"
                  value={formData.salary_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary_min: e.target.value }))}
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Maximum Salary</label>
                <input
                  type="number"
                  className="input"
                  value={formData.salary_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary_max: e.target.value }))}
                  placeholder="80000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Application Deadline</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Job Description *</label>
              <textarea
                className="input min-h-[120px]"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role and responsibilities..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Requirements *</label>
              <textarea
                className="input min-h-[100px]"
                value={formData.requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                placeholder="List the required skills and qualifications..."
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary flex-1"
              >
                {submitting ? 'Posting...' : 'Post Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Jobs;