from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, login_view, ProfileView, UserListView,
    ConnectUserView, ConnectionListView, CompanyListCreateView,
    JobViewSet, JobApplicationView, PublicProfileView,
    UserPostsView, follow_user, approve_follow_request, 
    follow_requests, followers_list, following_list,
    SubscriptionViewSet, subscribe_to_creator, add_credits,
    credit_transactions, subscription_status, update_portal_preferences,
    get_portal_preferences
)

router = DefaultRouter()
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'jobs', JobViewSet, basename='jobs')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', login_view, name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('connect/', ConnectUserView.as_view(), name='connect-user'),
    path('connections/', ConnectionListView.as_view(), name='connections'),
    path('companies/', CompanyListCreateView.as_view(), name='companies'),
    path('jobs/apply/', JobApplicationView.as_view(), name='job-apply'),
    
    # Profile and follow system
    path('profile/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
    path('profile/<str:username>/posts/', UserPostsView.as_view(), name='user-posts'),
    path('follow/<str:username>/', follow_user, name='follow-user'),
    path('follow-requests/', follow_requests, name='follow-requests'),
    path('follow-requests/<int:connection_id>/', approve_follow_request, name='approve-follow'),
    path('profile/<str:username>/followers/', followers_list, name='followers-list'),
    path('profile/<str:username>/following/', following_list, name='following-list'),
    
    # Subscription endpoints
    path('', include(router.urls)),
    path('subscribe/<str:username>/', subscribe_to_creator, name='subscribe-to-creator'),
    path('credits/add/', add_credits, name='add-credits'),
    path('credits/transactions/', credit_transactions, name='credit-transactions'),
    path('subscription-status/<str:username>/', subscription_status, name='subscription-status'),
    
    # Portal preferences
    path('portal-preferences/', get_portal_preferences, name='get-portal-preferences'),
    path('portal-preferences/update/', update_portal_preferences, name='update-portal-preferences'),
]