import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi, postsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!username) {
          // No username provided, load current user's profile
          if (!currentUser) {
            setError('Please login to view your profile');
            return;
          }
          
          const response = await authApi.getProfile();
          console.log("response.data", response.data);
          setProfile({
            ...response.data,
            user: response.data.user,
            isOwnProfile: true
          });
        } else {
          // Username provided, load that user's profile
          const response = await authApi.getPublicProfile(username);
          setProfile({
            ...response.data,
            isOwnProfile: username === currentUser?.username
          });
        }
      } catch (error: any) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, currentUser]);

  useEffect(() => {
    if (profile && activeTab === 'posts') {
      loadUserPosts();
    }
  }, [profile, activeTab]);

  const loadUserPosts = async () => {
    try {
      setPostsLoading(true);
      const targetUsername = username || currentUser?.username;
      if (!targetUsername) return;

      const response = await authApi.getUserPosts(targetUsername);
      // Filter only regular posts (not shorts, stories, jobs, ads)
      const regularPosts = response.data.results?.filter((post: any) => 
        post.post_type === 'post' && !post.is_advertisement
      ) || [];
      setPosts(regularPosts);
    } catch (error) {
      console.error('Error loading user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleTabNavigation = (tab: string) => {
    if (tab === 'posts') {
      setActiveTab('posts');
    } else {
      // Navigate to specialized views with user filter
      const targetUsername = username || currentUser?.username;
      const params = new URLSearchParams();
      if (targetUsername) {
        params.set('user', targetUsername);
        params.set('view', 'mine');
      }
      
      switch (tab) {
        case 'stories':
          navigate(`/stories?${params.toString()}`);
          break;
        case 'shorts':
          navigate(`/shorts?${params.toString()}`);
          break;
        case 'jobs':
          navigate(`/jobs?${params.toString()}`);
          break;
        case 'ads':
          navigate(`/?${params.toString()}&type=ads`);
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Profile Header */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                alt={profile.user?.username || 'User avatar'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {(profile.user?.first_name?.[0] || profile.user?.username?.[0] || '?').toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.user?.first_name && profile.user?.last_name
                ? `${profile.user.first_name} ${profile.user.last_name}`
                : profile.user?.username || 'Unknown User'
              }
              
              {/* Premium ticks */}
              {profile.user?.has_blue_tick && (
                <span className="ml-2 text-blue-500" title="Blue Tick (LaliGurans Badge) 🌺">
                  ✓
                </span>
              )}
              {profile.user?.has_gold_tick && (
                <span className="ml-2 text-yellow-500" title="Golden Tick (Sagarmatha Badge) 🏔️">
                  ✓
                </span>
              )}
              {profile.user?.has_business_tick && (
                <span className="ml-2 text-green-500" title="Business Tick (Dhaka Badge) 🧵">
                  ✓
                </span>
              )}
              {profile.user?.has_special_tick && (
                <span className="ml-2 text-purple-500" title="Special Tick (Pashupatinath Badge) 🕉️">
                  ✓
                </span>
              )}
              
              {/* Show subscription badge */}
              {profile.user?.subscription_badge && (
                <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
                  {profile.user.subscription_badge === 1 && '🌺 TIER 1'}
                  {profile.user.subscription_badge === 2 && '🦚 TIER 2'}
                  {profile.user.subscription_badge === 3 && '🏔️ TIER 3'}
                </span>
              )}
            </h1>
            
            <p className="text-gray-600 mb-2">@{profile.user?.username || 'unknown'}</p>
            
            {profile.bio && (
              <p className="text-gray-700">{profile.bio}</p>
            )}
            
            {profile.location && (
              <p className="text-gray-500 text-sm mt-1">📍 {profile.location}</p>
            )}
          </div>
          
          {profile.isOwnProfile && (
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Edit Profile
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {profile.posts_count || 0}
            </div>
            <div className="text-gray-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {profile.followers_count || 0}
            </div>
            <div className="text-gray-600">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {profile.following_count || 0}
            </div>
            <div className="text-gray-600">Following</div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="border-t pt-6">
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => handleTabNavigation('posts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'posts' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              📝 Posts
            </button>
            <button
              onClick={() => handleTabNavigation('stories')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              📖 Stories
            </button>
            <button
              onClick={() => handleTabNavigation('shorts')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              🎬 Shorts
            </button>
            {profile.user?.is_business && (
              <button
                onClick={() => handleTabNavigation('jobs')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                💼 Jobs
              </button>
            )}
            <button
              onClick={() => handleTabNavigation('ads')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              📢 Ads
            </button>
          </div>

          {/* Posts Content */}
          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {post.title || 'Untitled Post'}
                          </h3>
                          <p className="text-gray-700 mb-3">
                            {post.description?.length > 150 
                              ? `${post.description.substring(0, 150)}...` 
                              : post.description
                            }
                          </p>
                          
                          {/* Post Media */}
                          {post.media && post.media.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {post.media.slice(0, 4).map((media: any, index: number) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                                  {media.media_type === 'image' ? (
                                    <img 
                                      src={media.file} 
                                      alt={media.alt_text}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <video 
                                      src={media.file}
                                      poster={media.thumbnail}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  {post.media.length > 4 && index === 3 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                      <span className="text-white font-semibold">
                                        +{post.media.length - 4} more
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span>👍 {post.like_count}</span>
                              <span>💬 {post.comment_count}</span>
                              <span>👁️ {post.view_count}</span>
                            </div>
                            <span>
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {profile.isOwnProfile 
                    ? "You haven't shared any posts yet." 
                    : `${profile.user?.first_name || profile.user?.username || 'This user'} hasn't shared any posts yet.`
                  }
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;