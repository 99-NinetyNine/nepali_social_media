from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_premium = models.BooleanField(default=False)
    premium_expires_at = models.DateTimeField(null=True, blank=True)
    is_business = models.BooleanField(default=False)
    account_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    content_violations = models.IntegerField(default=0)
    is_suspended = models.BooleanField(default=False)
    suspended_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def is_premium_active(self):
        return self.is_premium and (
            not self.premium_expires_at or 
            self.premium_expires_at > timezone.now()
        )

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
    created_at = models.DateTimeField(auto_now_add=True)

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