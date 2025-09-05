import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  EllipsisVerticalIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { postsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface ShortVideo {
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
  media: Array<{
    id: number;
    media_type: string;
    file: string;
    thumbnail?: string;
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
  created_at: string;
}

const Shorts: React.FC = () => {
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    fetchShorts();
  }, []);

  useEffect(() => {
    // Auto-play current video
    if (shorts.length > 0 && videoRefs.current[currentIndex]) {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        if (isPlaying) {
          currentVideo.play();
        } else {
          currentVideo.pause();
        }
      }
    }
  }, [currentIndex, isPlaying, shorts]);

  const fetchShorts = async () => {
    try {
      setLoading(true);
      const response = await postsApi.getPosts({ 
        type: 'short',
        limit: 20 
      });
      setShorts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      await postsApi.likePost(postId);
      setShorts(prev => prev.map(short => 
        short.id === postId 
          ? { 
              ...short, 
              user_reaction: short.user_reaction ? null : 'like', 
              like_count: short.user_reaction ? short.like_count - 1 : short.like_count + 1 
            }
          : short
      ));
    } catch (error) {
      console.error('Error liking short:', error);
    }
  };

  const handleShare = async (postId: number) => {
    try {
      await postsApi.sharePost(postId);
      setShorts(prev => prev.map(short => 
        short.id === postId 
          ? { ...short, share_count: short.share_count + 1, is_shared_by_user: true }
          : short
      ));
    } catch (error) {
      console.error('Error sharing short:', error);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRefs.current[currentIndex]) {
      videoRefs.current[currentIndex]!.muted = !isMuted;
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const goToNext = () => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        goToPrev();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        goToNext();
      } else if (event.key === ' ') {
        event.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, shorts.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">No Shorts Available</h1>
        <p className="text-gray-600 mb-6">Be the first to create a short video!</p>
        <Link to="/create-post" className="btn btn-primary">
          Create Short
        </Link>
      </div>
    );
  }

  const currentShort = shorts[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Navigation hints */}
      <div className="absolute top-4 left-4 z-20 text-white text-sm bg-black bg-opacity-50 rounded-lg px-3 py-2">
        <div>↑/↓ Navigate • Space Play/Pause</div>
        <div>{currentIndex + 1} / {shorts.length}</div>
      </div>

      {/* Close button */}
      <Link 
        to="/" 
        className="absolute top-4 right-4 z-20 text-white hover:text-gray-300"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Link>

      {/* Main video area */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video player */}
        <div className="relative w-full max-w-sm h-full bg-black">
          {currentShort.media && currentShort.media.length > 0 && (
            <video
              ref={(el) => videoRefs.current[currentIndex] = el}
              src={currentShort.media[0].file}
              className="w-full h-full object-cover"
              loop
              muted={isMuted}
              onClick={togglePlayPause}
              onEnded={goToNext}
              poster={currentShort.media[0].thumbnail}
            />
          )}

          {/* Play/Pause overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 rounded-full p-4">
                <PlayIcon className="w-12 h-12 text-white" />
              </div>
            </div>
          )}

          {/* Left side - User info and description */}
          <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black via-black/50 to-transparent">
            {/* Author */}
            <div className="flex items-center space-x-3 mb-3">
              <Link to={`/profile/${currentShort.author.username}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                  {currentShort.author.profile?.avatar ? (
                    <img
                      src={currentShort.author.profile.avatar}
                      alt={currentShort.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-400 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {currentShort.author.first_name?.[0] || currentShort.author.username[0]}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              <div className="flex-1">
                <Link 
                  to={`/profile/${currentShort.author.username}`}
                  className="text-white font-semibold hover:underline"
                >
                  {currentShort.author.first_name && currentShort.author.last_name
                    ? `${currentShort.author.first_name} ${currentShort.author.last_name}`
                    : currentShort.author.username
                  }
                </Link>
                <button className="ml-3 text-red-500 font-semibold">Follow</button>
              </div>
            </div>

            {/* Title */}
            {currentShort.title && (
              <h3 className="text-white font-semibold mb-2">{currentShort.title}</h3>
            )}

            {/* Description */}
            <p className="text-white text-sm mb-2 line-clamp-2">
              {currentShort.description}
            </p>

            {/* Hashtags */}
            {currentShort.hashtags && currentShort.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {currentShort.hashtags.slice(0, 3).map((hashtag) => (
                  <Link
                    key={hashtag.id}
                    to={`/hashtag/${hashtag.name}`}
                    className="text-blue-400 text-sm hover:underline"
                  >
                    #{hashtag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* View count */}
            <p className="text-gray-300 text-xs">
              {formatCount(currentShort.view_count)} views
            </p>
          </div>

          {/* Right side - Action buttons */}
          <div className="absolute bottom-20 right-2 flex flex-col space-y-4">
            {/* Like */}
            <button
              onClick={() => handleLike(currentShort.id)}
              className="flex flex-col items-center space-y-1"
            >
              {currentShort.user_reaction === 'like' ? (
                <HeartIconSolid className="w-8 h-8 text-red-500" />
              ) : (
                <HeartIcon className="w-8 h-8 text-white" />
              )}
              <span className="text-white text-xs font-semibold">
                {formatCount(currentShort.like_count)}
              </span>
            </button>

            {/* Comment */}
            <Link 
              to={`/post/${currentShort.id}`}
              className="flex flex-col items-center space-y-1"
            >
              <ChatBubbleLeftIcon className="w-8 h-8 text-white" />
              <span className="text-white text-xs font-semibold">
                {formatCount(currentShort.comment_count)}
              </span>
            </Link>

            {/* Share */}
            <button
              onClick={() => handleShare(currentShort.id)}
              className="flex flex-col items-center space-y-1"
            >
              <ShareIcon className="w-8 h-8 text-white" />
              <span className="text-white text-xs font-semibold">
                {formatCount(currentShort.share_count)}
              </span>
            </button>

            {/* More options */}
            <button className="flex flex-col items-center space-y-1">
              <EllipsisVerticalIcon className="w-8 h-8 text-white" />
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-4 right-4 flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300"
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-6 h-6" />
              ) : (
                <SpeakerWaveIcon className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-gray-300"
            >
              {isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
        
        {currentIndex < shorts.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Shorts;