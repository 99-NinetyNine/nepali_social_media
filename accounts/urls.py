from django.urls import path
from .views import (
    RegisterView, login_view, ProfileView, UserListView,
    ConnectUserView, ConnectionListView, CompanyListCreateView,
    JobListCreateView, JobApplicationView
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
]