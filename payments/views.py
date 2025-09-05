from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
import stripe
import requests
from .models import (
    PremiumPlan, Invoice, Subscription, Payment, 
    Wallet, WalletTransaction, CreatorEarning
)
from .serializers import (
    PremiumPlanSerializer, InvoiceSerializer, InvoiceCreateSerializer,
    SubscriptionSerializer, PaymentSerializer, WalletSerializer,
    WalletTransactionSerializer, CreatorEarningSerializer
)

stripe.api_key = settings.STRIPE_SECRET_KEY


class PremiumPlanListView(generics.ListAPIView):
    queryset = PremiumPlan.objects.filter(is_active=True)
    serializer_class = PremiumPlanSerializer
    permission_classes = [permissions.IsAuthenticated]


class InvoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InvoiceDetailView(generics.RetrieveAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def subscribe_premium(request):
    plan_id = request.data.get('plan_id')
    payment_method = request.data.get('payment_method', 'stripe')
    
    try:
        plan = PremiumPlan.objects.get(id=plan_id, is_active=True)
    except PremiumPlan.DoesNotExist:
        return Response({
            'error': 'Invalid plan selected'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create invoice
    invoice = Invoice.objects.create(
        user=request.user,
        invoice_type='premium_subscription',
        subtotal=plan.price,
        total_amount=plan.price,
        payment_method=payment_method,
        due_date=timezone.now() + timezone.timedelta(days=7)
    )
    
    # Add invoice item
    invoice.items.create(
        description=f"{plan.name} Subscription",
        quantity=1,
        unit_price=plan.price,
        total_price=plan.price,
        metadata={'plan_id': str(plan.id)}
    )
    
    if payment_method == 'stripe':
        # Create Stripe payment intent
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(plan.price * 100),  # Convert to cents
                currency='usd',
                metadata={
                    'invoice_id': str(invoice.invoice_id),
                    'user_id': str(request.user.id),
                    'plan_id': str(plan.id)
                }
            )
            
            invoice.stripe_payment_intent_id = intent.id
            invoice.status = 'pending'
            invoice.save()
            
            return Response({
                'client_secret': intent.client_secret,
                'invoice_id': invoice.invoice_id
            })
            
        except stripe.error.StripeError as e:
            return Response({
                'error': f'Stripe error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    elif payment_method == 'khalti':
        # Create Khalti payment
        try:
            khalti_payload = {
                "return_url": "http://localhost:3000/payment/success/",
                "website_url": "http://localhost:3000/",
                "amount": int(plan.price * 100),  # Convert to paisa (NPR * 100)
                "purchase_order_id": str(invoice.invoice_id),
                "purchase_order_name": f"{plan.name} Subscription",
                "customer_info": {
                    "name": f"{request.user.first_name} {request.user.last_name}",
                    "email": request.user.email,
                }
            }
            
            headers = {
                'Authorization': f'Key {settings.KHALTI_SECRET_KEY}',
                'Content-Type': 'application/json',
            }
            
            khalti_response = requests.post(
                'https://a.khalti.com/api/v2/epayment/initiate/',
                json=khalti_payload,
                headers=headers
            )
            
            if khalti_response.status_code == 200:
                khalti_data = khalti_response.json()
                invoice.payment_reference = khalti_data.get('pidx')
                invoice.status = 'pending'
                invoice.save()
                
                return Response({
                    'payment_url': khalti_data.get('payment_url'),
                    'invoice_id': invoice.invoice_id
                })
            else:
                return Response({
                    'error': 'Khalti payment initiation failed'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': f'Khalti error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(InvoiceSerializer(invoice).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_payment(request):
    invoice_id = request.data.get('invoice_id')
    payment_intent_id = request.data.get('payment_intent_id')
    
    try:
        invoice = Invoice.objects.get(
            invoice_id=invoice_id,
            user=request.user,
            stripe_payment_intent_id=payment_intent_id
        )
    except Invoice.DoesNotExist:
        return Response({
            'error': 'Invalid invoice'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify payment with Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status == 'succeeded':
            # Mark invoice as paid
            invoice.mark_as_paid()
            
            # Create or update subscription
            if invoice.invoice_type == 'premium_subscription':
                plan_id = intent.metadata.get('plan_id')
                if plan_id:
                    plan = PremiumPlan.objects.get(id=plan_id)
                    
                    # Create subscription
                    expires_at = timezone.now()
                    if plan.duration_days > 0:
                        expires_at += timezone.timedelta(days=plan.duration_days)
                    else:
                        # Lifetime subscription
                        expires_at += timezone.timedelta(days=36500)  # 100 years
                    
                    subscription, created = Subscription.objects.get_or_create(
                        user=request.user,
                        defaults={
                            'plan': plan,
                            'expires_at': expires_at,
                            'stripe_subscription_id': payment_intent_id
                        }
                    )
                    
                    if not created:
                        subscription.plan = plan
                        subscription.expires_at = expires_at
                        subscription.status = 'active'
                        subscription.save()
                    
                    # Update user premium status
                    request.user.is_premium = True
                    request.user.premium_expires_at = expires_at
                    request.user.save()
            
            return Response({
                'success': True,
                'message': 'Payment confirmed successfully'
            })
        else:
            return Response({
                'error': 'Payment not completed'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except stripe.error.StripeError as e:
        return Response({
            'error': f'Payment verification failed: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_khalti_payment(request):
    invoice_id = request.data.get('invoice_id')
    pidx = request.data.get('pidx')
    
    try:
        invoice = Invoice.objects.get(
            invoice_id=invoice_id,
            user=request.user,
            payment_reference=pidx
        )
    except Invoice.DoesNotExist:
        return Response({
            'error': 'Invalid invoice'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify payment with Khalti
        headers = {
            'Authorization': f'Key {settings.KHALTI_SECRET_KEY}',
            'Content-Type': 'application/json',
        }
        
        khalti_verify_response = requests.post(
            'https://a.khalti.com/api/v2/epayment/lookup/',
            json={'pidx': pidx},
            headers=headers
        )
        
        if khalti_verify_response.status_code == 200:
            payment_data = khalti_verify_response.json()
            
            if payment_data.get('status') == 'Completed':
                # Mark invoice as paid
                invoice.mark_as_paid()
                
                # Create or update subscription if premium subscription
                if invoice.invoice_type == 'premium_subscription':
                    # Get plan from invoice items
                    plan_item = invoice.items.first()
                    if plan_item and 'plan_id' in plan_item.metadata:
                        plan = PremiumPlan.objects.get(id=plan_item.metadata['plan_id'])
                    else:
                        # Fallback: get plan from invoice description
                        plan_name = plan_item.description.replace(' Subscription', '') if plan_item else 'Basic'
                        plan = PremiumPlan.objects.filter(name__icontains=plan_name).first()
                    
                    if plan:
                        # Create subscription
                        expires_at = timezone.now()
                        if plan.duration_days > 0:
                            expires_at += timezone.timedelta(days=plan.duration_days)
                        else:
                            # Lifetime subscription
                            expires_at += timezone.timedelta(days=36500)  # 100 years
                        
                        subscription, created = Subscription.objects.get_or_create(
                            user=request.user,
                            defaults={
                                'plan': plan,
                                'expires_at': expires_at,
                                'stripe_subscription_id': pidx  # Store Khalti reference
                            }
                        )
                        
                        if not created:
                            subscription.plan = plan
                            subscription.expires_at = expires_at
                            subscription.status = 'active'
                            subscription.save()
                        
                        # Update user premium status
                        request.user.is_premium = True
                        request.user.premium_expires_at = expires_at
                        request.user.save()
                
                # Handle wallet funding
                elif invoice.invoice_type == 'wallet_funding':
                    wallet, created = Wallet.objects.get_or_create(user=request.user)
                    wallet.add_funds(invoice.total_amount, f"Khalti payment - Invoice {invoice.invoice_id}")
                
                return Response({
                    'success': True,
                    'message': 'Khalti payment verified successfully'
                })
            else:
                return Response({
                    'error': f'Payment not completed. Status: {payment_data.get("status")}'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                'error': 'Khalti payment verification failed'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'error': f'Payment verification error: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


class WalletView(generics.RetrieveAPIView):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        wallet, created = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_funds_to_wallet(request):
    amount = float(request.data.get('amount', 0))
    
    if amount <= 0:
        return Response({
            'error': 'Amount must be greater than 0'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create invoice for wallet funding
    invoice = Invoice.objects.create(
        user=request.user,
        invoice_type='wallet_funding',
        subtotal=amount,
        total_amount=amount,
        payment_method='stripe'
    )
    
    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency='usd',
            metadata={
                'invoice_id': str(invoice.invoice_id),
                'user_id': str(request.user.id),
                'purpose': 'wallet_funding'
            }
        )
        
        invoice.stripe_payment_intent_id = intent.id
        invoice.status = 'pending'
        invoice.save()
        
        return Response({
            'client_secret': intent.client_secret,
            'invoice_id': invoice.invoice_id
        })
        
    except stripe.error.StripeError as e:
        return Response({
            'error': f'Stripe error: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


class CreatorEarningListView(generics.ListAPIView):
    serializer_class = CreatorEarningSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CreatorEarning.objects.filter(creator=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def withdraw_earnings(request):
    amount = float(request.data.get('amount', 0))
    
    if amount <= 0:
        return Response({
            'error': 'Amount must be greater than 0'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get user wallet
    wallet, created = Wallet.objects.get_or_create(user=request.user)
    
    if wallet.balance < amount:
        return Response({
            'error': 'Insufficient wallet balance'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create withdrawal invoice
    invoice = Invoice.objects.create(
        user=request.user,
        invoice_type='creator_reward',
        subtotal=amount,
        total_amount=amount,
        status='paid',  # Auto-approve withdrawals
        paid_at=timezone.now()
    )
    
    # Deduct from wallet
    wallet.deduct_funds(amount, f"Withdrawal - Invoice {invoice.invoice_id}")
    
    return Response({
        'success': True,
        'message': f'Withdrawal of ${amount} processed successfully',
        'invoice_id': invoice.invoice_id
    })