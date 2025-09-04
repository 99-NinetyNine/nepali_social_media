from django.urls import path
from .views import (
    PostListCreateView, PostDetailView, like_post, share_post,
    CommentListCreateView, TrendingHashtagsView, BoostPostView
)

urlpatterns = [
    path('', PostListCreateView.as_view(), name='post-list-create'),
    path('<int:pk>/', PostDetailView.as_view(), name='post-detail'),
    path('<int:post_id>/like/', like_post, name='like-post'),
    path('<int:post_id>/share/', share_post, name='share-post'),
    path('<int:post_id>/comments/', CommentListCreateView.as_view(), name='post-comments'),
    path('<int:post_id>/boost/', BoostPostView.as_view(), name='boost-post'),
    path('trending-hashtags/', TrendingHashtagsView.as_view(), name='trending-hashtags'),
]