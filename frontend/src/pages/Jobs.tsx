import React from 'react';

const Jobs: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <button className="btn btn-primary">
          Post a Job
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Filters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Job Type</label>
                <select className="input">
                  <option>All Types</option>
                  <option>Full Time</option>
                  <option>Part Time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Experience</label>
                <select className="input">
                  <option>All Levels</option>
                  <option>Entry Level</option>
                  <option>Mid Level</option>
                  <option>Senior Level</option>
                  <option>Executive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input type="text" className="input" placeholder="Enter location..." />
              </div>
              
              <button className="btn btn-primary w-full">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Job Listings */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-primary-600">C{i}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Software Engineer {i}
                      </h3>
                      <p className="text-gray-600 mb-2">Company {i}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>=Í Kathmandu, Nepal</span>
                        <span>=¼ Full Time</span>
                        <span>=Å 2 days ago</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm">
                    Apply Now
                  </button>
                </div>
                
                <p className="text-gray-700 mb-4">
                  We are looking for a talented software engineer to join our team. 
                  You will be responsible for developing high-quality applications...
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {['React', 'Node.js', 'TypeScript', 'MongoDB'].map(skill => (
                    <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;