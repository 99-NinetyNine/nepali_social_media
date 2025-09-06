import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { postsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    post_type: 'post',
    title: '',
    description: '',
    enable_monetization: false,
    allow_comments: true,
    is_advertisement: false,
  });
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type && ['post', 'short', 'story', 'ad'].includes(type)) {
      setFormData(prev => ({ ...prev, post_type: type }));
    }
  }, [searchParams]);

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
      
      // For job postings, force monetization and comments to false
      if (formData.post_type === 'job') {
        postData.append('enable_monetization', 'false');
        postData.append('allow_comments', 'false');
      } else {
        postData.append('enable_monetization', formData.enable_monetization.toString());
        postData.append('allow_comments', formData.allow_comments.toString());
      }
      
      postData.append('is_advertisement', formData.is_advertisement.toString());

      if (files) {
        Array.from(files).forEach((file) => {
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
          
          <div className="space-y-3">
            {formData.post_type !== 'job' && (
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
            )}
            
            <div className="border-t pt-3">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  name="is_advertisement"
                  checked={formData.is_advertisement}
                  onChange={handleInputChange}
                  className="mr-2" 
                />
                <span className="text-sm font-medium text-blue-600">
                  📢 Mark as Advertisement
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  (Will be shown to non-premium users)
                </span>
              </label>
              {formData.is_advertisement && (
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  Your {formData.post_type} will be displayed as sponsored content to non-premium users.
                </p>
              )}
            </div>
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