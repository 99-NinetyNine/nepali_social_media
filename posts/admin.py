from django.contrib import admin
from .models import Post, PostMedia, Like, Comment, CommentLike, Share, PostView, Hashtag, PostHashtag


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'post_type', 'privacy', 'is_monetized', 'is_boosted', 'view_count', 'like_count', 'created_at')
    list_filter = ('post_type', 'privacy', 'is_monetized', 'is_boosted', 'is_flagged', 'is_approved')
    search_fields = ('title', 'description', 'author__username')
    readonly_fields = ('view_count', 'like_count', 'dislike_count', 'comment_count', 'share_count', 'total_earnings')


@admin.register(PostMedia)
class PostMediaAdmin(admin.ModelAdmin):
    list_display = ('post', 'media_type', 'order')
    list_filter = ('media_type',)


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'reaction_type', 'created_at')
    list_filter = ('reaction_type',)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'content', 'like_count', 'is_flagged', 'created_at')
    list_filter = ('is_flagged',)
    search_fields = ('content', 'author__username')


@admin.register(Share)
class ShareAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'created_at')


@admin.register(PostView)
class PostViewAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'view_duration', 'created_at')
    readonly_fields = ('user', 'post', 'ip_address', 'user_agent', 'view_duration')


@admin.register(Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    list_display = ('name', 'post_count', 'trending_score', 'created_at')
    readonly_fields = ('post_count',)
    search_fields = ('name',)