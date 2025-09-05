import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  UserPlusIcon, 
  UserMinusIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  CogIcon,
  MapPinIcon,
  LinkIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { 
  UserPlusIcon as UserPlusIconSolid,
  CheckIcon as CheckIconSolid 
} from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PostCard from '../components/posts/PostCard';

interface UserProfile {
  id: number;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_business: boolean;
    date_joined: string;
  };
  bio: string;
  avatar: string | null;
  cover_photo: string | null;
  location: string;
  website: string;
  phone_number: string;
  is_verified: boolean;
  privacy_level: string;
  requires_follow_approval: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  follow_status: string | null;
  is_following: boolean;
}

interface Post {
  id: number;
  author: any;
  title: string;
  description: string;
  post_type: string;
  privacy: string;
  is_monetized: boolean;
  allow_comments: boolean;
  allow_sharing: boolean;
  created_at: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  media: any[];
  hashtags: any[];
  user_reaction: string | null;
  is_shared_by_user: boolean;
  is_boosted?: boolean;
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'reels' | 'jobs'>('posts');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auth/profile/${username}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setError('Profile not found');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await fetch(`/api/auth/profile/${username}/posts/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    
    setFollowLoading(true);
    try {
      const response = await fetch(`/api/auth/follow/${username}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update profile follow status based on response
        setProfile(prev => prev ? {
          ...prev,
          follow_status: data.action === 'followed' ? 'accepted' : 
                       data.action === 'request_sent' ? 'pending' : null,
          is_following: data.action === 'followed',
          followers_count: data.action === 'followed' ? prev.followers_count + 1 :
                          data.action === 'unfollowed' ? prev.followers_count - 1 : prev.followers_count
        } : null);
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getFollowButtonContent = () => {
    if (!profile) return { text: 'Follow', icon: UserPlusIcon, className: 'btn-primary' };
    
    if (profile.is_following) {
      return { 
        text: 'Following', 
        icon: CheckIconSolid, 
        className: 'btn-success hover:btn-danger hover:text-white group' 
      };
    } else if (profile.follow_status === 'pending') {
      return { 
        text: 'Requested', 
        icon: ClockIcon, 
        className: 'btn-secondary' 
      };
    } else {
      return { 
        text: 'Follow', 
        icon: UserPlusIcon, 
        className: 'btn-primary' 
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h1>
          <p className="text-gray-600 mb-4">{error || 'The user you are looking for does not exist.'}</p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const followBtn = getFollowButtonContent();
  const isOwnProfile = false; // You'd check this against current user

  // Filter posts by type based on active tab
  const filteredPosts = posts.filter(post => {
    switch (activeTab) {
      case 'posts':
        return post.post_type === 'post';
      case 'stories':
        return post.post_type === 'story';
      case 'reels':
        return post.post_type === 'short';
      case 'jobs':
        return post.post_type === 'job';
      default:
        return true;
    }
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Cover Photo */}
      <div className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6">
        {profile.cover_photo ? (
          <img
            src={profile.cover_photo}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
        )}
        
        {/* Profile Picture */}
        <div className="absolute -bottom-6 left-6">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.user.username}
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-2xl font-bold">
                  {profile.user.first_name?.[0] || profile.user.username[0]}
                </span>
              </div>
            )}
            
            {profile.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <ShieldCheckIcon className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {profile.user.first_name && profile.user.last_name 
                ? `${profile.user.first_name} ${profile.user.last_name}`
                : profile.user.username
              }
              {profile.user.is_business && (
                <BuildingOfficeIcon className="inline h-6 w-6 ml-2 text-blue-600" />
              )}
            </h1>
            
            <p className="text-gray-600 mb-2">@{profile.user.username}</p>
            
            {profile.bio && (
              <p className="text-gray-700 mb-4 max-w-md">{profile.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {profile.location && (
                <div className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {profile.location}
                </div>
              )}
              
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:underline"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Website
                </a>
              )}
              
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Joined {formatDate(profile.user.date_joined)}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            {isOwnProfile ? (
              <Link to="/settings" className="btn btn-secondary">
                <CogIcon className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`btn ${followBtn.className} group`}
              >
                {followLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <followBtn.icon className="h-4 w-4 mr-2 group-hover:hidden" />
                )}
                <span className="group-hover:hidden">{followBtn.text}</span>
                <span className="hidden group-hover:inline">
                  {profile.is_following ? 'Unfollow' : followBtn.text}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex space-x-8 mb-8 text-center">
          <div>
            <div className="text-xl font-bold text-gray-900">{profile.posts_count}</div>
            <div className="text-sm text-gray-600">Posts</div>
          </div>
          
          <Link to={`/profile/${username}/followers`} className="hover:bg-gray-50 p-2 rounded">
            <div className="text-xl font-bold text-gray-900">{profile.followers_count}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </Link>
          
          <Link to={`/profile/${username}/following`} className="hover:bg-gray-50 p-2 rounded">
            <div className="text-xl font-bold text-gray-900">{profile.following_count}</div>
            <div className="text-sm text-gray-600">Following</div>
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['posts', 'stories', 'reels', ...(profile.user.is_business ? ['jobs'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
                {tab === 'posts' && posts.filter(p => p.post_type === 'post').length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {posts.filter(p => p.post_type === 'post').length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">
                No {activeTab} yet
              </p>
              <p className="text-sm">
                {isOwnProfile 
                  ? `Share your first ${activeTab.slice(0, -1)}!` 
                  : `${profile.user.first_name || profile.user.username} hasn't shared any ${activeTab} yet.`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={(postId) => {
                    // Handle like
                    console.log('Like post:', postId);
                  }}
                  onShare={(postId) => {
                    // Handle share
                    console.log('Share post:', postId);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;