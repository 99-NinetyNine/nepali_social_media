from django.contrib import admin
from .models import (
    PremiumPlan, Invoice, InvoiceItem, Subscription, 
    Payment, Wallet, WalletTransaction, CreatorEarning
)


@admin.register(PremiumPlan)
class PremiumPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan_type', 'price', 'duration_days', 'is_active')
    list_filter = ('plan_type', 'is_active')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_id', 'user', 'invoice_type', 'total_amount', 'status', 'created_at')
    list_filter = ('invoice_type', 'status', 'payment_method')
    search_fields = ('invoice_id', 'user__username', 'user__email')
    readonly_fields = ('invoice_id', 'total_amount')


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'description', 'quantity', 'unit_price', 'total_price')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'starts_at', 'expires_at', 'auto_renew')
    list_filter = ('status', 'auto_renew')
    search_fields = ('user__username', 'user__email')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_id', 'invoice', 'amount', 'payment_method', 'status', 'created_at')
    list_filter = ('payment_method', 'status')
    search_fields = ('payment_id', 'provider_payment_id')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'total_earned', 'total_spent', 'is_frozen')
    list_filter = ('is_frozen',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('total_earned', 'total_spent')


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'transaction_type', 'amount', 'description', 'balance_after', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('wallet__user__username', 'description')


@admin.register(CreatorEarning)
class CreatorEarningAdmin(admin.ModelAdmin):
    list_display = ('creator', 'amount', 'earning_type', 'is_paid', 'created_at')
    list_filter = ('earning_type', 'is_paid')
    search_fields = ('creator__username',)