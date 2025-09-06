from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q, F
from django.utils import timezone
from .models import User, UserProfile, Connection, Company, Job, JobApplication, Subscription, CreditTransaction, TierSubscriptionPurchase
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserProfileSerializer, ProfileWithUserSerializer,
    ConnectionSerializer, CompanySerializer, JobSerializer, JobApplicationSerializer,
    SubscriptionSerializer, SubscriptionCreateSerializer, CreditTransactionSerializer,
    GoogleAuthSerializer, GoogleAuthUrlSerializer, CompleteProfileSerializer,
    TierSubscriptionPurchaseSerializer, PurchaseSubscriptionTierSerializer, SubscriptionTierInfoSerializer
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
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProfileWithUserSerializer
        return UserProfileSerializer

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
        user = self.request.user
        
        # Check if user has business privileges
        if not user.is_business:
            user.is_business = True
            user.save()
        
        # Check organization count for payment
        from payments.models import Wallet
        
        existing_orgs = Company.objects.filter(owner=user).count()
        organization_fee = 50  # Fee per additional organization after the first one
        
        if existing_orgs >= 1:
            # Get or create user's wallet
            wallet, created = Wallet.objects.get_or_create(user=user)
            
            # Check if user has enough credits for additional organization
            if wallet.balance < organization_fee:
                raise ValidationError({
                    'error': f'Insufficient credits. Creating additional organizations requires {organization_fee} credits. Current balance: {wallet.balance}'
                })
            
            # Deduct credits from wallet
            wallet.deduct_funds(
                organization_fee,
                f'Organization creation fee for "{self.request.data.get("name", "New Organization")}"'
            )
        
        serializer.save(owner=user)


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Company.objects.filter(owner=self.request.user)

    def perform_destroy(self, instance):
        # Only allow deletion if it's not the user's only company and they have active jobs
        user_companies = Company.objects.filter(owner=self.request.user)
        
        if user_companies.count() == 1:
            # Check if there are active jobs for this company
            active_jobs = Job.objects.filter(company=instance, is_active=True).count()
            if active_jobs > 0:
                raise ValidationError({
                    'error': f'Cannot delete company with {active_jobs} active job postings. Please deactivate jobs first.'
                })
        
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def company_stats(request, company_id):
    """Get statistics for a specific company"""
    try:
        company = Company.objects.get(id=company_id, owner=request.user)
    except Company.DoesNotExist:
        return Response({
            'error': 'Company not found'
        }, status=status.HTTP_404_NOT_FOUND)

    # Calculate various statistics
    total_jobs = Job.objects.filter(company=company).count()
    active_jobs = Job.objects.filter(company=company, is_active=True).count()
    total_applications = JobApplication.objects.filter(job__company=company).count()
    pending_applications = JobApplication.objects.filter(
        job__company=company, 
        status='applied'
    ).count()
    
    # Recent activity (last 30 days)
    from django.utils import timezone
    from datetime import timedelta
    
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_applications = JobApplication.objects.filter(
        job__company=company,
        applied_at__gte=thirty_days_ago
    ).count()
    
    recent_jobs = Job.objects.filter(
        company=company,
        created_at__gte=thirty_days_ago
    ).count()

    return Response({
        'company': CompanySerializer(company).data,
        'stats': {
            'total_jobs': total_jobs,
            'active_jobs': active_jobs,
            'total_applications': total_applications,
            'pending_applications': pending_applications,
            'recent_applications': recent_applications,
            'recent_jobs': recent_jobs,
        }
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_company(request, company_id):
    """Submit company for verification (admin only endpoint in practice)"""
    try:
        company = Company.objects.get(id=company_id, owner=request.user)
    except Company.DoesNotExist:
        return Response({
            'error': 'Company not found'
        }, status=status.HTTP_404_NOT_FOUND)

    # In a real implementation, this would create a verification request
    # For now, we'll just mark as pending verification
    company.verification_status = 'pending'
    company.save()

    return Response({
        'message': 'Company submitted for verification',
        'company': CompanySerializer(company).data
    })


class JobViewSet(viewsets.ModelViewSet):
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

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Get AI-powered job recommendations for the current user"""
        from .job_matching import job_matcher
        
        user_profile = request.user.profile
        limit = int(request.query_params.get('limit', 10))
        
        recommendations = job_matcher.get_job_recommendations(user_profile, limit)
        
        # Serialize the jobs with match scores
        result = []
        for rec in recommendations:
            job_data = JobSerializer(rec['job']).data
            job_data['match_score'] = rec['match_score']
            job_data['skills_match'] = rec['skills_match']
            job_data['experience_match'] = rec['experience_match']
            job_data['location_match'] = rec['location_match']
            job_data['salary_match'] = rec['salary_match']
            result.append(job_data)
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def application_prefill(self, request):
        """Get prefilled application data for a specific job"""
        job_id = request.query_params.get('job_id')
        if not job_id:
            return Response({'error': 'job_id required'}, status=400)
        
        try:
            job = Job.objects.get(id=job_id, is_active=True)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)
        
        user_profile = request.user.profile
        
        # Auto-update experience
        user_profile.update_experience_years()
        
        # Calculate match scores
        from .job_matching import job_matcher
        match_scores = job_matcher.calculate_overall_match(user_profile, job)
        
        prefill_data = {
            'job_id': job.id,
            'job_title': job.title,
            'company_name': job.company.name,
            'experience_years': user_profile.get_current_experience_years(),
            'skills': user_profile.skills or [],
            'preferred_salary_min': str(user_profile.preferred_salary_min) if user_profile.preferred_salary_min else '',
            'preferred_salary_max': str(user_profile.preferred_salary_max) if user_profile.preferred_salary_max else '',
            'location_preferences': user_profile.preferred_locations or [],
            'remote_preference': user_profile.remote_work_preference or 'flexible',
            'cover_letter_template': user_profile.cover_letter_template or '',
            'match_scores': match_scores
        }
        
        return Response(prefill_data)

    @action(detail=True, methods=['get'])
    def applications_to_review(self, request, pk=None):
        """Get applications for Tinder-style review for job owners"""
        job = self.get_object()
        
        # Check if user owns this job's company
        if job.company.owner != request.user:
            return Response({'error': 'Not authorized to review applications for this job'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Get unreviewed applications ordered by match score
        applications = JobApplication.objects.filter(
            job=job,
            status='applied'
        ).select_related('applicant', 'applicant__profile').order_by('-match_score')
        
        # Serialize application data with applicant info
        applications_data = []
        for app in applications:
            applicant_profile = app.applicant.profile
            app_data = {
                'id': app.id,
                'applicant': {
                    'id': app.applicant.id,
                    'username': app.applicant.username,
                    'first_name': app.applicant.first_name,
                    'last_name': app.applicant.last_name,
                    'email': app.applicant.email,
                    'avatar': applicant_profile.avatar.url if applicant_profile.avatar else None,
                    'bio': applicant_profile.bio,
                    'location': applicant_profile.location,
                    'website': applicant_profile.website,
                    'skills': applicant_profile.skills or [],
                    'experience_years': applicant_profile.get_current_experience_years(),
                },
                'cover_letter': app.cover_letter,
                'resume': app.resume.url if app.resume else None,
                'applied_at': app.applied_at,
                'experience_years_at_apply': app.experience_years_at_apply,
                'skills_at_apply': app.skills_at_apply or [],
                'salary_expectation': str(app.salary_expectation) if app.salary_expectation else None,
                'location_preference': app.location_preference,
                'remote_preference': app.remote_preference,
                'match_score': app.match_score,
                'skills_match_score': app.skills_match_score,
                'experience_match_score': app.experience_match_score,
                'location_match_score': app.location_match_score,
                'salary_match_score': app.salary_match_score,
            }
            applications_data.append(app_data)
        
        return Response(applications_data)

    @action(detail=True, methods=['post'])
    def review_application(self, request, pk=None):
        """Tinder-style application review (accept/reject/maybe)"""
        job = self.get_object()
        
        # Check if user owns this job's company
        if job.company.owner != request.user:
            return Response({'error': 'Not authorized to review applications for this job'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        application_id = request.data.get('application_id')
        action = request.data.get('action')  # 'accepted', 'rejected', 'maybe'
        notes = request.data.get('notes', '')
        
        if not application_id or action not in ['accepted', 'rejected', 'maybe']:
            return Response({'error': 'Invalid application_id or action'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            application = JobApplication.objects.get(
                id=application_id,
                job=job,
                status='applied'
            )
        except JobApplication.DoesNotExist:
            return Response({'error': 'Application not found or already reviewed'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Update application status
        application.status = action
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.review_notes = notes
        application.save()
        
        return Response({
            'message': f'Application {action}',
            'application_id': application.id,
            'new_status': application.status
        })


# Keep the old class name for backwards compatibility
JobListCreateView = JobViewSet


class JobApplicationView(generics.CreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from .job_matching import job_matcher
        
        job_id = self.request.data.get('job')
        job = get_object_or_404(Job, id=job_id)
        user_profile = self.request.user.profile
        
        # Auto-update user's experience years
        user_profile.update_experience_years()
        
        # Create application with smart auto-filled data
        application = serializer.save(
            applicant=self.request.user, 
            job=job,
            # Auto-fill from profile
            experience_years_at_apply=user_profile.get_current_experience_years(),
            skills_at_apply=user_profile.skills or [],
            salary_expectation=self.request.data.get('salary_expectation') or user_profile.preferred_salary_max,
            location_preference=', '.join(user_profile.preferred_locations) if user_profile.preferred_locations else '',
            remote_preference=user_profile.remote_work_preference or ''
        )
        
        # Calculate and store AI match scores
        job_matcher.update_application_scores(application)
        
        return application


class PublicProfileView(generics.RetrieveAPIView):
    """Public profile view accessible by username"""
    serializer_class = ProfileWithUserSerializer
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_portal_preferences(request):
    """Update user's portal preferences (job/shop)"""
    profile = request.user.profile
    
    enable_job_portal = request.data.get('enable_job_portal')
    enable_shop_portal = request.data.get('enable_shop_portal')
    
    if enable_job_portal is not None:
        profile.enable_job_portal = enable_job_portal
    
    if enable_shop_portal is not None:
        profile.enable_shop_portal = enable_shop_portal
    
    profile.save()
    
    return Response({
        'message': 'Portal preferences updated successfully',
        'enable_job_portal': profile.enable_job_portal,
        'enable_shop_portal': profile.enable_shop_portal
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_portal_preferences(request):
    """Get user's current portal preferences"""
    profile = request.user.profile
    
    return Response({
        'enable_job_portal': profile.enable_job_portal,
        'enable_shop_portal': profile.enable_shop_portal,
        'is_business': request.user.is_business
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def google_auth_url(request):
    """Get Google OAuth authorization URL"""
    print("hi there..")
    serializer = GoogleAuthUrlSerializer()
    return Response(serializer.to_representation(None))


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def google_auth_callback(request):
    """Handle Google OAuth callback"""
    # Google sends GET request with code in query params
    if request.method == 'GET':
        code = request.GET.get('code')
        state = request.GET.get('state')
        
        if not code:
            return Response({
                'error': 'Authorization code not provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use code in serializer
        serializer = GoogleAuthSerializer(data={'code': code, 'state': state})
    else:
        # POST request with data in body
        serializer = GoogleAuthSerializer(data=request.data)
    
    if serializer.is_valid():
        return Response(serializer.validated_data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_profile(request):
    """Complete profile after Google OAuth signup"""
    serializer = CompleteProfileSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.update(request.user, serializer.validated_data)
        return Response({
            'message': 'Profile completed successfully',
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def purchase_tick(request):
    """Purchase a cultural tick badge"""
    tick_type = request.data.get('tick_type')
    duration_months = int(request.data.get('duration_months', 1))
    
    if tick_type not in ['blue', 'gold', 'business', 'special']:
        return Response({
            'error': 'Invalid tick type'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Pricing for different ticks (in credits)
    tick_prices = {
        'blue': 100,     # LaliGurans Badge 🌺
        'gold': 250,     # Sagarmatha Badge 🏔️  
        'business': 150, # Dhaka Badge 🧵
        'special': 200   # Pashupatinath Badge 🕉️
    }
    
    total_cost = tick_prices[tick_type] * duration_months
    
    # Check if user has enough credits
    if request.user.account_balance < total_cost:
        return Response({
            'error': f'Insufficient credits. Need {total_cost} credits.',
            'required': total_cost,
            'current_balance': float(request.user.account_balance)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Process purchase
    from django.utils import timezone
    from datetime import timedelta
    
    request.user.account_balance -= total_cost
    request.user.purchased_tick = tick_type
    
    # Extend or set expiry
    if request.user.tick_expires_at and request.user.tick_expires_at > timezone.now():
        # Extend existing tick
        request.user.tick_expires_at += timedelta(days=30 * duration_months)
    else:
        # New tick
        request.user.tick_expires_at = timezone.now() + timedelta(days=30 * duration_months)
    
    request.user.save()
    
    # Record transaction
    CreditTransaction.objects.create(
        user=request.user,
        amount=-total_cost,
        transaction_type='tick_purchase',
        description=f'Purchased {tick_type} tick for {duration_months} months',
        balance_before=request.user.account_balance + total_cost,
        balance_after=request.user.account_balance
    )
    
    tick_names = {
        'blue': 'Blue Tick (LaliGurans Badge) 🌺',
        'gold': 'Golden Tick (Sagarmatha Badge) 🏔️',
        'business': 'Business Tick (Dhaka Badge) 🧵',
        'special': 'Special Tick (Pashupatinath Badge) 🕉️'
    }
    
    return Response({
        'message': f'Successfully purchased {tick_names[tick_type]}!',
        'tick_type': tick_type,
        'expires_at': request.user.tick_expires_at,
        'new_balance': float(request.user.account_balance)
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def purchase_premium(request):
    """Legacy endpoint - redirects to new subscription tier system"""
    # This endpoint is deprecated in favor of the new subscription tier system
    # But keeping it for backward compatibility
    
    return Response({
        'message': 'Premium purchase has been replaced by the subscription tier system.',
        'redirect_to': '/api/auth/subscription-tiers/',
        'new_endpoint': '/api/auth/purchase/subscription-tier/',
        'help': 'Use the new subscription tier system for better features and pricing.'
    }, status=status.HTTP_410_GONE)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_purchase_options(request):
    """Get available ticks and premium options with pricing"""
    
    tick_options = [
        {
            'type': 'blue',
            'name': 'Blue Tick (LaliGurans Badge) 🌺',
            'description': 'National identity badge',
            'price_per_month': 100,
            'vibe': 'National identity'
        },
        {
            'type': 'gold', 
            'name': 'Golden Tick (Sagarmatha Badge) 🏔️',
            'description': 'Highest honor badge',
            'price_per_month': 250,
            'vibe': 'Highest honor'
        },
        {
            'type': 'business',
            'name': 'Business Tick (Dhaka Badge) 🧵', 
            'description': 'Traditional + premium badge',
            'price_per_month': 150,
            'vibe': 'Traditional + premium'
        },
        {
            'type': 'special',
            'name': 'Special Tick (Pashupatinath Badge) 🕉️',
            'description': 'Cultural prestige badge', 
            'price_per_month': 200,
            'vibe': 'Cultural prestige'
        }
    ]
    
    premium_option = {
        'name': 'Premium Subscription',
        'description': '10 media files, no ads, extra features',
        'price_per_month': 50,
        'features': [
            '10 media files per post (vs 5 for free)',
            'Ad-free experience', 
            'Priority support',
            'Advanced analytics'
        ]
    }
    
    return Response({
        'ticks': tick_options,
        'premium': premium_option,
        'current_balance': float(request.user.account_balance),
        'current_tick': request.user.get_active_tick(),
        'current_subscription_tier': request.user.get_subscription_tier(),
        'subscription_expires': request.user.subscription_expires_at
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def subscription_tiers(request):
    """Get all available subscription tiers with pricing"""
    tiers = SubscriptionTierInfoSerializer.get_all_tiers()
    current_tier = request.user.get_subscription_tier()
    
    # Add upgrade cost information for each tier
    for tier in tiers:
        if tier['tier'] > current_tier:
            total_cost, credit_applied, amount_to_pay = TierSubscriptionPurchase.calculate_upgrade_cost(
                request.user, tier['tier'], is_yearly=False
            )
            yearly_total, yearly_credit, yearly_amount = TierSubscriptionPurchase.calculate_upgrade_cost(
                request.user, tier['tier'], is_yearly=True
            )
            
            tier['upgrade_cost'] = {
                'monthly': {
                    'total_cost': float(total_cost),
                    'credit_applied': float(credit_applied),
                    'amount_to_pay': float(amount_to_pay)
                },
                'yearly': {
                    'total_cost': float(yearly_total),
                    'credit_applied': float(yearly_credit),
                    'amount_to_pay': float(yearly_amount)
                }
            }
        else:
            tier['upgrade_cost'] = None
    
    return Response({
        'tiers': tiers,
        'current_tier': current_tier,
        'current_balance': float(request.user.profile.credit_balance),
        'subscription_expires': request.user.subscription_expires_at,
        'is_yearly': request.user.is_yearly_subscription
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def purchase_subscription_tier(request):
    """Purchase/upgrade subscription tier"""
    serializer = PurchaseSubscriptionTierSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        purchase = serializer.save()
        return Response({
            'message': f'Successfully upgraded to Tier {purchase.to_tier}',
            'purchase': TierSubscriptionPurchaseSerializer(purchase).data,
            'new_tier': request.user.get_subscription_tier(),
            'remaining_balance': float(request.user.profile.credit_balance)
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_subscription_status(request):
    """Get current user's subscription status and limits"""
    user = request.user
    
    return Response({
        'current_tier': user.get_subscription_tier(),
        'subscription_expires': user.subscription_expires_at,
        'is_yearly': user.is_yearly_subscription,
        'daily_post_limit': user.get_daily_post_limit(),
        'media_per_post_limit': user.get_media_per_post_limit(),
        'shows_ads': user.should_see_ads(),
        'subscription_badge': user.get_subscription_badge(),
        'credit_balance': float(user.profile.credit_balance)
    })