from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import ContentReport, BlockedKeyword, AutoModerationAction, Dispute, DisputeMessage


class ContentReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)

    class Meta:
        model = ContentReport
        fields = [
            'id', 'reporter_username', 'report_type', 'description',
            'content_type', 'content_type_name', 'object_id', 'status',
            'moderator_notes', 'action_taken', 'created_at', 'reviewed_at'
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'moderator_notes', 'action_taken']

    def create(self, validated_data):
        # Get content type from model name
        content_type_name = self.initial_data.get('content_type_name')
        if content_type_name:
            try:
                content_type = ContentType.objects.get(model=content_type_name.lower())
                validated_data['content_type'] = content_type
            except ContentType.DoesNotExist:
                raise serializers.ValidationError({'content_type_name': 'Invalid content type'})
        
        return super().create(validated_data)


class BlockedKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedKeyword
        fields = ['id', 'keyword', 'severity', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class AutoModerationActionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    keyword_name = serializers.CharField(source='triggered_by_keyword.keyword', read_only=True)

    class Meta:
        model = AutoModerationAction
        fields = [
            'id', 'user_username', 'content_type_name', 'object_id',
            'action_type', 'reason', 'keyword_name', 'is_reversed',
            'created_at', 'reversed_at'
        ]
        read_only_fields = ['id', 'created_at', 'reversed_at']


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = DisputeMessage
        fields = [
            'id', 'sender_username', 'sender_name', 'message',
            'attachment', 'is_internal', 'created_at'
        ]
        read_only_fields = ['id', 'sender_username', 'sender_name', 'created_at']

    def get_sender_name(self, obj):
        if obj.sender.first_name and obj.sender.last_name:
            return f"{obj.sender.first_name} {obj.sender.last_name}"
        return obj.sender.username


class DisputeSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    order_id = serializers.CharField(source='order.order_id', read_only=True)
    messages = DisputeMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            'id', 'dispute_id', 'customer_username', 'seller_username',
            'dispute_type', 'subject', 'description', 'order_id',
            'status', 'priority', 'resolution', 'created_at',
            'updated_at', 'resolved_at', 'messages', 'message_count'
        ]
        read_only_fields = [
            'id', 'dispute_id', 'customer_username', 'seller_username',
            'order_id', 'created_at', 'updated_at', 'resolved_at', 'messages'
        ]

    def get_message_count(self, obj):
        return obj.messages.filter(is_internal=False).count()


class DisputeCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating disputes"""
    
    class Meta:
        model = Dispute
        fields = ['dispute_type', 'subject', 'description', 'order']
        
    def validate_order(self, value):
        """Ensure the user owns the order they're disputing"""
        if value and value.customer != self.context['request'].user:
            raise serializers.ValidationError("You can only create disputes for your own orders")
        return value


class ModerationRequestSerializer(serializers.Serializer):
    """Serializer for content moderation requests"""
    content_type = serializers.ChoiceField(choices=['post', 'comment', 'profile', 'product'])
    content_data = serializers.JSONField()
    
    def validate_content_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Content data must be a dictionary")
        return value


class TextAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for text analysis requests"""
    text = serializers.CharField(max_length=10000)
    
    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Text cannot be empty")
        return value


class ReportContentSerializer(serializers.Serializer):
    """Serializer for reporting content"""
    content_type = serializers.CharField(max_length=50)
    object_id = serializers.IntegerField()
    report_type = serializers.ChoiceField(choices=ContentReport.REPORT_TYPES)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_content_type(self, value):
        # Check if content type exists
        try:
            ContentType.objects.get(model=value.lower())
        except ContentType.DoesNotExist:
            raise serializers.ValidationError("Invalid content type")
        return value.lower()