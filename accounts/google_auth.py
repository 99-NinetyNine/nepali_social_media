import json
from google.auth.transport import requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class GoogleOAuth:
    def __init__(self):
        self.client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        self.client_secret = settings.GOOGLE_OAUTH2_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_OAUTH2_REDIRECT_URI
        
    def get_auth_url(self):
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile', 
                'openid'
            ]
        )
        flow.redirect_uri = self.redirect_uri
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        return auth_url
    
    def exchange_code_for_token(self, code):
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile', 
                'openid'
            ]
        )
        flow.redirect_uri = self.redirect_uri
        
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        request = requests.Request()
        
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            request,
            self.client_id
        )
        
        return id_info
    
    def create_or_get_user(self, user_info):
        email = user_info.get('email')
        google_id = user_info.get('sub')
        name = user_info.get('name', '')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        picture = user_info.get('picture', '')
        
        if not email:
            raise serializers.ValidationError('Email is required')
        
        try:
            user = User.objects.get(email=email)
            if not user.google_id:
                user.google_id = google_id
                user.save()
            return user, False
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                username=email.split('@')[0] + '_' + google_id[:8],
                first_name=first_name,
                last_name=last_name,
                full_name=name,
                google_id=google_id,
                profile_picture_url=picture,
                is_active=True,
                auth_provider='google'
            )
            return user, True