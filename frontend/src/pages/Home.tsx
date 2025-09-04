import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Social Media Platform
        </h1>
        <p className="text-gray-600">
          Connect, share, shop, and earn - all in one platform
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Social Features</h3>
          <p className="text-gray-600 text-sm">
            Facebook-style posts, LinkedIn networking, Instagram stories, and YouTube shorts
          </p>
        </div>
        
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">E-commerce</h3>
          <p className="text-gray-600 text-sm">
            Buy and sell products with fast delivery in Kathmandu area
          </p>
        </div>
        
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Monetization</h3>
          <p className="text-gray-600 text-sm">
            Earn from your content through views, likes, and ad revenue
          </p>
        </div>
      </div>

      {/* Posts Feed Placeholder */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Your Feed</h2>
        
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-16"></div>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            
            <div className="h-48 bg-gray-100 rounded mb-4"></div>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>👍 42 likes</span>
              <span>💬 8 comments</span>
              <span>🔄 3 shares</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;