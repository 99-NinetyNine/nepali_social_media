import React from 'react';

const Stories: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Stories</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
          <div key={i} className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 relative">
              <div className="absolute top-2 left-2">
                <div className="h-8 w-8 bg-white rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-bold">{i}</span>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-sm font-medium truncate">
                  User {i}'s Story
                </p>
                <p className="text-white text-xs opacity-75">
                  2h ago
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-gray-500">Stories disappear after 24 hours</p>
      </div>
    </div>
  );
};

export default Stories;