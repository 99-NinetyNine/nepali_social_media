from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q, F
from .models import User, UserProfile, Connection, Company, Job, JobApplication, Subscription, CreditTransaction
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserProfileSerializer,
    ConnectionSerializer, CompanySerializer, JobSerializer, JobApplicationSerializer,
    SubscriptionSerializer, SubscriptionCreateSerializer, CreditTransactionSerializer
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=email, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    
    return Response({
        'error': 'Invalid credentials'
    }, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class ConnectUserView(generics.CreateAPIView):
    serializer_class = ConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        to_user_id = request.data.get('to_user')
        connection_type = request.data.get('connection_type', 'follow')
        
        to_user = get_object_or_404(User, id=to_user_id)
        
        if to_user == request.user:
            return Response({
                'error': 'Cannot connect to yourself'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        connection, created = Connection.objects.get_or_create(
            from_user=request.user,
            to_user=to_user,
            defaults={'connection_type': connection_type}
        )
        
        if not created:
            connection.connection_type = connection_type
            connection.status = 'pending'
            connection.save()
        
        return Response(
            ConnectionSerializer(connection).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class ConnectionListView(generics.ListAPIView):
    serializer_class = ConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Connection.objects.filter(
            from_user=self.request.user,
            status='accepted'
        )


class CompanyListCreateView(generics.ListCreateAPIView):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Company.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        self.request.user.is_business = True
        self.request.user.save()
        serializer.save(owner=self.request.user)


class JobListCreateView(generics.ListCreateAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_business:
            return Job.objects.filter(company__owner=self.request.user)
        return Job.objects.filter(is_active=True)

    def perform_create(self, serializer):
        company_id = self.request.data.get('company')
        company = get_object_or_404(Company, id=company_id, owner=self.request.user)
        serializer.save(company=company)


class JobApplicationView(generics.CreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        job_id = self.request.data.get('job')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(applicant=self.request.user, job=job)


class PublicProfileView(generics.RetrieveAPIView):
    """Public profile view accessible by username"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'user__username'
    lookup_url_kwarg = 'username'

    def get_queryset(self):
        return UserProfile.objects.select_related('user').prefetch_related(
            'user__connections_made', 'user__connections_received'
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Add follow status for current user
        if request.user.is_authenticated and request.user != instance.user:
            follow_connection = Connection.objects.filter(
                from_user=request.user,
                to_user=instance.user,
                connection_type='follow'
            ).first()
            
            data['follow_status'] = follow_connection.status if follow_connection else None
            data['is_following'] = follow_connection and follow_connection.status == 'accepted'
        else:
            data['follow_status'] = None
            data['is_following'] = False
            
        return Response(data)


class UserPostsView(generics.ListAPIView):
    """Get posts by a specific user (for their profile page)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from posts.models import Post
        username = self.kwargs['username']
        user = get_object_or_404(User, username=username)
        
        # Check privacy and follow status
        if user == self.request.user:
            # Own posts - show all
            return Post.objects.filter(author=user)
        elif user.profile.privacy_level == 'public':
            # Public profile - show all posts
            return Post.objects.filter(author=user, privacy__in=['public', 'connections'])
        elif user.profile.privacy_level in ['friends', 'private']:
            # Private profile - check if following
            is_following = Connection.objects.filter(
                from_user=self.request.user,
                to_user=user,
                connection_type='follow',
                status='accepted'
            ).exists()
            
            if is_following:
                return Post.objects.filter(author=user, privacy__in=['public', 'connections'])
            else:
                return Post.objects.none()
        
        return Post.objects.none()

    def get_serializer_class(self):
        from posts.serializers import PostSerializer
        return PostSerializer


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def follow_user(request, username):
    """Follow or unfollow a user"""
    target_user = get_object_or_404(User, username=username)
    
    if target_user == request.user:
        return Response({
            'error': 'Cannot follow yourself'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if already following
    connection = Connection.objects.filter(
        from_user=request.user,
        to_user=target_user,
        connection_type='follow'
    ).first()
    
    if connection:
        if connection.status == 'accepted':
            # Unfollow
            connection.delete()
            # Update counts
            target_user.profile.followers_count = F('followers_count') - 1
            target_user.profile.save()
            request.user.profile.following_count = F('following_count') - 1
            request.user.profile.save()
            
            return Response({
                'action': 'unfollowed',
                'message': f'Unfollowed {target_user.username}'
            })
        elif connection.status == 'pending':
            # Cancel follow request
            connection.delete()
            return Response({
                'action': 'request_cancelled',
                'message': 'Follow request cancelled'
            })
    
    # Create new follow connection
    status_val = 'pending' if target_user.profile.requires_follow_approval else 'accepted'
    
    Connection.objects.create(
        from_user=request.user,
        to_user=target_user,
        connection_type='follow',
        status=status_val
    )
    
    # Update counts if accepted immediately
    if status_val == 'accepted':
        target_user.profile.followers_count = F('followers_count') + 1
        target_user.profile.save()
        request.user.profile.following_count = F('following_count') + 1
        request.user.profile.save()
        
        return Response({
            'action': 'followed',
            'message': f'Now following {target_user.username}'
        })
    else:
        return Response({
            'action': 'request_sent',
            'message': f'Follow request sent to {target_user.username}'
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def approve_follow_request(request, connection_id):
    """Approve or reject a follow request"""
    connection = get_object_or_404(
        Connection,
        id=connection_id,
        to_user=request.user,
        connection_type='follow',
        status='pending'
    )
    
    action = request.data.get('action')  # 'approve' or 'reject'
    
    if action == 'approve':
        connection.status = 'accepted'
        connection.save()
        
        # Update counts
        request.user.profile.followers_count = F('followers_count') + 1
        request.user.profile.save()
        connection.from_user.profile.following_count = F('following_count') + 1
        connection.from_user.profile.save()
        
        return Response({
            'action': 'approved',
            'message': f'Approved follow request from {connection.from_user.username}'
        })
    elif action == 'reject':
        connection.delete()
        return Response({
            'action': 'rejected',
            'message': 'Follow request rejected'
        })
    else:
        return Response({
            'error': 'Invalid action. Use "approve" or "reject"'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def follow_requests(request):
    """Get pending follow requests"""
    pending_requests = Connection.objects.filter(
        to_user=request.user,
        connection_type='follow',
        status='pending'
    ).select_related('from_user__profile')
    
    data = []
    for conn in pending_requests:
        data.append({
            'id': conn.id,
            'from_user': {
                'id': conn.from_user.id,
                'username': conn.from_user.username,
                'first_name': conn.from_user.first_name,
                'last_name': conn.from_user.last_name,
                'avatar': conn.from_user.profile.avatar.url if conn.from_user.profile.avatar else None,
            },
            'created_at': conn.created_at
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def followers_list(request, username):
    """Get followers list for a user"""
    target_user = get_object_or_404(User, username=username)
    
    # Check privacy
    if target_user != request.user and target_user.profile.privacy_level == 'private':
        is_following = Connection.objects.filter(
            from_user=request.user,
            to_user=target_user,
            status='accepted'
        ).exists()
        if not is_following:
            return Response({
                'error': 'This user\'s followers list is private'
            }, status=status.HTTP_403_FORBIDDEN)
    
    followers = Connection.objects.filter(
        to_user=target_user,
        connection_type='follow',
        status='accepted'
    ).select_related('from_user__profile')
    
    data = []
    for conn in followers:
        data.append({
            'id': conn.from_user.id,
            'username': conn.from_user.username,
            'first_name': conn.from_user.first_name,
            'last_name': conn.from_user.last_name,
            'avatar': conn.from_user.profile.avatar.url if conn.from_user.profile.avatar else None,
            'is_verified': conn.from_user.profile.is_verified,
            'bio': conn.from_user.profile.bio,
            'followed_at': conn.created_at
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def following_list(request, username):
    """Get following list for a user"""
    target_user = get_object_or_404(User, username=username)
    
    # Check privacy
    if target_user != request.user and target_user.profile.privacy_level == 'private':
        is_following = Connection.objects.filter(
            from_user=request.user,
            to_user=target_user,
            status='accepted'
        ).exists()
        if not is_following:
            return Response({
                'error': 'This user\'s following list is private'
            }, status=status.HTTP_403_FORBIDDEN)
    
    following = Connection.objects.filter(
        from_user=target_user,
        connection_type='follow',
        status='accepted'
    ).select_related('to_user__profile')
    
    data = []
    for conn in following:
        data.append({
            'id': conn.to_user.id,
            'username': conn.to_user.username,
            'first_name': conn.to_user.first_name,
            'last_name': conn.to_user.last_name,
            'avatar': conn.to_user.profile.avatar.url if conn.to_user.profile.avatar else None,
            'is_verified': conn.to_user.profile.is_verified,
            'bio': conn.to_user.profile.bio,
            'followed_at': conn.created_at
        })
    
    return Response(data)


class SubscriptionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user subscriptions"""
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            # Show user's subscriptions or subscriptions to them
            return Subscription.objects.filter(
                Q(subscriber=self.request.user) | Q(creator=self.request.user)
            )
        return Subscription.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

    @action(detail=False, methods=['get'])
    def my_subscriptions(self, request):
        """Get subscriptions made by current user"""
        subscriptions = Subscription.objects.filter(subscriber=request.user, is_active=True)
        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_subscribers(self, request):
        """Get users subscribed to current user"""
        subscriptions = Subscription.objects.filter(creator=request.user, is_active=True)
        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription"""
        subscription = self.get_object()
        
        # Only subscriber or creator can cancel
        if request.user not in [subscription.subscriber, subscription.creator]:
            return Response({
                'error': 'You cannot cancel this subscription'
            }, status=status.HTTP_403_FORBIDDEN)
        
        subscription.is_active = False
        subscription.auto_renew = False
        subscription.save()
        
        return Response({
            'message': 'Subscription cancelled successfully'
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def subscribe_to_creator(request, username):
    """Subscribe to a creator"""
    creator = get_object_or_404(User, username=username)
    
    if creator == request.user:
        return Response({
            'error': 'Cannot subscribe to yourself'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not creator.profile.allow_subscriptions:
        return Response({
            'error': 'This creator is not accepting subscriptions'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if already subscribed
    existing = Subscription.objects.filter(
        subscriber=request.user,
        creator=creator,
        is_active=True
    ).exists()
    
    if existing:
        return Response({
            'error': 'You are already subscribed to this creator'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create subscription with creator's monthly fee
    serializer = SubscriptionCreateSerializer(
        data={
            'creator': creator.id,
            'monthly_fee': creator.profile.monthly_subscription_fee
        },
        context={'request': request}
    )
    
    if serializer.is_valid():
        subscription = serializer.save()
        return Response({
            'message': f'Successfully subscribed to {creator.username}',
            'subscription': SubscriptionSerializer(subscription).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_credits(request):
    """Add credits to user account (simplified - in real app would integrate with payment gateway)"""
    amount = request.data.get('amount')
    
    if not amount or float(amount) <= 0:
        return Response({
            'error': 'Invalid amount'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    amount = float(amount)
    
    # In real app, this would process payment first
    profile = request.user.profile
    balance_before = profile.credit_balance
    profile.credit_balance += amount
    profile.save()
    
    # Record transaction
    CreditTransaction.objects.create(
        user=request.user,
        amount=amount,
        transaction_type='add_funds',
        description=f'Added ${amount} to account',
        balance_before=balance_before,
        balance_after=profile.credit_balance
    )
    
    return Response({
        'message': f'Successfully added ${amount} to your account',
        'new_balance': profile.credit_balance
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def credit_transactions(request):
    """Get user's credit transaction history"""
    transactions = CreditTransaction.objects.filter(
        user=request.user
    ).order_by('-created_at')
    
    serializer = CreditTransactionSerializer(transactions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def subscription_status(request, username):
    """Check if current user is subscribed to a specific creator"""
    creator = get_object_or_404(User, username=username)
    
    subscription = Subscription.objects.filter(
        subscriber=request.user,
        creator=creator,
        is_active=True
    ).first()
    
    return Response({
        'is_subscribed': bool(subscription and subscription.is_current()),
        'subscription': SubscriptionSerializer(subscription).data if subscription else None,
        'creator_subscription_fee': creator.profile.monthly_subscription_fee,
        'creator_accepts_subscriptions': creator.profile.allow_subscriptions
    })