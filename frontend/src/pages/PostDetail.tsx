import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HeartIcon, ChatBubbleLeftIcon, ShareIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface Post {
  id: number;
  author: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    profile?: {
      avatar?: string;
    };
  };
  title: string;
  description: string;
  post_type: string;
  privacy: string;
  media: Array<{
    id: number;
    media_type: string;
    file: string;
    thumbnail?: string;
    alt_text: string;
    text_overlay?: string;
    text_position?: 'top' | 'middle' | 'bottom';
    duration?: number;
  }>;
  hashtags: Array<{
    id: number;
    name: string;
  }>;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  user_reaction: string | null;
  is_shared_by_user: boolean;
  allow_comments: boolean;
  allow_sharing: boolean;
  created_at: string;
}

interface Comment {
  id: number;
  author: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    profile?: {
      avatar?: string;
    };
  };
  content: string;
  like_count: number;
  created_at: string;
  replies: Comment[];
}

const PostDetail: React.FC = () => {
  const { postId } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await postsApi.getPost(parseInt(postId!));
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    
    try {
      await postsApi.likePost(post.id);
      setPost(prev => prev ? {
        ...prev,
        user_reaction: prev.user_reaction ? null : 'like',
        like_count: prev.user_reaction ? prev.like_count - 1 : prev.like_count + 1
      } : null);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShare = async () => {
    if (!post || !post.allow_sharing) return;
    
    try {
      await postsApi.sharePost(post.id);
      setPost(prev => prev ? {
        ...prev,
        share_count: prev.share_count + 1,
        is_shared_by_user: true
      } : null);
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post || !post.allow_comments) return;

    setAddingComment(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newComment
        })
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [newCommentData, ...prev]);
        setNewComment('');
        setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h1>
          <p className="text-gray-600 mb-4">{error || 'The post you are looking for does not exist.'}</p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card p-6 mb-6">
        {/* Post Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {post.author.profile?.avatar ? (
                <img 
                  src={post.author.profile.avatar} 
                  alt={post.author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary-600 font-medium">
                  {post.author.first_name?.[0] || post.author.username[0]}
                  {post.author.last_name?.[0] || ''}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {post.author.first_name && post.author.last_name 
                  ? `${post.author.first_name} ${post.author.last_name}`
                  : post.author.username
                }
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(post.created_at)} • {post.privacy}
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <EllipsisHorizontalIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Post Content */}
        <div className="mb-6">
          {post.title && (
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
          )}
          <p className="text-gray-700 text-lg leading-relaxed mb-4 whitespace-pre-wrap">
            {post.description}
          </p>
          
          {/* Post Media */}
          {post.media && post.media.length > 0 && (
            <div className="mb-4 space-y-4">
              {post.media.map((media, index) => (
                <div key={media.id} className="relative">
                  {media.media_type === 'image' ? (
                    <div className="relative">
                      <img 
                        src={media.file} 
                        alt={media.alt_text || 'Post image'}
                        className="w-full rounded-lg"
                      />
                      {media.text_overlay && (
                        <div className={`absolute inset-0 flex items-center justify-center text-white text-xl font-bold text-center p-4 ${
                          media.text_position === 'top' ? 'items-start pt-8' :
                          media.text_position === 'bottom' ? 'items-end pb-8' : 'items-center'
                        }`}>
                          <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                            {media.text_overlay}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : media.media_type === 'video' ? (
                    <video 
                      src={media.file}
                      controls
                      className="w-full rounded-lg"
                      poster={media.thumbnail}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="p-4 border border-gray-300 rounded-lg">
                      <a 
                        href={media.file} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Download {media.media_type}: {media.alt_text || 'File'}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Post Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.hashtags.map((hashtag) => (
                <Link
                  key={hashtag.id}
                  to={`/hashtag/${hashtag.name}`}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm hover:bg-blue-200"
                >
                  #{hashtag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* Post Stats */}
        <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 mb-6">
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
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span>{post.comment_count}</span>
            </div>
            
            {post.allow_sharing && (
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600"
              >
                <ShareIcon className="h-5 w-5" />
                <span>{post.share_count}</span>
              </button>
            )}
          </div>
          <div className="text-gray-500 text-sm">
            {post.view_count.toLocaleString()} views
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-6">Comments</h2>
        
        {/* Comment Input */}
        {post.allow_comments && (
          <form onSubmit={handleAddComment} className="flex space-x-3 mb-6">
            <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium">You</span>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Write a comment..."
                disabled={addingComment}
              />
              <div className="flex justify-end mt-2">
                <button 
                  type="submit"
                  disabled={addingComment || !newComment.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {addingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </form>
        )}

        {!post.allow_comments && (
          <div className="text-center py-4 text-gray-500">
            Comments are disabled for this post.
          </div>
        )}
        
        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {comment.author.profile?.avatar ? (
                    <img 
                      src={comment.author.profile.avatar} 
                      alt={comment.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-medium text-sm">
                      {comment.author.first_name?.[0] || comment.author.username[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium mb-1">
                      {comment.author.first_name && comment.author.last_name 
                        ? `${comment.author.first_name} ${comment.author.last_name}`
                        : comment.author.username
                      }
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <button className="hover:text-red-600">Like ({comment.like_count})</button>
                    <button className="hover:text-blue-600">Reply</button>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 ml-4 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex space-x-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 text-xs">
                              {reply.author.first_name?.[0] || reply.author.username[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-100 p-2 rounded-lg">
                              <h5 className="font-medium text-sm mb-1">
                                {reply.author.first_name && reply.author.last_name 
                                  ? `${reply.author.first_name} ${reply.author.last_name}`
                                  : reply.author.username
                                }
                              </h5>
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                              <button className="hover:text-red-600">Like ({reply.like_count})</button>
                              <span>{formatDate(reply.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;