from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
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
        serializer.save(author=self.request.user)


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