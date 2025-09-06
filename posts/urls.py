from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentViewSet, HashtagViewSet

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'', PostViewSet, basename='posts')  # Empty prefix for posts
router.register(r'hashtags', HashtagViewSet, basename='hashtags')

urlpatterns = [
    # Main ViewSet routes
    path('', include(router.urls)),
    
    # Manual nested routes for comments (using clean URLs)
    path('<int:post_pk>/comments/', CommentViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='post-comments-list'),
    
    path('<int:post_pk>/comments/<int:pk>/', CommentViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='post-comments-detail'),
    
    path('<int:post_pk>/comments/<int:pk>/like/', CommentViewSet.as_view({
        'post': 'like'
    }), name='comment-like'),
    
    path('<int:post_pk>/comments/<int:pk>/replies/', CommentViewSet.as_view({
        'get': 'replies'
    }), name='comment-replies'),
]