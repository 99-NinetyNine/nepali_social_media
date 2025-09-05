import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  XMarkIcon, 
  QuestionMarkCircleIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentIcon,
  UserIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon as CheckIconSolid, 
  XMarkIcon as XMarkIconSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleIconSolid
} from '@heroicons/react/24/solid';

interface Applicant {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  bio: string;
  location: string;
  website: string;
  skills: string[];
  experience_years: number;
}

interface Application {
  id: number;
  applicant: Applicant;
  cover_letter: string;
  resume: string | null;
  applied_at: string;
  experience_years_at_apply: number;
  skills_at_apply: string[];
  salary_expectation: string | null;
  location_preference: string;
  remote_preference: string;
  match_score: number;
  skills_match_score: number;
  experience_match_score: number;
  location_match_score: number;
  salary_match_score: number;
}

interface TinderReviewProps {
  jobId: number;
  jobTitle: string;
  onClose: () => void;
}

const TinderReview: React.FC<TinderReviewProps> = ({ jobId, jobTitle, onClose }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auth/jobs/${jobId}/applications_to_review/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      } else {
        setError('Failed to fetch applications');
      }
    } catch (err) {
      setError('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'accepted' | 'rejected' | 'maybe') => {
    if (currentIndex >= applications.length) return;
    
    const currentApp = applications[currentIndex];
    setProcessing(true);

    try {
      const response = await fetch(`/api/auth/jobs/${jobId}/review_application/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_id: currentApp.id,
          action: action,
          notes: reviewNotes
        })
      });

      if (response.ok) {
        // Move to next application
        setCurrentIndex(prev => prev + 1);
        setReviewNotes('');
        setShowNotes(false);
      } else {
        setError('Failed to review application');
      }
    } catch (err) {
      setError('Failed to review application');
    } finally {
      setProcessing(false);
    }
  };

  const currentApplication = applications[currentIndex];
  const hasMoreApplications = currentIndex < applications.length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
          <p className="mt-4 text-center">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    );
  }

  if (!hasMoreApplications) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="mb-4">
            <CheckIconSolid className="h-16 w-16 text-green-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold mb-2">All Done! 🎉</h2>
          <p className="text-gray-600 mb-6">
            You've reviewed all applications for "{jobTitle}".
          </p>
          <button onClick={onClose} className="btn btn-primary">
            Close Review
          </button>
        </div>
      </div>
    );
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-gray-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">👥 Review Applicants</h2>
              <p className="opacity-90">{jobTitle}</p>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Progress</div>
              <div className="text-lg font-bold">
                {currentIndex + 1} / {applications.length}
              </div>
            </div>
          </div>
        </div>

        {/* Applicant Card */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start space-x-4">
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {currentApplication.applicant.avatar ? (
                  <img
                    src={currentApplication.applicant.avatar}
                    alt={`${currentApplication.applicant.first_name} ${currentApplication.applicant.last_name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">
                  {currentApplication.applicant.first_name} {currentApplication.applicant.last_name}
                </h3>
                <p className="text-gray-600">@{currentApplication.applicant.username}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  {currentApplication.applicant.location && (
                    <span className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {currentApplication.applicant.location}
                    </span>
                  )}
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {currentApplication.experience_years_at_apply} years exp
                  </span>
                </div>
              </div>
              {/* AI Match Score */}
              <div className={`text-center p-3 rounded-lg ${getMatchScoreBg(currentApplication.match_score || 0)}`}>
                <SparklesIcon className="h-6 w-6 mx-auto mb-1 text-primary-600" />
                <div className={`text-2xl font-bold ${getMatchScoreColor(currentApplication.match_score || 0)}`}>
                  {Math.round(currentApplication.match_score || 0)}%
                </div>
                <div className="text-xs text-gray-600">AI Match</div>
              </div>
            </div>

            {/* Bio */}
            {currentApplication.applicant.bio && (
              <div>
                <h4 className="font-semibold mb-2">About</h4>
                <p className="text-gray-700">{currentApplication.applicant.bio}</p>
              </div>
            )}

            {/* Skills */}
            <div>
              <h4 className="font-semibold mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {(currentApplication.skills_at_apply || []).map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Application Details */}
            <div className="grid grid-cols-2 gap-4">
              {currentApplication.salary_expectation && (
                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-1">Salary Expectation</h5>
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1 text-green-600" />
                    <span>${parseInt(currentApplication.salary_expectation).toLocaleString()}</span>
                  </div>
                </div>
              )}
              {currentApplication.location_preference && (
                <div>
                  <h5 className="font-medium text-sm text-gray-600 mb-1">Location Preference</h5>
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1 text-blue-600" />
                    <span className="text-sm">{currentApplication.location_preference}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Match Scores */}
            <div>
              <h4 className="font-semibold mb-3">🎯 AI Match Breakdown</h4>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Skills', score: currentApplication.skills_match_score, color: 'blue' },
                  { label: 'Experience', score: currentApplication.experience_match_score, color: 'green' },
                  { label: 'Location', score: currentApplication.location_match_score, color: 'purple' },
                  { label: 'Salary', score: currentApplication.salary_match_score, color: 'orange' }
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-full h-2 bg-gray-200 rounded-full mb-1`}>
                      <div 
                        className={`h-2 rounded-full bg-${item.color}-500`}
                        style={{ width: `${item.score || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">{item.label}</div>
                    <div className="font-bold text-sm">{Math.round(item.score || 0)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cover Letter */}
            <div>
              <h4 className="font-semibold mb-2">Cover Letter</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {currentApplication.cover_letter}
                </p>
              </div>
            </div>

            {/* Resume Link */}
            {currentApplication.resume && (
              <div>
                <h4 className="font-semibold mb-2">Resume</h4>
                <a
                  href={currentApplication.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  View Resume
                </a>
              </div>
            )}

            {/* Notes Section */}
            {showNotes && (
              <div>
                <h4 className="font-semibold mb-2">Add Notes (Private)</h4>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                  placeholder="Add private notes about this applicant..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex justify-center space-x-4">
            {/* Reject */}
            <button
              onClick={() => handleReview('rejected')}
              disabled={processing}
              className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-105 disabled:opacity-50"
            >
              <XMarkIconSolid className="h-8 w-8" />
            </button>

            {/* Maybe */}
            <button
              onClick={() => handleReview('maybe')}
              disabled={processing}
              className="flex items-center justify-center w-16 h-16 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-all transform hover:scale-105 disabled:opacity-50"
            >
              <QuestionMarkCircleIconSolid className="h-8 w-8" />
            </button>

            {/* Accept */}
            <button
              onClick={() => handleReview('accepted')}
              disabled={processing}
              className="flex items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all transform hover:scale-105 disabled:opacity-50"
            >
              <CheckIconSolid className="h-8 w-8" />
            </button>
          </div>

          <div className="text-center mt-4 space-x-4">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showNotes ? 'Hide Notes' : '+ Add Notes'}
            </button>
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Close Review
            </button>
          </div>

          <div className="text-center mt-2 text-xs text-gray-500">
            ❌ Reject • ❓ Maybe • ✅ Accept
          </div>
        </div>
      </div>
    </div>
  );
};

export default TinderReview;