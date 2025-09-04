from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

User = get_user_model()


class ContentReport(models.Model):
    REPORT_TYPES = [
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('hate_speech', 'Hate Speech'),
        ('violence', 'Violence'),
        ('nudity', 'Nudity'),
        ('fake_news', 'Fake News'),
        ('copyright', 'Copyright Violation'),
        ('scam', 'Scam'),
        ('inappropriate', 'Inappropriate Content'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewing', 'Under Review'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    ]

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    description = models.TextField()
    
    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    moderator_notes = models.TextField(blank=True)
    action_taken = models.CharField(max_length=200, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_reviewed')

    class Meta:
        unique_together = ('reporter', 'content_type', 'object_id')

    def __str__(self):
        return f"{self.report_type} report by {self.reporter.username}"


class BlockedKeyword(models.Model):
    keyword = models.CharField(max_length=100, unique=True)
    severity = models.CharField(max_length=20, choices=[
        ('low', 'Low - Warning'),
        ('medium', 'Medium - Content Hidden'),
        ('high', 'High - Account Suspension'),
        ('critical', 'Critical - Account Deletion'),
    ], default='medium')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.keyword} ({self.severity})"


class AutoModerationAction(models.Model):
    ACTION_TYPES = [
        ('content_hidden', 'Content Hidden'),
        ('content_deleted', 'Content Deleted'),
        ('user_warned', 'User Warned'),
        ('user_suspended', 'User Suspended'),
        ('user_banned', 'User Banned'),
    ]

    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='moderation_actions')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    reason = models.CharField(max_length=200)
    triggered_by_keyword = models.ForeignKey(BlockedKeyword, on_delete=models.SET_NULL, null=True, blank=True)
    
    is_reversed = models.BooleanField(default=False)
    reversed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reversed_actions')
    reversed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action_type} for {self.user.username}"


class Dispute(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    DISPUTE_TYPES = [
        ('product_quality', 'Product Quality Issue'),
        ('delivery_issue', 'Delivery Problem'),
        ('payment_dispute', 'Payment Dispute'),
        ('seller_dispute', 'Seller Issue'),
        ('driver_dispute', 'Driver Issue'),
        ('refund_request', 'Refund Request'),
        ('other', 'Other'),
    ]

    dispute_id = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disputes_as_customer')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disputes_as_seller', null=True, blank=True)
    
    dispute_type = models.CharField(max_length=20, choices=DISPUTE_TYPES)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    
    # Related order/delivery
    order = models.ForeignKey('ecommerce.Order', on_delete=models.CASCADE, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='medium')
    
    # Resolution
    resolution = models.TextField(blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='disputes_resolved')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.dispute_id:
            import uuid
            self.dispute_id = f"DSP{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dispute {self.dispute_id} - {self.subject}"


class DisputeMessage(models.Model):
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    attachment = models.FileField(upload_to='dispute_attachments/', null=True, blank=True)
    is_internal = models.BooleanField(default=False)  # For admin/moderator notes
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message in dispute {self.dispute.dispute_id} by {self.sender.username}"