from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    # Subscription tier system
    SUBSCRIPTION_TIERS = [
        (0, 'Free - 10 posts/day, 4 media/post, ads shown'),
        (1, 'Tier 1 - 20 posts/day, 8 media/post, no ads'),
        (2, 'Tier 2 - 40 posts/day, 16 media/post, no ads'),
        (3, 'Tier 3 - 80 posts/day, 32 media/post, no ads'),
    ]
    
    subscription_tier = models.IntegerField(choices=SUBSCRIPTION_TIERS, default=0)
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    is_yearly_subscription = models.BooleanField(default=False)
    
    # Cultural tick badges (separate purchase system)
    TICK_TYPES = [
        ('none', 'None'),
        ('blue', 'Blue Tick (LaliGurans Badge) 🌺'),
        ('gold', 'Golden Tick (Sagarmatha Badge) 🏔️'),
        ('business', 'Business Tick (Dhaka Badge) 🧵'),
        ('special', 'Special Tick (Pashupatinath Badge) 🕉️'),
    ]
    
    purchased_tick = models.CharField(max_length=10, choices=TICK_TYPES, default='none')
    tick_expires_at = models.DateTimeField(null=True, blank=True)
    is_business = models.BooleanField(default=False)
    account_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    content_violations = models.IntegerField(default=0)
    is_suspended = models.BooleanField(default=False)
    suspended_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Google OAuth fields
    google_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    profile_picture_url = models.URLField(blank=True)
    auth_provider = models.CharField(max_length=20, default='local', choices=[
        ('local', 'Local'),
        ('google', 'Google'),
    ])

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def get_subscription_tier(self):
        """Get current active subscription tier"""
        if not self.subscription_expires_at or self.subscription_expires_at > timezone.now():
            return self.subscription_tier
        return 0  # Revert to free tier if expired
    
    def is_premium_active(self):
        """Check if user has any paid subscription tier"""
        return self.get_subscription_tier() > 0
    
    def get_daily_post_limit(self):
        """Get daily post limit based on subscription tier"""
        tier_limits = {0: 10, 1: 20, 2: 40, 3: 80}
        return tier_limits.get(self.get_subscription_tier(), 10)
    
    def get_media_per_post_limit(self):
        """Get media files per post limit based on subscription tier"""
        tier_limits = {0: 4, 1: 8, 2: 16, 3: 32}
        return tier_limits.get(self.get_subscription_tier(), 4)
    
    def should_see_ads(self):
        """Check if user should see advertisements"""
        return self.get_subscription_tier() == 0
    
    def get_subscription_badge(self):
        """Get subscription badge number (0 for free, 1-3 for paid tiers)"""
        tier = self.get_subscription_tier()
        return tier if tier > 0 else None
    
    def get_active_tick(self):
        """Get currently active tick badge"""
        if not self.tick_expires_at or self.tick_expires_at > timezone.now():
            return self.purchased_tick
        return 'none'
    
    def has_blue_tick(self):
        return self.get_active_tick() == 'blue'
    
    def has_gold_tick(self):
        return self.get_active_tick() == 'gold'
    
    def has_business_tick(self):
        return self.get_active_tick() == 'business'
    
    def has_special_tick(self):
        return self.get_active_tick() == 'special'
    
    def get_max_media_files(self):
        """Get maximum media files allowed based on subscription tier"""
        return self.get_media_per_post_limit()

    def can_post(self):
        return not self.is_suspended or (
            self.suspended_until and 
            self.suspended_until < timezone.now()
        )


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    cover_photo = models.ImageField(upload_to='covers/', null=True, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    birth_date = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)
    show_monetization_content = models.BooleanField(default=True)
    privacy_level = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('friends', 'Friends Only'),
            ('private', 'Private')
        ],
        default='public'
    )
    requires_follow_approval = models.BooleanField(default=False)
    
    # Follower counts for efficiency
    followers_count = models.PositiveIntegerField(default=0)
    following_count = models.PositiveIntegerField(default=0)
    posts_count = models.PositiveIntegerField(default=0)
    
    # Job matching fields
    skills = models.JSONField(default=list, blank=True, help_text="List of technical skills")
    experience_years = models.PositiveIntegerField(null=True, blank=True, help_text="Total years of experience")
    experience_start_date = models.DateField(null=True, blank=True, help_text="When user started their career")
    preferred_salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    preferred_salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    preferred_locations = models.JSONField(default=list, blank=True, help_text="Preferred work locations")
    remote_work_preference = models.CharField(
        max_length=20,
        choices=[
            ('on_site', 'On-site Only'),
            ('remote', 'Remote Only'),  
            ('hybrid', 'Hybrid'),
            ('flexible', 'Flexible')
        ],
        null=True, blank=True
    )
    cover_letter_template = models.TextField(blank=True, help_text="Default cover letter template")
    job_preferences = models.JSONField(default=dict, blank=True, help_text="Job type, experience level preferences")
    
    # Monetization settings
    is_creator = models.BooleanField(default=False)
    monthly_subscription_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    allow_subscriptions = models.BooleanField(default=False)
    
    # Portal preferences
    enable_job_portal = models.BooleanField(default=False)
    enable_shop_portal = models.BooleanField(default=False)
    
    # Credits/wallet for internal transactions
    credit_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def get_current_experience_years(self):
        """Calculate current experience years based on start date"""
        if self.experience_start_date:
            from datetime import date
            today = date.today()
            years = (today - self.experience_start_date).days / 365.25
            return max(0, round(years, 1))
        return self.experience_years or 0

    def update_experience_years(self):
        """Auto-update experience years if start date is available"""
        if self.experience_start_date:
            self.experience_years = int(self.get_current_experience_years())
            self.save(update_fields=['experience_years'])

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Connection(models.Model):
    CONNECTION_TYPES = [
        ('follow', 'Follow'),
        ('friend', 'Friend'),
        ('block', 'Block'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connections_made')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connections_received')
    connection_type = models.CharField(max_length=10, choices=CONNECTION_TYPES, default='follow')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user.username} -> {self.to_user.username} ({self.connection_type})"


