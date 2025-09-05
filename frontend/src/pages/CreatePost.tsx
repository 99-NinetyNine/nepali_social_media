import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    post_type: 'post',
    title: '',
    description: '',
    enable_monetization: false,
    allow_comments: true,
  });
  const [files, setFiles] = useState<FileList | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Please enter some content for your post');
      return;
    }

    setIsLoading(true);
    try {
      const postData = new FormData();
      postData.append('post_type', formData.post_type);
      postData.append('description', formData.description);
      if (formData.title) postData.append('title', formData.title);
      postData.append('enable_monetization', formData.enable_monetization.toString());
      postData.append('allow_comments', formData.allow_comments.toString());

      if (files) {
        Array.from(files).forEach((file, index) => {
          postData.append('media', file);
        });
      }

      await postsApi.createPost(postData);
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Type
            </label>
            <select 
              name="post_type"
              value={formData.post_type}
              onChange={handleInputChange}
              className="input"
            >
              <option value="post">Regular Post</option>
              <option value="job">Job Posting (Organizations only)</option>
              <option value="short">Short Video (max 2 min)</option>
              <option value="story">Story (max 20 sec, expires in 24h)</option>
              <option value="ad">Advertisement</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input 
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="input" 
              placeholder="Enter post title..." 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input" 
              rows={4} 
              placeholder="What's on your mind?"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media
            </label>
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              className="input" 
              accept="image/*,video/*" 
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                name="enable_monetization"
                checked={formData.enable_monetization}
                onChange={handleInputChange}
                className="mr-2" 
              />
              <span className="text-sm">Enable monetization</span>
            </label>
            <label className="flex items-center">
              <input 
                type="checkbox" 
                name="allow_comments"
                checked={formData.allow_comments}
                onChange={handleInputChange}
                className="mr-2" 
              />
              <span className="text-sm">Allow comments</span>
            </label>
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full flex items-center justify-center"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Create Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;