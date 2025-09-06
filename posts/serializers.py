from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Post, PostMedia, Like, Comment, CommentLike, Share, PostView, Hashtag, PostHashtag


class PostMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostMedia
        fields = '__all__'
        read_only_fields = ('post',)


class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ('id', 'name', 'post_count', 'trending_score')


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ('author', 'like_count', 'post')

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all()[:5], many=True).data
        return []


class LikeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Like
        fields = '__all__'
        read_only_fields = ('user',)


class ShareSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Share
        fields = '__all__'
        read_only_fields = ('user',)


class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    media = PostMediaSerializer(many=True, read_only=True)
    hashtags = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    is_shared_by_user = serializers.SerializerMethodField()
    has_access = serializers.SerializerMethodField()
    is_subscription_required = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = (
            'author', 'view_count', 'like_count', 'dislike_count', 
            'comment_count', 'share_count', 'total_earnings', 'is_flagged'
        )

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            like = Like.objects.filter(user=request.user, post=obj).first()
            return like.reaction_type if like else None
        return None

    def get_is_shared_by_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Share.objects.filter(user=request.user, post=obj).exists()
        return False

    def get_hashtags(self, obj):
        hashtag_relations = obj.hashtags.select_related('hashtag').all()
        return HashtagSerializer([rel.hashtag for rel in hashtag_relations], many=True).data

    def get_has_access(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_accessible_to_user(request.user)
        return not obj.is_monetized

    def get_is_subscription_required(self, obj):
        return obj.is_monetized

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # If content is monetized and user doesn't have access, hide sensitive content
        if instance.is_monetized and not self.get_has_access(instance):
            data['description'] = "🔒 This content is available to subscribers only. Subscribe to view this content."
            data['media'] = []
            # Keep basic info for preview
            data['title'] = data.get('title', '')
        
        return data


class PostCreateSerializer(serializers.ModelSerializer):
    hashtags = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
        write_only=True
    )
    media_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
        write_only=True
    )

    class Meta:
        model = Post
        fields = (
            'id', 'title', 'description', 'post_type', 'privacy', 
            'is_monetized', 'allow_comments', 'allow_sharing', 'is_advertisement',
            'hashtags', 'media_files', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        hashtags = validated_data.pop('hashtags', [])
        media_files = validated_data.pop('media_files', [])
        
        post = Post.objects.create(**validated_data)
        
        # Handle hashtags
        for hashtag_name in hashtags:
            hashtag_name = hashtag_name.lower().replace('#', '')
            hashtag, created = Hashtag.objects.get_or_create(name=hashtag_name)
            if created:
                hashtag.post_count = 1
            else:
                hashtag.post_count += 1
            hashtag.save()
            PostHashtag.objects.create(post=post, hashtag=hashtag)
        
        # Handle media files
        for i, media_file in enumerate(media_files):
            media_type = 'image' if media_file.content_type.startswith('image') else 'video'
            PostMedia.objects.create(
                post=post,
                file=media_file,
                media_type=media_type,
                order=i
            )
        
        return post

    def to_representation(self, instance):
        """
        Convert the post instance to a dictionary representation for the response.
        This avoids the RelatedManager issue by using a simplified representation.
        """
        return {
            'id': instance.id,
            'title': instance.title,
            'description': instance.description,
            'post_type': instance.post_type,
            'privacy': instance.privacy,
            'is_monetized': instance.is_monetized,
            'allow_comments': instance.allow_comments,
            'allow_sharing': instance.allow_sharing,
            'created_at': instance.created_at,
            'updated_at': instance.updated_at,
            'author': instance.author.id,
            'view_count': instance.view_count,
            'like_count': instance.like_count,
            'comment_count': instance.comment_count,
            'share_count': instance.share_count,
        }


class PostViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostView
        fields = '__all__'
        read_only_fields = ('user', 'ip_address', 'user_agent')