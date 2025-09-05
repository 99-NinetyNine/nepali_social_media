from django.urls import path
from .views import (
    RegisterView, login_view, ProfileView, UserListView,
    ConnectUserView, ConnectionListView, CompanyListCreateView,
    JobListCreateView, JobApplicationView, PublicProfileView,
    UserPostsView, follow_user, approve_follow_request, 
    follow_requests, followers_list, following_list
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', login_view, name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('connect/', ConnectUserView.as_view(), name='connect-user'),
    path('connections/', ConnectionListView.as_view(), name='connections'),
    path('companies/', CompanyListCreateView.as_view(), name='companies'),
    path('jobs/', JobListCreateView.as_view(), name='jobs'),
    path('jobs/apply/', JobApplicationView.as_view(), name='job-apply'),
    
    # Profile and follow system
    path('profile/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
    path('profile/<str:username>/posts/', UserPostsView.as_view(), name='user-posts'),
    path('follow/<str:username>/', follow_user, name='follow-user'),
    path('follow-requests/', follow_requests, name='follow-requests'),
    path('follow-requests/<int:connection_id>/', approve_follow_request, name='approve-follow'),
    path('profile/<str:username>/followers/', followers_list, name='followers-list'),
    path('profile/<str:username>/following/', following_list, name='following-list'),
]