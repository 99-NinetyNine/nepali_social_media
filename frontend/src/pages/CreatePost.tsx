import React from 'react';

const CreatePost: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Type
            </label>
            <select className="input">
              <option value="facebook">Facebook Post</option>
              <option value="linkedin">LinkedIn Post</option>
              <option value="instagram">Instagram Post</option>
              <option value="youtube_video">YouTube Video</option>
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="story">Story (24h)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input type="text" className="input" placeholder="Enter post title..." />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea 
              className="input" 
              rows={4} 
              placeholder="What's on your mind?"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media
            </label>
            <input type="file" multiple className="input" accept="image/*,video/*" />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Enable monetization</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Allow comments</span>
            </label>
          </div>
          
          <button className="btn btn-primary w-full">
            Create Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;