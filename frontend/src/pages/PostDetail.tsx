import React from 'react';
import { useParams } from 'react-router-dom';

const PostDetail: React.FC = () => {
  const { postId } = useParams();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card p-6 mb-6">
        {/* Post Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-medium">JD</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">John Doe</h3>
            <p className="text-sm text-gray-500">2 hours ago • Public</p>
          </div>
        </div>
        
        {/* Post Content */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Post #{postId}</h1>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            This is a detailed view of the post. Here we can see the full content, 
            all the media attachments, and complete interaction details. This post 
            demonstrates how content would be displayed in an expanded format with 
            better readability and more space for engagement.
          </p>
          
          {/* Post Media */}
          <div className="mb-4">
            <img 
              src="https://via.placeholder.com/600x300" 
              alt="Post content"
              className="w-full rounded-lg"
            />
          </div>
          
          {/* Post Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">#technology</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">#innovation</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">#socialmedia</span>
          </div>
        </div>
        
        {/* Post Stats */}
        <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 mb-6">
          <div className="flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600">
              <span>❤️</span>
              <span>245 Likes</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
              <span>💬</span>
              <span>32 Comments</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-green-600">
              <span>🔄</span>
              <span>18 Shares</span>
            </button>
          </div>
          <div className="text-gray-500 text-sm">
            1,234 views
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-6">Comments</h2>
        
        {/* Comment Input */}
        <div className="flex space-x-3 mb-6">
          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium">You</span>
          </div>
          <div className="flex-1">
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={3}
              placeholder="Write a comment..."
            ></textarea>
            <div className="flex justify-end mt-2">
              <button className="btn btn-primary btn-sm">Post Comment</button>
            </div>
          </div>
        </div>
        
        {/* Comments List */}
        <div className="space-y-4">
          {[1, 2, 3].map((comment) => (
            <div key={comment} className="flex space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">U{comment}</span>
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-1">User {comment}</h4>
                  <p className="text-gray-700">
                    Great post! This is really insightful and well written. 
                    Thanks for sharing your thoughts on this topic.
                  </p>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <button className="hover:text-red-600">Like</button>
                  <button className="hover:text-blue-600">Reply</button>
                  <span>{comment} hours ago</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