class Company(models.Model):
    VERIFICATION_STATUS_CHOICES = [
        ('unverified', 'Unverified'),
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Verification Rejected'),
    ]
    
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='companies')
    name = models.CharField(max_length=200)
    description = models.TextField()
    logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    employee_count = models.CharField(
        max_length=20,
        choices=[
            ('1-10', '1-10 employees'),
            ('11-50', '11-50 employees'),
            ('51-200', '51-200 employees'),
            ('201-500', '201-500 employees'),
            ('500+', '500+ employees'),
        ]
    )
    is_verified = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='unverified'
    )
    verification_notes = models.TextField(blank=True, help_text="Admin notes for verification")
    
    # Additional company details
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    linkedin_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)
    
    # Company settings
    is_hiring = models.BooleanField(default=True)
    allows_remote_work = models.BooleanField(default=False)
    company_culture = models.TextField(blank=True, help_text="Describe company culture and values")
    benefits = models.JSONField(default=list, blank=True, help_text="List of company benefits")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name


class Job(models.Model):
    JOB_TYPES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('internship', 'Internship'),
        ('freelance', 'Freelance'),
    ]

    EXPERIENCE_LEVELS = [
        ('entry', 'Entry Level'),
        ('mid', 'Mid Level'),
        ('senior', 'Senior Level'),
        ('executive', 'Executive'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='jobs')
    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField()
    job_type = models.CharField(max_length=20, choices=JOB_TYPES)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVELS)
    location = models.CharField(max_length=200)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_remote = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} at {self.company.name}"


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('reviewed', 'Reviewed'),
        ('maybe', 'Maybe'),
        ('interview', 'Interview'),
        ('rejected', 'Rejected'),
        ('accepted', 'Accepted'),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_applications')
    cover_letter = models.TextField()
    resume = models.FileField(upload_to='resumes/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='applied')
    
    # Smart application data (auto-filled from profile)
    experience_years_at_apply = models.PositiveIntegerField(null=True, blank=True)
    skills_at_apply = models.JSONField(default=list, blank=True)
    salary_expectation = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    location_preference = models.CharField(max_length=200, blank=True)
    remote_preference = models.CharField(max_length=20, blank=True)
    
    # Job matching score (calculated via AI)
    match_score = models.FloatField(null=True, blank=True, help_text="AI-calculated job match percentage")
    skills_match_score = models.FloatField(null=True, blank=True)
    experience_match_score = models.FloatField(null=True, blank=True)
    location_match_score = models.FloatField(null=True, blank=True)
    salary_match_score = models.FloatField(null=True, blank=True)
    
    # Tinder-style review tracking
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, help_text="Recruiter's private notes")
    
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('job', 'applicant')

    def __str__(self):
        return f"{self.applicant.username} -> {self.job.title}"


