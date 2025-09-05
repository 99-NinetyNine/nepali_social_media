import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { UserIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Post } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Stories: React.FC = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Post | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/posts/?post_type=story', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const activeStories = data.results?.filter((story: Post) => !isStoryExpired(story)) || [];
        setStories(activeStories);
      } else {
        setError('Failed to fetch stories');
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Failed to fetch stories');
    } finally {
      setLoading(false);
    }
  };

  const isStoryExpired = (story: Post) => {
    const storyTime = new Date(story.created_at).getTime();
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - storyTime > twentyFourHours;
  };

  const openStory = (story: Post) => {
    setSelectedStory(story);
  };

  const handleCreateStory = () => {
    navigate('/create-post?type=story');
  };

  const closeStory = () => {
    setSelectedStory(null);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Stories</h1>
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Stories</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Add Your Story */}
        <div 
          onClick={handleCreateStory}
          className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300"
        >
          <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full p-3 mx-auto mb-2">
                <PlusIcon className="h-6 w-6 text-primary-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium">Add Story</p>
            </div>
          </div>
        </div>

        {stories.map((story) => (
          <div 
            key={story.id} 
            className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openStory(story)}
          >
            <div className="h-48 relative">
              {story.media && story.media.length > 0 ? (
                story.media[0].media_type === 'image' ? (
                  <img
                    src={story.media[0].file}
                    alt={story.media[0].alt_text}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={story.media[0].file}
                    className="w-full h-full object-cover"
                    poster={story.media[0].thumbnail || undefined}
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <p className="text-white text-center p-4 text-sm">{story.description}</p>
                </div>
              )}
              
              {/* User avatar */}
              <div className="absolute top-2 left-2">
                {story.author.profile?.avatar ? (
                  <img
                    src={story.author.profile.avatar}
                    alt={story.author.username}
                    className="h-8 w-8 rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="h-8 w-8 bg-white rounded-full border-2 border-white flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
              
              {/* Story info */}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-sm font-medium truncate drop-shadow-sm">
                  {story.author.first_name || story.author.username}
                </p>
                <p className="text-white text-xs opacity-75 drop-shadow-sm">
                  {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stories.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Stories Yet</h3>
          <p className="text-gray-600 mb-4">Be the first to share a story with your friends!</p>
        </div>
      )}
      
      <div className="mt-8 text-center">
        <p className="text-gray-500">Stories disappear after 24 hours</p>
      </div>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-md w-full mx-4">
            {/* Close button */}
            <button
              onClick={closeStory}
              className="absolute top-4 right-4 text-white z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              ×
            </button>
            
            {/* Story header */}
            <div className="absolute top-4 left-4 right-16 flex items-center z-10">
              {selectedStory.author.profile?.avatar ? (
                <img
                  src={selectedStory.author.profile.avatar}
                  alt={selectedStory.author.username}
                  className="h-8 w-8 rounded-full border border-white mr-3"
                />
              ) : (
                <div className="h-8 w-8 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-gray-600" />
                </div>
              )}
              <div>
                <p className="text-white font-medium text-sm">
                  {selectedStory.author.first_name || selectedStory.author.username}
                </p>
                <p className="text-gray-300 text-xs">
                  {formatDistanceToNow(new Date(selectedStory.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Story content */}
            <div className="rounded-lg overflow-hidden">
              {selectedStory.media && selectedStory.media.length > 0 ? (
                selectedStory.media[0].media_type === 'image' ? (
                  <img
                    src={selectedStory.media[0].file}
                    alt={selectedStory.media[0].alt_text}
                    className="w-full max-h-screen object-contain"
                  />
                ) : (
                  <video
                    src={selectedStory.media[0].file}
                    controls
                    className="w-full max-h-screen"
                    poster={selectedStory.media[0].thumbnail || undefined}
                  />
                )
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center rounded-lg">
                  <p className="text-white text-center p-6">{selectedStory.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stories;