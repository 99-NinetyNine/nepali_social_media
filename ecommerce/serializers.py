from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Shop, Product, Category, ProductImage, ProductVariant, Cart, CartItem,
    Order, OrderItem, Review, Wishlist, Coupon
)

User = get_user_model()


class ShopSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    product_count = serializers.SerializerMethodField()
    can_add_product = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'owner', 'owner_name', 'name', 'description', 'logo',
            'is_active', 'status', 'contact_email', 'contact_phone', 'address',
            'business_license', 'tax_id', 'max_products', 'slug',
            'total_sales', 'total_orders', 'average_rating',
            'product_count', 'can_add_product', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'owner', 'slug', 'total_sales', 'total_orders', 
            'average_rating', 'created_at', 'updated_at'
        ]

    def get_product_count(self, obj):
        return obj.get_product_count()

    def get_can_add_product(self, obj):
        return obj.can_add_product()


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image', 'parent', 'product_count']

    def get_product_count(self, obj):
        return Product.objects.filter(category=obj, is_active=True).count()


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'sort_order']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'value', 'price_adjustment', 'stock_quantity', 'sku']


class ProductSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    is_in_stock = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'seller', 'seller_name', 'shop', 'shop_name', 'category', 'category_name',
            'name', 'description', 'product_type', 'price', 'original_price',
            'discounted_price', 'stock_quantity', 'is_realtime_delivery',
            'preparation_time', 'is_active', 'is_featured', 'average_rating',
            'review_count', 'view_count', 'images', 'variants', 'is_in_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'seller', 'average_rating', 'review_count', 'view_count',
            'created_at', 'updated_at'
        ]

    def get_is_in_stock(self, obj):
        return obj.stock_quantity > 0

    def get_discounted_price(self, obj):
        if obj.original_price and obj.original_price > obj.price:
            discount = ((obj.original_price - obj.price) / obj.original_price) * 100
            return {
                'discount_percentage': round(discount, 2),
                'savings': obj.original_price - obj.price
            }
        return None


class ProductCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Product
        fields = [
            'shop', 'category', 'name', 'description', 'product_type', 'price',
            'original_price', 'stock_quantity', 'is_realtime_delivery',
            'preparation_time', 'is_featured', 'images'
        ]

    def validate_shop(self, value):
        user = self.context['request'].user
        if value.owner != user:
            raise serializers.ValidationError("You can only add products to your own shops")
        
        if not value.can_add_product():
            raise serializers.ValidationError(
                f"This shop has reached its product limit of {value.max_products} products"
            )
        
        return value

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        product = Product.objects.create(**validated_data)

        # Handle image uploads
        for index, image in enumerate(images_data):
            ProductImage.objects.create(
                product=product,
                image=image,
                is_primary=(index == 0),
                sort_order=index
            )

        return product


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'variant', 'quantity',
            'price', 'total_price', 'created_at'
        ]

    def get_total_price(self, obj):
        return obj.quantity * obj.price


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_items', 'total_amount', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_total_amount(self, obj):
        return sum(item.quantity * item.price for item in obj.items.all())


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image', 'quantity',
            'unit_price', 'total_price', 'variant_info'
        ]

    def get_product_image(self, obj):
        if obj.product and obj.product.images.filter(is_primary=True).exists():
            image = obj.product.images.filter(is_primary=True).first()
            if image:
                return self.context['request'].build_absolute_uri(image.image.url)
        return None


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'customer', 'customer_name', 'subtotal',
            'tax_amount', 'delivery_fee', 'total_amount', 'status',
            'status_display', 'payment_status', 'delivery_address',
            'delivery_phone', 'delivery_notes', 'items', 'created_at',
            'estimated_delivery', 'delivered_at'
        ]
        read_only_fields = [
            'id', 'order_id', 'customer', 'subtotal', 'tax_amount',
            'total_amount', 'created_at'
        ]


class ProductReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    reviewer_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'customer', 'reviewer_name', 'reviewer_avatar', 'product',
            'rating', 'title', 'comment', 'is_verified_purchase', 'created_at'
        ]
        read_only_fields = ['id', 'customer', 'is_verified_purchase', 'created_at']

    def get_reviewer_avatar(self, obj):
        if hasattr(obj.customer, 'profile') and obj.customer.profile.avatar:
            return self.context['request'].build_absolute_uri(obj.customer.profile.avatar.url)
        return None


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'product', 'product_id', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def validate_product_id(self, value):
        try:
            Product.objects.get(id=value, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or inactive")
        return value

    def create(self, validated_data):
        product_id = validated_data.pop('product_id')
        product = Product.objects.get(id=product_id)
        validated_data['product'] = product
        return super().create(validated_data)


class CouponSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value', 'minimum_amount',
            'maximum_discount', 'usage_limit', 'used_count', 'is_active',
            'valid_from', 'valid_until', 'is_valid', 'discount_amount'
        ]

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_discount_amount(self, obj):
        # This would need the cart total to calculate actual discount
        # For now, just return the discount value
        return obj.discount_value


class CheckoutSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(max_length=500)
    delivery_phone = serializers.CharField(max_length=15)
    delivery_notes = serializers.CharField(max_length=200, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=[
        ('cash_on_delivery', 'Cash on Delivery'),
        ('stripe', 'Credit Card'),
        ('khalti', 'Khalti'),
        ('digital_wallet', 'Digital Wallet')
    ])
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_delivery_phone(self, value):
        if not value.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise serializers.ValidationError("Invalid phone number format")
        return value

    def validate_coupon_code(self, value):
        if value:
            try:
                coupon = Coupon.objects.get(code=value, is_active=True)
                if not coupon.is_valid():
                    raise serializers.ValidationError("Coupon is not valid or has expired")
            except Coupon.DoesNotExist:
                raise serializers.ValidationError("Invalid coupon code")
        return value