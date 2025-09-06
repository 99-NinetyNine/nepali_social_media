from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, Connection, Company, Job, JobApplication, TierSubscriptionPurchase


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'subscription_tier', 'is_business', 'content_violations', 'is_suspended')
    list_filter = ('subscription_tier', 'is_business', 'is_suspended', 'is_staff', 'is_yearly_subscription')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Subscription & Business', {
            'fields': ('subscription_tier', 'subscription_expires_at', 'is_yearly_subscription', 'is_business', 'account_balance')
        }),
        ('Cultural Ticks', {
            'fields': ('purchased_tick', 'tick_expires_at')
        }),
        ('Moderation', {
            'fields': ('content_violations', 'is_suspended', 'suspended_until')
        }),
        ('Google OAuth', {
            'fields': ('google_id', 'full_name', 'profile_picture_url', 'auth_provider')
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'location', 'is_verified', 'privacy_level')
    list_filter = ('is_verified', 'privacy_level')
    search_fields = ('user__username', 'user__email', 'location')


@admin.register(Connection)
class ConnectionAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'connection_type', 'status', 'created_at')
    list_filter = ('connection_type', 'status')
    search_fields = ('from_user__username', 'to_user__username')


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'industry', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'industry')
    search_fields = ('name', 'owner__username', 'industry')


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'job_type', 'experience_level', 'is_active', 'created_at')
    list_filter = ('job_type', 'experience_level', 'is_active', 'is_remote')
    search_fields = ('title', 'company__name', 'location')


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('applicant', 'job', 'status', 'applied_at')
    list_filter = ('status',)
    search_fields = ('applicant__username', 'job__title')


@admin.register(TierSubscriptionPurchase)
class TierSubscriptionPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'from_tier', 'to_tier', 'is_yearly', 'amount_paid', 'status', 'created_at')
    list_filter = ('from_tier', 'to_tier', 'is_yearly', 'status')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')