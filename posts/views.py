from rest_framework import viewsets, status, permissions, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, F
from django.utils import timezone
from accounts.models import Connection
from .models import Post, Like, Comment, Share, PostView, Hashtag
from .serializers import (
    PostSerializer, PostCreateSerializer, LikeSerializer, 
    CommentSerializer, ShareSerializer, PostViewSerializer, HashtagSerializer
)
from .permissions import IsAuthorOrReadOnly, IsPremiumUser


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'hashtags__hashtag__name']
    ordering_fields = ['created_at', 'view_count', 'like_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return PostCreateSerializer
        return PostSerializer

    def get_queryset(self):
        user = self.request.user
        post_type = self.request.query_params.get('type')
        
        # Get user connections
        connections = Connection.objects.filter(
            Q(from_user=user, status='accepted') | 
            Q(to_user=user, status='accepted')
        )
        connected_users = []
        for conn in connections:
            if conn.from_user == user:
                connected_users.append(conn.to_user)
            else:
                connected_users.append(conn.from_user)
        
        # Base queryset
        queryset = Post.objects.select_related('author', 'author__profile').prefetch_related('media', 'hashtags__hashtag')
        
        # Filter by post type
        if post_type:
            queryset = queryset.filter(post_type=post_type)
            # Only exclude expired stories if we're filtering for stories
            if post_type == 'story':
                queryset = queryset.exclude(expires_at__lt=timezone.now())
        else:
            # For default posts feed, exclude shorts and stories
            queryset = queryset.exclude(post_type__in=['short', 'story'])
        
        # Privacy filtering with ad injection for non-premium users
        queryset = queryset.filter(
            Q(privacy='public') |
            Q(privacy='connections', author__in=connected_users) |
            Q(privacy='private', author=user) |
            Q(author=user)  # User's own posts
        ).filter(is_approved=True)
        
        # Add ads if user is not premium (and not filtering for specific type)
        if not user.is_premium_active() and not post_type:
            # Get boosted posts as ads (any type can be boosted)
            ads = Post.objects.filter(
                is_boosted=True,
                is_approved=True
            ).filter(
                Q(boost_expires_at__isnull=True) | Q(boost_expires_at__gt=timezone.now())
            ).filter(
                Q(privacy='public') |
                Q(privacy='connections', author__in=connected_users)
            ).order_by('-boost_amount')[:3]  # Top paid ads
            
            # Get regular posts (non-boosted)
            regular_posts = queryset.filter(
                Q(is_boosted=False) | Q(is_boosted__isnull=True)
            )[:15]
            
            # Combine and return as queryset
            ad_ids = list(ads.values_list('id', flat=True))
            regular_ids = list(regular_posts.values_list('id', flat=True))
            combined_ids = regular_ids + ad_ids
            
            return Post.objects.filter(id__in=combined_ids).distinct()
        
        return queryset

    def perform_create(self, serializer):
        # Basic content moderation (dummy implementation)
        from moderation.utils import moderate_post_content
        
        post_data = {
            'content': serializer.validated_data.get('description', ''),
            'title': serializer.validated_data.get('title', ''),
            'user_data': {
                'username': self.request.user.username,
                'is_premium': getattr(self.request.user, 'is_premium', False)
            }
        }
        
        # Run moderation (always approves in dummy implementation)
        moderate_post_content(post_data)
        
        # Save post with moderation status
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Record view if not the author and user is authenticated
        if request.user.is_authenticated and request.user != instance.author:
            # Check if this user has already viewed this post in the last hour
            # to prevent spam views
            from django.utils import timezone
            one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
            
            recent_view = PostView.objects.filter(
                user=request.user,
                post=instance,
                created_at__gte=one_hour_ago
            ).exists()
            
            if not recent_view:
                PostView.objects.create(
                    user=request.user,
                    post=instance,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:200]
                )
                # Update view count
                Post.objects.filter(id=instance.id).update(view_count=F('view_count') + 1)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Like or unlike a post"""
        post = self.get_object()
        reaction_type = request.data.get('reaction_type', 'like')
        
        like, created = Like.objects.get_or_create(
            user=request.user,
            post=post,
            defaults={'reaction_type': reaction_type}
        )
        
        if not created:
            if like.reaction_type == reaction_type:
                # Remove like if same reaction
                like.delete()
                Post.objects.filter(id=post.id).update(like_count=F('like_count') - 1)
                return Response({'message': 'Reaction removed', 'liked': False})
            else:
                # Update reaction type
                like.reaction_type = reaction_type
                like.save()
        else:
            # Increment like count
            Post.objects.filter(id=post.id).update(like_count=F('like_count') + 1)
        
        return Response({'message': 'Post liked', 'liked': True, 'reaction_type': reaction_type})

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share a post"""
        post = self.get_object()
        message = request.data.get('message', '')
        
        share, created = Share.objects.get_or_create(
            user=request.user,
            post=post,
            defaults={'message': message}
        )
        
        if created:
            # Increment share count
            Post.objects.filter(id=post.id).update(share_count=F('share_count') + 1)
            return Response({'message': 'Post shared successfully'})
        
        return Response({'message': 'Already shared'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get comments for a post"""
        post = self.get_object()
        comments = Comment.objects.filter(post=post, parent=None).order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to a post"""
        post = self.get_object()
        content = request.data.get('content')
        parent_id = request.data.get('parent')
        
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not post.allow_comments:
            return Response({'error': 'Comments are not allowed for this post'}, status=status.HTTP_400_BAD_REQUEST)
        
        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, post=post)
            except Comment.DoesNotExist:
                return Response({'error': 'Parent comment not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = Comment.objects.create(
            author=request.user,
            post=post,
            content=content,
            parent=parent
        )
        
        # Update comment count
        Post.objects.filter(id=post.id).update(comment_count=F('comment_count') + 1)
        
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def boost(self, request, pk=None):
        """Boost a post with payment"""
        post = self.get_object()
        
        if post.author != request.user:
            return Response({'error': 'You can only boost your own posts'}, status=status.HTTP_403_FORBIDDEN)
        
        boost_amount = float(request.data.get('amount', 0))
        
        if boost_amount <= 0:
            return Response({
                'error': 'Boost amount must be greater than 0'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.account_balance < boost_amount:
            return Response({
                'error': 'Insufficient account balance'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Deduct from user account
        request.user.account_balance = F('account_balance') - boost_amount
        request.user.save()
        
        # Boost the post
        post.is_boosted = True
        post.boost_amount = F('boost_amount') + boost_amount
        post.boost_expires_at = timezone.now() + timezone.timedelta(days=7)
        post.save()
        
        return Response({
            'success': True,
            'message': f'Post boosted with ${boost_amount}'
        })

    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """Get current user's posts"""
        posts = Post.objects.filter(author=request.user).order_by('-created_at')
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending posts"""
        trending_posts = Post.objects.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).order_by('-view_count', '-like_count')[:20]
        
        serializer = self.get_serializer(trending_posts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def track_view(self, request, pk=None):
        """Track a post view (for home feed impressions)"""
        post = self.get_object()
        
        # Only track if not the author
        if request.user.is_authenticated and request.user != post.author:
            from django.utils import timezone
            one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
            
            # Check for recent view to prevent spam
            recent_view = PostView.objects.filter(
                user=request.user,
                post=post,
                created_at__gte=one_hour_ago
            ).exists()
            
            if not recent_view:
                PostView.objects.create(
                    user=request.user,
                    post=post,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:200],
                    view_duration=request.data.get('duration', 0)  # Time spent viewing
                )
                # Update view count
                Post.objects.filter(id=post.id).update(view_count=F('view_count') + 1)
                
                return Response({'message': 'View tracked'})
        
        return Response({'message': 'View not tracked'})


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs.get('post_pk')
        if post_id:
            return Comment.objects.filter(
                post_id=post_id, 
                parent=None
            ).select_related('author', 'author__profile').order_by('-created_at')
        return Comment.objects.none()

    def perform_create(self, serializer):
        post_id = self.kwargs['post_pk']
        post = get_object_or_404(Post, id=post_id)
        
        if not post.allow_comments:
            raise serializers.ValidationError("Comments are not allowed for this post")
        
        parent_id = self.request.data.get('parent')
        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, post=post)
            except Comment.DoesNotExist:
                raise serializers.ValidationError("Parent comment not found")
        
        comment = serializer.save(author=self.request.user, post=post, parent=parent)
        post.comment_count = F('comment_count') + 1
        post.save()

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None, post_pk=None):
        """Like or unlike a comment"""
        comment = self.get_object()
        
        like, created = Like.objects.get_or_create(
            user=request.user,
            comment=comment,
            defaults={'reaction_type': 'like'}
        )
        
        if not created:
            like.delete()
            return Response({'message': 'Like removed', 'liked': False})
        
        return Response({'message': 'Comment liked', 'liked': True})

    @action(detail=True, methods=['get'])
    def replies(self, request, pk=None, post_pk=None):
        """Get replies to a comment"""
        comment = self.get_object()
        replies = Comment.objects.filter(parent=comment).order_by('created_at')
        serializer = CommentSerializer(replies, many=True)
        return Response(serializer.data)


class HashtagViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HashtagSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Hashtag.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['trending_score', 'post_count', 'created_at']
    ordering = ['-trending_score']

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending hashtags"""
        trending_hashtags = Hashtag.objects.order_by('-trending_score', '-post_count')[:20]
        serializer = self.get_serializer(trending_hashtags, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """Get posts for a specific hashtag"""
        hashtag = self.get_object()
        posts = Post.objects.filter(
            hashtags__hashtag=hashtag,
            privacy='public',
            is_approved=True
        ).order_by('-created_at')
        
        # Use PostViewSet serializer for consistency
        from .serializers import PostSerializer
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)