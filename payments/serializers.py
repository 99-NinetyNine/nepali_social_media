from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import (
    PremiumPlan, Invoice, InvoiceItem, Subscription, 
    Payment, Wallet, WalletTransaction, CreatorEarning
)


class PremiumPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumPlan
        fields = '__all__'


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'
        read_only_fields = ('total_price',)


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = (
            'invoice_id', 'user', 'total_amount', 'paid_at'
        )


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, write_only=True)

    class Meta:
        model = Invoice
        fields = (
            'invoice_type', 'subtotal', 'tax_amount', 
            'discount_amount', 'delivery_fee', 'payment_method',
            'due_date', 'notes', 'metadata', 'items'
        )

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        
        return invoice


class SubscriptionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    plan = PremiumPlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    invoice = InvoiceSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('payment_id', 'completed_at')


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'


class WalletSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    recent_transactions = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = '__all__'
        read_only_fields = ('user', 'total_earned', 'total_spent')

    def get_recent_transactions(self, obj):
        transactions = obj.transactions.all()[:10]
        return WalletTransactionSerializer(transactions, many=True).data


class CreatorEarningSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)

    class Meta:
        model = CreatorEarning
        fields = '__all__'
        read_only_fields = ('creator', 'is_paid', 'paid_at')