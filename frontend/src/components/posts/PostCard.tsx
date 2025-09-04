import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon,
  EllipsisHorizontalIcon 
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  onLike?: (postId: number, reactionType: string) => void;
  onShare?: (postId: number) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onShare }) => {
  const handleLike = () => {
    if (onLike) {
      onLike(post.id, post.user_reaction === 'like' ? 'unlike' : 'like');
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(post.id);
    }
  };

  const getPostTypeColor = (type: string) => {
    const colors = {
      facebook: 'bg-blue-100 text-blue-800',
      linkedin: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      youtube_shorts: 'bg-red-100 text-red-800',
      youtube_video: 'bg-red-100 text-red-800',
      story: 'bg-purple-100 text-purple-800',
      ad: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="card p-6 card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Link to={`/profile/${post.author.username}`}>
            {post.author.profile?.avatar ? (
              <img
                src={post.author.profile.avatar}
                alt={post.author.username}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-medium text-sm">
                  {post.author.first_name?.[0] || post.author.username[0]}
                </span>
              </div>
            )}
          </Link>
          
          <div>
            <Link 
              to={`/profile/${post.author.username}`}
              className="font-medium text-gray-900 hover:text-primary-600"
            >
              {post.author.first_name && post.author.last_name 
                ? `${post.author.first_name} ${post.author.last_name}`
                : post.author.username}
            </Link>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPostTypeColor(post.post_type)}`}>
                {post.post_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        <button className="text-gray-400 hover:text-gray-600">
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        {post.title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {post.title}
          </h3>
        )}
        <p className="text-gray-700 whitespace-pre-wrap">
          {post.description}
        </p>
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mb-4">
          {post.media.length === 1 ? (
            <div className="rounded-lg overflow-hidden">
              {post.media[0].media_type === 'image' ? (
                <img 
                  src={post.media[0].file}
                  alt={post.media[0].alt_text}
                  className="w-full h-auto max-h-96 object-cover"
                />
              ) : (
                <video 
                  controls
                  className="w-full h-auto max-h-96"
                  poster={post.media[0].thumbnail || undefined}
                >
                  <source src={post.media[0].file} />
                </video>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
              {post.media.slice(0, 4).map((media, index) => (
                <div key={media.id} className="relative">
                  {media.media_type === 'image' ? (
                    <img 
                      src={media.file}
                      alt={media.alt_text}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <video className="w-full h-32 object-cover">
                      <source src={media.file} />
                    </video>
                  )}
                  {index === 3 && post.media.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-medium">
                        +{post.media.length - 4} more
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 text-sm ${
              post.user_reaction === 'like' 
                ? 'text-red-600' 
                : 'text-gray-500 hover:text-red-600'
            }`}
          >
            {post.user_reaction === 'like' ? (
              <HeartIconSolid className="h-5 w-5" />
            ) : (
              <HeartIcon className="h-5 w-5" />
            )}
            <span>{post.like_count}</span>
          </button>
          
          <Link 
            to={`/post/${post.id}`}
            className="flex items-center space-x-2 text-sm text-gray-500 hover:text-primary-600"
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span>{post.comment_count}</span>
          </Link>
          
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600"
          >
            <ShareIcon className="h-5 w-5" />
            <span>{post.share_count}</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>{post.view_count} views</span>
          {post.is_monetized && (
            <span className="text-green-600">💰 Monetized</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;