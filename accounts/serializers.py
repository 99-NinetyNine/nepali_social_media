from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserProfile, Connection, Company, Job, JobApplication, Subscription, SubscriptionTransaction, CreditTransaction


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

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'is_premium', 'is_business', 'profile', 'date_joined')
        read_only_fields = ('is_premium', 'account_balance')


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