"""
Dummy content moderation utilities for development.
In production, these would integrate with real AI/ML services.
"""

from typing import Dict, Any, List, Tuple
from django.conf import settings
import re


def analyze_text_content(text: str) -> Dict[str, Any]:
    """
    Dummy text content analysis.
    In production, this would use ML models or third-party services.
    """
    # Simple dummy implementation - always returns safe
    return {
        'is_safe': True,
        'toxicity_score': 0.1,  # 0.0 to 1.0
        'categories': {
            'hate_speech': 0.02,
            'harassment': 0.01,
            'violence': 0.03,
            'adult_content': 0.01,
            'spam': 0.05
        },
        'flagged_words': [],
        'confidence': 0.95,
        'action': 'approve'  # approve, flag, reject
    }


def analyze_image_content(image_path: str) -> Dict[str, Any]:
    """
    Dummy image content analysis.
    In production, this would use computer vision APIs.
    """
    return {
        'is_safe': True,
        'adult_content_score': 0.02,
        'violence_score': 0.01,
        'has_faces': False,
        'contains_text': False,
        'extracted_text': '',
        'objects_detected': ['background'],
        'confidence': 0.90,
        'action': 'approve'
    }


def analyze_video_content(video_path: str) -> Dict[str, Any]:
    """
    Dummy video content analysis.
    In production, this would analyze video frames and audio.
    """
    return {
        'is_safe': True,
        'adult_content_score': 0.01,
        'violence_score': 0.02,
        'duration_seconds': 30,
        'has_audio': True,
        'audio_analysis': {
            'language': 'en',
            'contains_profanity': False,
            'sentiment': 'neutral'
        },
        'frame_analysis': {
            'total_frames': 900,
            'flagged_frames': 0,
            'adult_content_frames': 0
        },
        'confidence': 0.88,
        'action': 'approve'
    }


def check_spam_indicators(content: str, user_data: Dict) -> Dict[str, Any]:
    """
    Dummy spam detection.
    In production, this would use sophisticated ML models.
    """
    # Simple heuristics for demonstration
    spam_score = 0.0
    indicators = []
    
    # Check for excessive caps
    if content.isupper() and len(content) > 10:
        spam_score += 0.3
        indicators.append('excessive_caps')
    
    # Check for repeated characters
    if re.search(r'(.)\1{4,}', content):
        spam_score += 0.2
        indicators.append('repeated_characters')
    
    # Check for multiple links
    links = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', content)
    if len(links) > 2:
        spam_score += 0.4
        indicators.append('multiple_links')
    
    # Always return safe for development
    return {
        'spam_score': min(spam_score, 0.3),  # Keep it low for development
        'indicators': indicators,
        'is_spam': False,  # Always false for development
        'confidence': 0.85,
        'action': 'approve'
    }


def moderate_post_content(post_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main content moderation function for posts.
    Returns moderation decision and metadata.
    """
    # Analyze text content
    text_result = analyze_text_content(post_data.get('content', ''))
    
    # Check for spam
    spam_result = check_spam_indicators(
        post_data.get('content', ''), 
        post_data.get('user_data', {})
    )
    
    # For development, always approve content
    final_decision = {
        'approved': True,
        'requires_review': False,
        'auto_delete': False,
        'confidence': 0.95,
        'reasons': [],
        'text_analysis': text_result,
        'spam_analysis': spam_result,
        'media_analysis': []
    }
    
    # Analyze media files if present
    if 'media_files' in post_data:
        for media in post_data['media_files']:
            if media['type'] == 'image':
                media_result = analyze_image_content(media['path'])
            elif media['type'] == 'video':
                media_result = analyze_video_content(media['path'])
            else:
                media_result = {'is_safe': True, 'action': 'approve'}
            
            final_decision['media_analysis'].append(media_result)
    
    return final_decision


def moderate_comment_content(comment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Content moderation for comments.
    """
    text_result = analyze_text_content(comment_data.get('content', ''))
    spam_result = check_spam_indicators(
        comment_data.get('content', ''), 
        comment_data.get('user_data', {})
    )
    
    return {
        'approved': True,
        'requires_review': False,
        'confidence': 0.92,
        'text_analysis': text_result,
        'spam_analysis': spam_result
    }


def moderate_user_profile(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Moderation for user profile information.
    """
    # Check bio
    bio_result = analyze_text_content(profile_data.get('bio', ''))
    
    # Check profile images
    avatar_result = {'is_safe': True, 'action': 'approve'}
    cover_result = {'is_safe': True, 'action': 'approve'}
    
    if profile_data.get('avatar_path'):
        avatar_result = analyze_image_content(profile_data['avatar_path'])
    
    if profile_data.get('cover_photo_path'):
        cover_result = analyze_image_content(profile_data['cover_photo_path'])
    
    return {
        'approved': True,
        'requires_review': False,
        'bio_analysis': bio_result,
        'avatar_analysis': avatar_result,
        'cover_analysis': cover_result,
        'confidence': 0.90
    }


def moderate_product_listing(product_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Moderation for e-commerce product listings.
    """
    # Check product name and description
    name_result = analyze_text_content(product_data.get('name', ''))
    desc_result = analyze_text_content(product_data.get('description', ''))
    
    # Check product images
    image_results = []
    for image_path in product_data.get('image_paths', []):
        image_results.append(analyze_image_content(image_path))
    
    return {
        'approved': True,
        'requires_review': False,
        'name_analysis': name_result,
        'description_analysis': desc_result,
        'image_analysis': image_results,
        'confidence': 0.88
    }


# Utility functions for integration
def should_auto_delete(moderation_result: Dict[str, Any]) -> bool:
    """Check if content should be auto-deleted based on moderation result."""
    if not settings.AUTO_DELETE_VULGAR_CONTENT:
        return False
    
    return moderation_result.get('auto_delete', False)


def requires_human_review(moderation_result: Dict[str, Any]) -> bool:
    """Check if content requires human moderator review."""
    return moderation_result.get('requires_review', False)


def get_moderation_action(moderation_result: Dict[str, Any]) -> str:
    """Get the recommended moderation action."""
    if moderation_result.get('auto_delete', False):
        return 'delete'
    elif moderation_result.get('requires_review', False):
        return 'review'
    elif moderation_result.get('approved', True):
        return 'approve'
    else:
        return 'reject'