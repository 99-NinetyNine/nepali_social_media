from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, UserProfile, Connection, Company, Job, JobApplication, Subscription, SubscriptionTransaction, CreditTransaction, TierSubscriptionPurchase
from .google_auth import GoogleOAuth


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'confirm_password', 'first_name', 'last_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('user',)


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    active_tick = serializers.SerializerMethodField()
    has_blue_tick = serializers.SerializerMethodField()
    has_gold_tick = serializers.SerializerMethodField()
    has_business_tick = serializers.SerializerMethodField()
    has_special_tick = serializers.SerializerMethodField()
    max_media_files = serializers.SerializerMethodField()
    current_subscription_tier = serializers.SerializerMethodField()
    daily_post_limit = serializers.SerializerMethodField()
    subscription_badge = serializers.SerializerMethodField()
    shows_ads = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                 'profile_picture_url', 'active_tick', 'has_blue_tick', 
                 'has_gold_tick', 'has_business_tick', 'has_special_tick', 'max_media_files',
                 'is_business', 'profile', 'date_joined', 'auth_provider', 'subscription_tier',
                 'current_subscription_tier', 'daily_post_limit', 'subscription_badge', 'shows_ads')
        read_only_fields = ('active_tick', 'account_balance', 'auth_provider', 
                          'current_subscription_tier', 'daily_post_limit', 'subscription_badge', 'shows_ads')
    
    def get_active_tick(self, obj):
        return obj.get_active_tick()
    
    def get_has_blue_tick(self, obj):
        return obj.has_blue_tick()
    
    def get_has_gold_tick(self, obj):
        return obj.has_gold_tick()
    
    def get_has_business_tick(self, obj):
        return obj.has_business_tick()
    
    def get_has_special_tick(self, obj):
        return obj.has_special_tick()
    
    def get_max_media_files(self, obj):
        return obj.get_max_media_files()
    
    def get_current_subscription_tier(self, obj):
        return obj.get_subscription_tier()
    
    def get_daily_post_limit(self, obj):
        return obj.get_daily_post_limit()
    
    def get_subscription_badge(self, obj):
        return obj.get_subscription_badge()
    
    def get_shows_ads(self, obj):
        return obj.should_see_ads()


class ProfileWithUserSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('user',)


class ConnectionSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = Connection
        fields = '__all__'


class CompanySerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ('owner', 'is_verified')


class JobSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = Job
        fields = '__all__'


class JobApplicationSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    job = JobSerializer(read_only=True)

    class Meta:
        model = JobApplication
        fields = '__all__'
        read_only_fields = ('applicant', 'applied_at')


class SubscriptionSerializer(serializers.ModelSerializer):
    subscriber = UserSerializer(read_only=True)
    creator = UserSerializer(read_only=True)
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ('id', 'subscriber', 'creator', 'monthly_fee', 'is_active', 
                 'auto_renew', 'start_date', 'end_date', 'next_billing_date',
                 'total_paid', 'last_payment_date', 'is_current')

    def get_is_current(self, obj):
        return obj.is_current()


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ('creator', 'monthly_fee')

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        
        subscriber = self.context['request'].user
        creator = validated_data['creator']
        monthly_fee = validated_data['monthly_fee']
        
        # Check if user has sufficient credits
        if subscriber.profile.credit_balance < monthly_fee:
            raise serializers.ValidationError("Insufficient credits. Please add funds to your account.")
        
        # Check if subscription already exists
        if Subscription.objects.filter(subscriber=subscriber, creator=creator).exists():
            raise serializers.ValidationError("You are already subscribed to this creator.")
        
        # Create subscription
        subscription = Subscription.objects.create(
            subscriber=subscriber,
            creator=creator,
            monthly_fee=monthly_fee,
            end_date=timezone.now() + timedelta(days=30),
            next_billing_date=timezone.now() + timedelta(days=30)
        )
        
        # Process payment
        subscriber.profile.credit_balance -= monthly_fee
        subscriber.profile.save()
        
        creator.profile.credit_balance += monthly_fee
        creator.profile.save()
        
        # Create transaction record
        SubscriptionTransaction.objects.create(
            subscription=subscription,
            amount=monthly_fee,
            transaction_type='initial',
            status='completed'
        )
        
        # Create credit transaction records
        CreditTransaction.objects.create(
            user=subscriber,
            amount=-monthly_fee,
            transaction_type='subscription_payment',
            description=f'Subscription to {creator.username}',
            balance_before=subscriber.profile.credit_balance + monthly_fee,
            balance_after=subscriber.profile.credit_balance,
            subscription=subscription
        )
        
        CreditTransaction.objects.create(
            user=creator,
            amount=monthly_fee,
            transaction_type='subscription_received',
            description=f'Subscription from {subscriber.username}',
            balance_before=creator.profile.credit_balance - monthly_fee,
            balance_after=creator.profile.credit_balance,
            subscription=subscription
        )
        
        return subscription


class CreditTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditTransaction
        fields = '__all__'


