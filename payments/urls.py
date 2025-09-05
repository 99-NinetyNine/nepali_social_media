from django.urls import path
from .views import (
    PremiumPlanListView, InvoiceListCreateView, InvoiceDetailView,
    subscribe_premium, confirm_payment, verify_khalti_payment, WalletView, add_funds_to_wallet,
    CreatorEarningListView, withdraw_earnings
)

urlpatterns = [
    path('plans/', PremiumPlanListView.as_view(), name='premium-plans'),
    path('invoices/', InvoiceListCreateView.as_view(), name='invoices'),
    path('invoices/<uuid:invoice_id>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('subscribe/', subscribe_premium, name='subscribe-premium'),
    path('confirm-payment/', confirm_payment, name='confirm-payment'),
    path('verify-khalti/', verify_khalti_payment, name='verify-khalti-payment'),
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('wallet/add-funds/', add_funds_to_wallet, name='add-funds'),
    path('earnings/', CreatorEarningListView.as_view(), name='creator-earnings'),
    path('withdraw/', withdraw_earnings, name='withdraw-earnings'),
]