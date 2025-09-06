from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from payments.models import Wallet

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a demo user for development and testing'

    def handle(self, *args, **options):
        demo_email = 'demo@example.com'
        demo_password = 'demopassword123'
        
        # Check if demo user already exists
        if User.objects.filter(email=demo_email).exists():
            self.stdout.write(
                self.style.WARNING('Demo user already exists!')
            )
            return
        
        # Create demo user
        user = User.objects.create_user(
            username='demo_user',
            email=demo_email,
            password=demo_password,
            first_name='Demo',
            last_name='User',
            subscription_tier=1,  # Give them Tier 1 subscription
            is_business=True  # Make them a business user so they can create shops/products
        )
        
        # Create user profile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'bio': 'Demo user account for testing the social media platform',
                'location': 'Demo City, Demo Country',
                'privacy_level': 'public',
                'show_monetization_content': True
            }
        )
        
        # Create wallet with some credits
        wallet, created = Wallet.objects.get_or_create(
            user=user,
            defaults={'balance': 1000}  # Give demo user 1000 credits to play with
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created demo user!\n'
                f'Email: {demo_email}\n'
                f'Password: {demo_password}\n'
                f'Credits: {wallet.balance}\n'
                f'Business User: Yes'
            )
        )