class GoogleAuthSerializer(serializers.Serializer):
    code = serializers.CharField()
    
    def validate(self, attrs):
        code = attrs.get('code')
        
        google_auth = GoogleOAuth()
        try:
            user_info = google_auth.exchange_code_for_token(code)
            user, created = google_auth.create_or_get_user(user_info)
            
            # Ensure user has a profile (use get_or_create to avoid constraint errors)
            profile, profile_created = UserProfile.objects.get_or_create(user=user)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return {
                'user': UserSerializer(user).data,
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'created': created
            }
        except Exception as e:
            raise serializers.ValidationError(f'Google authentication failed: {str(e)}')


class GoogleAuthUrlSerializer(serializers.Serializer):
    def to_representation(self, instance):
        google_auth = GoogleOAuth()
        return {
            'auth_url': google_auth.get_auth_url()
        }


class CompleteProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)
    bio = serializers.CharField(max_length=500, required=False, allow_blank=True)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def update(self, instance, validated_data):
        profile = instance.profile
        
        if 'full_name' in validated_data:
            instance.full_name = validated_data['full_name']
            # Split full name into first/last name
            name_parts = validated_data['full_name'].split(' ', 1)
            instance.first_name = name_parts[0]
            instance.last_name = name_parts[1] if len(name_parts) > 1 else ''
            instance.save()
        
        for field in ['bio', 'location', 'phone_number']:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        
        profile.save()
        return instance


class TierSubscriptionPurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TierSubscriptionPurchase
        fields = '__all__'
        read_only_fields = ('user', 'amount_paid', 'credit_applied', 'status')


class PurchaseSubscriptionTierSerializer(serializers.Serializer):
    target_tier = serializers.IntegerField(min_value=1, max_value=3)
    is_yearly = serializers.BooleanField(default=False)
    
    def validate_target_tier(self, value):
        user = self.context['request'].user
        current_tier = user.get_subscription_tier()
        if value <= current_tier:
            raise serializers.ValidationError("Cannot downgrade subscription tier.")
        return value
    
    def create(self, validated_data):
        from datetime import timedelta
        
        user = self.context['request'].user
        target_tier = validated_data['target_tier']
        is_yearly = validated_data['is_yearly']
        
        # Calculate costs
        total_cost, credit_applied, amount_to_pay = TierSubscriptionPurchase.calculate_upgrade_cost(
            user, target_tier, is_yearly
        )
        
        # Check if user has sufficient credits
        if user.profile.credit_balance < amount_to_pay:
            raise serializers.ValidationError("Insufficient credits. Please add funds to your account.")
        
        # Create purchase record
        purchase = TierSubscriptionPurchase.objects.create(
            user=user,
            from_tier=user.get_subscription_tier(),
            to_tier=target_tier,
            is_yearly=is_yearly,
            amount_paid=amount_to_pay,
            credit_applied=credit_applied,
            total_cost=total_cost,
            status='completed'
        )
        
        # Deduct credits
        user.profile.credit_balance -= amount_to_pay
        user.profile.save()
        
        # Update user subscription
        user.subscription_tier = target_tier
        user.is_yearly_subscription = is_yearly
        user.subscription_expires_at = timezone.now() + timedelta(days=365 if is_yearly else 30)
        user.save()
        
        # Create credit transaction record
        CreditTransaction.objects.create(
            user=user,
            amount=-amount_to_pay,
            transaction_type='subscription_payment',
            description=f'Subscription Tier {target_tier} ({"Yearly" if is_yearly else "Monthly"})',
            balance_before=user.profile.credit_balance + amount_to_pay,
            balance_after=user.profile.credit_balance
        )
        
        return purchase


class SubscriptionTierInfoSerializer(serializers.Serializer):
    tier = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    daily_posts = serializers.IntegerField()
    media_per_post = serializers.IntegerField()
    shows_ads = serializers.BooleanField()
    monthly_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    yearly_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    badge_number = serializers.IntegerField(allow_null=True)
    
    @staticmethod
    def get_all_tiers():
        prices = TierSubscriptionPurchase.get_tier_prices()
        tiers = [
            {
                'tier': 0,
                'name': 'Free',
                'description': 'Basic features with advertisements',
                'daily_posts': 10,
                'media_per_post': 4,
                'shows_ads': True,
                'monthly_price': prices[0]['monthly'],
                'yearly_price': prices[0]['yearly'],
                'badge_number': None,
            },
            {
                'tier': 1,
                'name': 'Tier 1',
                'description': 'Enhanced features, no ads',
                'daily_posts': 20,
                'media_per_post': 8,
                'shows_ads': False,
                'monthly_price': prices[1]['monthly'],
                'yearly_price': prices[1]['yearly'],
                'badge_number': 1,
            },
            {
                'tier': 2,
                'name': 'Tier 2',
                'description': 'Premium features, no ads',
                'daily_posts': 40,
                'media_per_post': 16,
                'shows_ads': False,
                'monthly_price': prices[2]['monthly'],
                'yearly_price': prices[2]['yearly'],
                'badge_number': 2,
            },
            {
                'tier': 3,
                'name': 'Tier 3',
                'description': 'Ultimate features, no ads',
                'daily_posts': 80,
                'media_per_post': 32,
                'shows_ads': False,
                'monthly_price': prices[3]['monthly'],
                'yearly_price': prices[3]['yearly'],
                'badge_number': 3,
            },
        ]
        return tiers