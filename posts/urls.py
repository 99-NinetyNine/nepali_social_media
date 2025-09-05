from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PostListCreateView, PostDetailView, like_post, share_post,
    CommentListCreateView, TrendingHashtagsView, BoostPostView,
    PostViewSet
)

# Create a router and register ViewSets with it
router = DefaultRouter()
router.register(r'v2', PostViewSet, basename='posts-v2')

urlpatterns = [
    # Old API endpoints (maintain backward compatibility)
    path('', PostListCreateView.as_view(), name='post-list-create'),
    path('<int:pk>/', PostDetailView.as_view(), name='post-detail'),
    path('<int:post_id>/like/', like_post, name='like-post'),
    path('<int:post_id>/share/', share_post, name='share-post'),
    path('<int:post_id>/comments/', CommentListCreateView.as_view(), name='post-comments'),
    path('<int:post_id>/boost/', BoostPostView.as_view(), name='boost-post'),
    path('trending-hashtags/', TrendingHashtagsView.as_view(), name='trending-hashtags'),
    
    # New ViewSet-based API
    path('', include(router.urls)),
]