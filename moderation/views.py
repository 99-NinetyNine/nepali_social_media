from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType
from django.db import models
from .models import ContentReport, BlockedKeyword, Dispute, DisputeMessage
from .serializers import (
    ContentReportSerializer, BlockedKeywordSerializer,
    DisputeSerializer, DisputeMessageSerializer
)
from .utils import (
    moderate_post_content, moderate_comment_content,
    moderate_user_profile, moderate_product_listing
)


class ContentReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ContentReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ContentReport.objects.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class BlockedKeywordListView(generics.ListAPIView):
    queryset = BlockedKeyword.objects.filter(is_active=True)
    serializer_class = BlockedKeywordSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def moderate_content(request):
    """
    Dummy content moderation endpoint.
    In production, this would integrate with real AI/ML services.
    """
    content_type = request.data.get('content_type')
    content_data = request.data.get('content_data', {})
    
    try:
        if content_type == 'post':
            result = moderate_post_content(content_data)
        elif content_type == 'comment':
            result = moderate_comment_content(content_data)
        elif content_type == 'profile':
            result = moderate_user_profile(content_data)
        elif content_type == 'product':
            result = moderate_product_listing(content_data)
        else:
            return Response({
                'error': 'Invalid content type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'moderation_result': result,
            'message': 'Content moderation completed (dummy implementation)'
        })
        
    except Exception as e:
        return Response({
            'error': f'Moderation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def report_content(request):
    """Report inappropriate content."""
    content_type_name = request.data.get('content_type')
    object_id = request.data.get('object_id')
    report_type = request.data.get('report_type')
    description = request.data.get('description', '')
    
    try:
        content_type = ContentType.objects.get(model=content_type_name.lower())
        
        # Check if user has already reported this content
        existing_report = ContentReport.objects.filter(
            reporter=request.user,
            content_type=content_type,
            object_id=object_id
        ).first()
        
        if existing_report:
            return Response({
                'error': 'You have already reported this content'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        report = ContentReport.objects.create(
            reporter=request.user,
            content_type=content_type,
            object_id=object_id,
            report_type=report_type,
            description=description
        )
        
        return Response({
            'success': True,
            'message': 'Content reported successfully',
            'report_id': report.id
        })
        
    except ContentType.DoesNotExist:
        return Response({
            'error': 'Invalid content type'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Failed to report content: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DisputeListCreateView(generics.ListCreateAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Dispute.objects.filter(
            models.Q(customer=user) | models.Q(seller=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class DisputeDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'dispute_id'

    def get_queryset(self):
        user = self.request.user
        return Dispute.objects.filter(
            models.Q(customer=user) | models.Q(seller=user)
        )


class DisputeMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = DisputeMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dispute_id = self.kwargs['dispute_id']
        dispute = get_object_or_404(Dispute, dispute_id=dispute_id)
        
        # Check if user is part of the dispute
        user = self.request.user
        if user != dispute.customer and user != dispute.seller:
            return DisputeMessage.objects.none()
        
        return dispute.messages.filter(is_internal=False)

    def perform_create(self, serializer):
        dispute_id = self.kwargs['dispute_id']
        dispute = get_object_or_404(Dispute, dispute_id=dispute_id)
        
        # Check if user is part of the dispute
        user = self.request.user
        if user != dispute.customer and user != dispute.seller:
            raise PermissionError("You don't have permission to message in this dispute")
        
        serializer.save(dispute=dispute, sender=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_text(request):
    """
    Dummy text analysis endpoint for real-time content checking.
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response({
            'error': 'No text provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    from .utils import analyze_text_content
    result = analyze_text_content(text)
    
    return Response({
        'analysis': result,
        'text_length': len(text),
        'word_count': len(text.split()),
        'message': 'Text analysis completed (dummy implementation)'
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_image(request):
    """
    Dummy image analysis endpoint.
    """
    if 'image' not in request.FILES:
        return Response({
            'error': 'No image file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # In a real implementation, you'd save the file and analyze it
    from .utils import analyze_image_content
    result = analyze_image_content('/dummy/path/to/image.jpg')
    
    return Response({
        'analysis': result,
        'file_size': request.FILES['image'].size,
        'content_type': request.FILES['image'].content_type,
        'message': 'Image analysis completed (dummy implementation)'
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def moderation_stats(request):
    """
    Get moderation statistics for the current user.
    """
    user = request.user
    
    # Count user's reports
    reports_made = ContentReport.objects.filter(reporter=user).count()
    disputes_created = Dispute.objects.filter(customer=user).count()
    
    return Response({
        'reports_made': reports_made,
        'disputes_created': disputes_created,
        'account_status': 'good_standing',  # Dummy status
        'warnings_count': 0,  # Dummy count
        'moderation_score': 95,  # Dummy score (0-100)
        'last_violation': None,  # Dummy data
        'message': 'Moderation stats retrieved (dummy data)'
    })