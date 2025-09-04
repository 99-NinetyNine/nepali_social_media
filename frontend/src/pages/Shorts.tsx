import React from 'react';

const Shorts: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shorts</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5,6,7,8,9].map(i => (
          <div key={i} className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
            <div className="h-80 bg-gradient-to-br from-red-400 to-yellow-400 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-50 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <h3 className="text-white font-semibold mb-1">
                  Short Video {i}
                </h3>
                <p className="text-gray-300 text-sm mb-2">
                  This is a short video description...
                </p>
                <div className="flex items-center justify-between text-white text-sm">
                  <span>=d Creator {i}</span>
                  <div className="flex items-center space-x-3">
                    <span>d {Math.floor(Math.random() * 1000)}K</span>
                    <span>=¬ {Math.floor(Math.random() * 100)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shorts;