class Subscription(models.Model):
    """User subscriptions to creators for monetized content"""
    subscriber = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions_made')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscribers')
    monthly_fee = models.DecimalField(max_digits=8, decimal_places=2)
    is_active = models.BooleanField(default=True)
    auto_renew = models.BooleanField(default=True)
    
    # Subscription period
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()  # One month from start_date
    next_billing_date = models.DateTimeField()
    
    # Payment tracking
    total_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    last_payment_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('subscriber', 'creator')
    
    def __str__(self):
        return f"{self.subscriber.username} -> {self.creator.username} (${self.monthly_fee}/month)"
    
    def is_current(self):
        from django.utils import timezone
        return self.is_active and self.end_date > timezone.now()
    
    def renew_subscription(self):
        from django.utils import timezone
        from datetime import timedelta
        
        if self.subscriber.profile.credit_balance >= self.monthly_fee:
            # Deduct from subscriber's credits
            self.subscriber.profile.credit_balance -= self.monthly_fee
            self.subscriber.profile.save()
            
            # Add to creator's credits
            self.creator.profile.credit_balance += self.monthly_fee
            self.creator.profile.save()
            
            # Update subscription dates
            self.end_date += timedelta(days=30)
            self.next_billing_date += timedelta(days=30)
            self.total_paid += self.monthly_fee
            self.last_payment_date = timezone.now()
            self.save()
            
            # Create transaction record
            SubscriptionTransaction.objects.create(
                subscription=self,
                amount=self.monthly_fee,
                transaction_type='renewal'
            )
            
            return True
        return False


class SubscriptionTransaction(models.Model):
    """Track subscription payment transactions"""
    TRANSACTION_TYPES = [
        ('initial', 'Initial Subscription'),
        ('renewal', 'Monthly Renewal'),
        ('refund', 'Refund'),
        ('cancellation', 'Cancellation'),
    ]
    
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    transaction_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.transaction_id:
            import uuid
            self.transaction_id = str(uuid.uuid4())[:12].upper()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.transaction_type} - ${self.amount} ({self.status})"


class CreditTransaction(models.Model):
    """Track credit additions and usage"""
    TRANSACTION_TYPES = [
        ('add_funds', 'Add Funds'),
        ('subscription_payment', 'Subscription Payment'),
        ('subscription_received', 'Subscription Income'),
        ('ad_payment', 'Advertisement Payment'),
        ('refund', 'Refund'),
        ('withdrawal', 'Withdrawal'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    description = models.TextField()
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Related objects
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username}: {self.transaction_type} ${self.amount}"


class TierSubscriptionPurchase(models.Model):
    """Track subscription tier purchases"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tier_purchases')
    from_tier = models.IntegerField(default=0)
    to_tier = models.IntegerField()
    is_yearly = models.BooleanField(default=False)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    credit_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # From previous tier
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        duration = "yearly" if self.is_yearly else "monthly"
        return f"{self.user.username}: Tier {self.from_tier}→{self.to_tier} ({duration}) - ${self.amount_paid}"
    
    @staticmethod
    def get_tier_prices():
        """Get pricing for each tier (monthly/yearly)"""
        # Base price x multiplier, yearly = 10x monthly
        base_price = 5.00  # Base unit price
        return {
            0: {'monthly': 0.00, 'yearly': 0.00},  # Free tier
            1: {'monthly': base_price * 2, 'yearly': base_price * 2 * 10},  # 2x
            2: {'monthly': base_price * 3, 'yearly': base_price * 3 * 10},  # 3x  
            3: {'monthly': base_price * 4, 'yearly': base_price * 4 * 10},  # 4x
        }
    
    @staticmethod
    def calculate_upgrade_cost(user, target_tier, is_yearly=False):
        """Calculate cost to upgrade to target tier, accounting for remaining value"""
        prices = TierSubscriptionPurchase.get_tier_prices()
        current_tier = user.get_subscription_tier()
        
        if target_tier <= current_tier:
            return 0.00, 0.00, 0.00  # Can't downgrade
        
        # Calculate new tier cost
        duration = 'yearly' if is_yearly else 'monthly'
        new_cost = prices[target_tier][duration]
        
        # Calculate remaining value from current tier
        remaining_credit = 0.00
        if current_tier > 0 and user.subscription_expires_at:
            current_cost = prices[current_tier]['yearly' if user.is_yearly_subscription else 'monthly']
            days_total = 365 if user.is_yearly_subscription else 30
            days_remaining = max(0, (user.subscription_expires_at - timezone.now()).days)
            remaining_credit = (current_cost * days_remaining) / days_total
        
        # Calculate final amount to pay
        amount_to_pay = max(0.00, new_cost - remaining_credit)
        
        return new_cost, remaining_credit, amount_to_pay