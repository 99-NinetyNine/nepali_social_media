from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Post(models.Model):
    POST_TYPES = [
        ('post', 'Regular Post'),
        ('job', 'Job Posting'),
        ('short', 'Short Video'),
        ('story', 'Story (24h)'),
        ('ad', 'Advertisement'),
    ]

    PRIVACY_CHOICES = [
        ('public', 'Public'),
        ('connections', 'Connections Only'),
        ('private', 'Private'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    post_type = models.CharField(max_length=20, choices=POST_TYPES)
    privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='public')
    
    is_monetized = models.BooleanField(default=False)
    monetization_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0001)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    allow_comments = models.BooleanField(default=True)
    allow_sharing = models.BooleanField(default=True)
    
    view_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    dislike_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)
    
    is_boosted = models.BooleanField(default=False)
    boost_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    boost_expires_at = models.DateTimeField(null=True, blank=True)
    
    is_flagged = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    
    # Advertisement fields
    is_advertisement = models.BooleanField(default=False)
    ad_expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Monetization and ads cannot both be true
        if self.is_monetized and self.is_boosted:
            raise ValidationError("A post cannot be both monetized and boosted as an ad.")
    
    def save(self, *args, **kwargs):
        self.clean()
        
        if self.post_type == 'story' and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
    
    def is_accessible_to_user(self, user):
        """Check if user can access this monetized content"""
        if not self.is_monetized:
            return True
            
        if user == self.author:
            return True
            
        # Check if user has active subscription to the creator
        from accounts.models import Subscription
        subscription = Subscription.objects.filter(
            subscriber=user,
            creator=self.author,
            is_active=True
        ).first()
        
        return subscription and subscription.is_current() if subscription else False

    def is_story_expired(self):
        if self.post_type == 'story' and self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def is_boost_active(self):
        return self.is_boosted and (
            not self.boost_expires_at or 
            self.boost_expires_at > timezone.now()
        )

    def __str__(self):
        return f"{self.title or self.description[:50]} - {self.post_type}"


class PostMedia(models.Model):
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
    ]

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    file = models.FileField(upload_to='post_media/')
    thumbnail = models.ImageField(upload_to='post_thumbnails/', null=True, blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    duration = models.PositiveIntegerField(null=True, blank=True, help_text="Duration in seconds for videos")
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text="File size in bytes")
    order = models.PositiveIntegerField(default=0)
    
    # Text overlay for images (stories)
    text_overlay = models.TextField(blank=True, help_text="Text overlay for story images")
    text_position = models.CharField(max_length=20, choices=[
        ('top', 'Top'),
        ('middle', 'Middle'),
        ('bottom', 'Bottom')
    ], default='middle', blank=True)

    class Meta:
        ordering = ['order']

    def clean(self):
        from django.core.exceptions import ValidationError
        
        if self.media_type == 'video' and self.duration:
            # Story videos: max 20 seconds
            if self.post.post_type == 'story' and self.duration > 20:
                raise ValidationError("Story videos cannot exceed 20 seconds")
            # Short videos: max 2 minutes (120 seconds)  
            elif self.post.post_type == 'short' and self.duration > 120:
                raise ValidationError("Short videos cannot exceed 2 minutes")

    def __str__(self):
        return f"{self.media_type} for {self.post}"


class Like(models.Model):
    REACTION_TYPES = [
        ('like', 'Like'),
        ('dislike', 'Dislike'),
        ('love', 'Love'),
        ('laugh', 'Laugh'),
        ('angry', 'Angry'),
        ('sad', 'Sad'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    reaction_type = models.CharField(max_length=10, choices=REACTION_TYPES, default='like')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} {self.reaction_type}d {self.post}"


class Comment(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField()
    like_count = models.PositiveIntegerField(default=0)
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.author.username} on {self.post}"


class CommentLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comment_likes')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'comment')


class Share(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shares')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='shares')
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} shared {self.post}"


class PostView(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_views', null=True, blank=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='views')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    view_duration = models.PositiveIntegerField(default=0)  # in seconds
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post', 'created_at')

    def __str__(self):
        return f"View of {self.post} by {self.user or 'Anonymous'}"


class Hashtag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    post_count = models.PositiveIntegerField(default=0)
    trending_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"#{self.name}"


class PostHashtag(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='hashtags')
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE, related_name='posts')

    class Meta:
        unique_together = ('post', 'hashtag')