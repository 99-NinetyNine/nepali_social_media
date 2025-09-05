from rest_framework import viewsets, generics, status, permissions, filters, serializers
from rest_framework.decorators import action, api_view, permission_classes
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


class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'hashtags__hashtag__name']
    ordering_fields = ['created_at', 'view_count', 'like_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
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
        
        # Base queryset - exclude expired stories
        queryset = Post.objects.exclude(
            post_type='story',
            expires_at__lt=timezone.now()
        ).select_related('author', 'author__profile').prefetch_related('media', 'hashtags__hashtag')
        
        # Filter by post type
        if post_type:
            queryset = queryset.filter(post_type=post_type)
        
        # Privacy filtering
        queryset = queryset.filter(
            Q(privacy='public') |
            Q(privacy='connections', author__in=connected_users) |
            Q(privacy='private', author=user) |
            Q(author=user)  # User's own posts
        ).filter(is_approved=True)
        
        # Add ads if user is not premium
        if not user.is_premium_active():
            # Get boosted posts as ads
            ads = Post.objects.filter(
                is_boosted=True,
                post_type='ad',
                boost_expires_at__gt=timezone.now()
            ).order_by('-boost_amount')[:5]
            
            # Merge with regular posts
            post_ids = list(queryset.values_list('id', flat=True)[:20])
            ad_ids = list(ads.values_list('id', flat=True))
            all_ids = post_ids + ad_ids
            
            return Post.objects.filter(id__in=all_ids).distinct()
        
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
        moderation_result = moderate_post_content(post_data)
        
        # Save post with moderation status
        post = serializer.save(author=self.request.user)
        
        # In production, you might store moderation results
        # post.moderation_score = moderation_result.get('confidence', 0.95)
        # post.save()


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.all()

    def get_object(self):
        obj = super().get_object()
        
        # Record view if not the author
        if self.request.user != obj.author:
            PostView.objects.get_or_create(
                user=self.request.user,
                post=obj,
                defaults={
                    'ip_address': self.request.META.get('REMOTE_ADDR'),
                    'user_agent': self.request.META.get('HTTP_USER_AGENT', '')
                }
            )
            # Increment view count
            obj.view_count = F('view_count') + 1
            obj.save(update_fields=['view_count'])
        
        return obj


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def like_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    reaction_type = request.data.get('reaction_type', 'like')
    
    like, created = Like.objects.get_or_create(
        user=request.user,
        post=post,
        defaults={'reaction_type': reaction_type}
    )
    
    if not created:
        if like.reaction_type == reaction_type:
            # Remove reaction
            like.delete()
            # Update counts
            if reaction_type == 'like':
                post.like_count = F('like_count') - 1
            else:
                post.dislike_count = F('dislike_count') - 1
            post.save()
            return Response({'removed': True})
        else:
            # Change reaction
            old_reaction = like.reaction_type
            like.reaction_type = reaction_type
            like.save()
            
            # Update counts
            if old_reaction == 'like':
                post.like_count = F('like_count') - 1
            else:
                post.dislike_count = F('dislike_count') - 1
                
            if reaction_type == 'like':
                post.like_count = F('like_count') + 1
            else:
                post.dislike_count = F('dislike_count') + 1
            
            post.save()
    else:
        # New reaction
        if reaction_type == 'like':
            post.like_count = F('like_count') + 1
        else:
            post.dislike_count = F('dislike_count') + 1
        post.save()
    
    return Response(LikeSerializer(like).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def share_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    message = request.data.get('message', '')
    
    if not post.allow_sharing:
        return Response({
            'error': 'Sharing is not allowed for this post'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    share, created = Share.objects.get_or_create(
        user=request.user,
        post=post,
        defaults={'message': message}
    )
    
    if created:
        post.share_count = F('share_count') + 1
        post.save()
    
    return Response(ShareSerializer(share).data)


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return Comment.objects.filter(
            post_id=post_id, 
            parent=None
        ).select_related('author', 'author__profile')

    def perform_create(self, serializer):
        post_id = self.kwargs['post_id']
        post = get_object_or_404(Post, id=post_id)
        
        if not post.allow_comments:
            raise serializers.ValidationError("Comments are not allowed for this post")
        
        comment = serializer.save(author=self.request.user, post=post)
        post.comment_count = F('comment_count') + 1
        post.save()


class TrendingHashtagsView(generics.ListAPIView):
    serializer_class = HashtagSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Hashtag.objects.order_by('-trending_score', '-post_count')[:20]


class BoostPostView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id, author=request.user)
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


# Modern ViewSet-based implementation
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
        
        # Base queryset - exclude expired stories
        queryset = Post.objects.exclude(
            post_type='story',
            expires_at__lt=timezone.now()
        ).select_related('author', 'author__profile').prefetch_related('media', 'hashtags__hashtag')
        
        # Filter by post type
        if post_type:
            queryset = queryset.filter(post_type=post_type)
        
        # Filter by privacy and connections
        queryset = queryset.filter(
            Q(privacy='public') |
            Q(author=user) |
            Q(privacy='connections', author__in=connected_users)
        )
        
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
        
        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, post=post)
            except Comment.DoesNotExist:
                return Response({'error': 'Parent comment not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = Comment.objects.create(
            user=request.user,
            post=post,
            content=content,
            parent=parent
        )
        
        # Update comment count
        Post.objects.filter(id=post.id).update(comment_count=F('comment_count') + 1)
        
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsPremiumUser])
    def boost(self, request, pk=None):
        """Boost a post (premium feature)"""
        post = self.get_object()
        
        if post.author != request.user:
            return Response({'error': 'You can only boost your own posts'}, status=status.HTTP_403_FORBIDDEN)
        
        post.is_boosted = True
        post.save()
        
        return Response({'message': 'Post boosted successfully'})

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