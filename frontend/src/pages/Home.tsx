import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PostCard from '../components/posts/PostCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { postsApi } from '../services/api';
import { Post } from '../types';

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [nextUrl, setNextUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 1000 >= 
        document.documentElement.offsetHeight &&
        hasMorePosts && 
        !isLoadingMore && 
        !isLoading
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMorePosts, isLoadingMore, isLoading]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await postsApi.getPosts({ limit: 10 });
      const data = response.data;
      
      setPosts(data.results || data);
      setNextUrl(data.next || null);
      setHasMorePosts(!!(data.next));
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!nextUrl || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      
      // Extract page number from nextUrl or use offset
      const urlParams = new URLSearchParams(nextUrl.split('?')[1]);
      const limit = urlParams.get('limit') || '10';
      const offset = urlParams.get('offset') || posts.length.toString();
      
      const response = await postsApi.getPosts({ 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });
      const data = response.data;
      
      const newPosts = data.results || data;
      setPosts(prev => [...prev, ...newPosts]);
      setNextUrl(data.next || null);
      setHasMorePosts(!!(data.next));
      
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      await postsApi.likePost(postId);
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, user_reaction: post.user_reaction ? null : 'like', like_count: post.user_reaction ? post.like_count - 1 : post.like_count + 1 }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShare = async (postId: number, message: string = '') => {
    try {
      await postsApi.sharePost(postId, message);
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, share_count: post.share_count + 1 }
          : post
      ));
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleRefresh = () => {
    setPosts([]);
    setHasMorePosts(true);
    setNextUrl(null);
    fetchPosts();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Social Media Platform
        </h1>
        <p className="text-gray-600 mb-4">
          Connect, share, shop, and earn - all in one platform
        </p>
        <Link 
          to="/create-post" 
          className="btn btn-primary inline-flex items-center"
        >
          ✏️ Create New Post
        </Link>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/stories" className="card p-4 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">📸</div>
          <div className="text-sm font-medium">Stories</div>
        </Link>
        
        <Link to="/shorts" className="card p-4 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🎬</div>
          <div className="text-sm font-medium">Shorts</div>
        </Link>
        
        <Link to="/shop" className="card p-4 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🛍️</div>
          <div className="text-sm font-medium">Shop</div>
        </Link>
        
        <Link to="/jobs" className="card p-4 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">💼</div>
          <div className="text-sm font-medium">Jobs</div>
        </Link>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Social Features</h3>
          <p className="text-gray-600 text-sm">
            Posts, stories, shorts, and professional networking
          </p>
        </div>
        
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">E-commerce</h3>
          <p className="text-gray-600 text-sm">
            Buy and sell products with fast delivery in local area
          </p>
        </div>
        
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Monetization</h3>
          <p className="text-gray-600 text-sm">
            Earn from your content through views, likes, and ad revenue
          </p>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Feed</h2>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
        
        {isLoading && posts.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="card p-6 text-center text-red-600">
            <p>{error}</p>
            <button 
              onClick={handleRefresh}
              className="btn btn-primary mt-4"
            >
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="card p-6 text-center text-gray-500">
            <p className="mb-4">No posts yet. Be the first to share something!</p>
            <Link to="/create-post" className="btn btn-primary">
              Create Your First Post
            </Link>
          </div>
        ) : (
          <>
            {posts.map((post, index) => (
              <div key={`${post.id}-${index}`}>
                <PostCard 
                  post={post} 
                  onLike={handleLike}
                  onShare={handleShare}
                />
                
                {/* Insert ad after every 5 posts for non-premium users */}
                {(index + 1) % 5 === 0 && (
                  <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2 text-blue-800">
                        🚀 Upgrade to Premium
                      </h3>
                      <p className="text-blue-600 mb-4">
                        Remove ads, get unlimited features, and earn more from your content
                      </p>
                      <Link to="/premium" className="btn btn-primary btn-sm">
                        Go Premium
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
                <span className="ml-3 text-gray-600">Loading more posts...</span>
              </div>
            )}
            
            {/* End of posts indicator */}
            {!hasMorePosts && posts.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="bg-gray-100 rounded-full px-4 py-2 inline-block">
                  🎉 You've reached the end! 
                  <Link to="/create-post" className="text-primary-600 hover:underline ml-2">
                    Create a new post?
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Home;