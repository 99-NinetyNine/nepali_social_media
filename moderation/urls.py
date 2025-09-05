from django.urls import path
from .views import (
    ContentReportListCreateView, BlockedKeywordListView,
    moderate_content, report_content, analyze_text, analyze_image,
    moderation_stats, DisputeListCreateView, DisputeDetailView,
    DisputeMessageListCreateView
)

urlpatterns = [
    path('reports/', ContentReportListCreateView.as_view(), name='content-reports'),
    path('blocked-keywords/', BlockedKeywordListView.as_view(), name='blocked-keywords'),
    path('moderate/', moderate_content, name='moderate-content'),
    path('report/', report_content, name='report-content'),
    path('analyze/text/', analyze_text, name='analyze-text'),
    path('analyze/image/', analyze_image, name='analyze-image'),
    path('stats/', moderation_stats, name='moderation-stats'),
    
    # Dispute management
    path('disputes/', DisputeListCreateView.as_view(), name='disputes'),
    path('disputes/<str:dispute_id>/', DisputeDetailView.as_view(), name='dispute-detail'),
    path('disputes/<str:dispute_id>/messages/', DisputeMessageListCreateView.as_view(), name='dispute-messages'),
]