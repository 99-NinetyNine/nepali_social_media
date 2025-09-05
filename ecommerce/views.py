from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, F, Avg
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import (
    Shop, Product, Category, Cart, CartItem, Order, OrderItem, 
    Review, Wishlist, Coupon
)
from .serializers import (
    ShopSerializer, ProductSerializer, CategorySerializer, CartSerializer, 
    CartItemSerializer, OrderSerializer, ProductReviewSerializer,
    WishlistSerializer, ProductCreateSerializer
)
from posts.permissions import IsSellerOrReadOnly, IsOwnerOrReadOnly
from payments.models import Wallet


class ShopViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shops with credit-based payment system.
    """
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'total_sales', 'total_orders', 'average_rating']
    ordering = ['-created_at']

    SHOP_FEE = 75  # Credits required for additional shops (first shop is free)

    def get_queryset(self):
        return Shop.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        
        # Check if this is the user's first shop (free)
        existing_shops_count = Shop.objects.filter(owner=user).count()
        
        if existing_shops_count >= 1:
            # Check if user has sufficient credits for additional shops
            wallet, created = Wallet.objects.get_or_create(user=user)
            
            if wallet.balance < self.SHOP_FEE:
                raise ValidationError({
                    'error': f'Insufficient credits. Creating additional shops requires {self.SHOP_FEE} credits. Current balance: {wallet.balance}'
                })
            
            # Deduct credits for additional shop
            with transaction.atomic():
                wallet.balance = F('balance') - self.SHOP_FEE
                wallet.save()
                wallet.refresh_from_db()
                
                # Create transaction record
                from payments.models import CreditTransaction
                CreditTransaction.objects.create(
                    user=user,
                    amount=-self.SHOP_FEE,
                    transaction_type='debit',
                    description=f'Created new shop: {serializer.validated_data["name"]}',
                    balance_after=wallet.balance
                )
        
        serializer.save(owner=user)

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get products in this shop"""
        shop = self.get_object()
        products = Product.objects.filter(shop=shop, is_active=True).order_by('-created_at')
        
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get shop statistics"""
        shop = self.get_object()
        
        stats = {
            'total_products': shop.get_product_count(),
            'max_products': shop.max_products,
            'can_add_product': shop.can_add_product(),
            'total_sales': float(shop.total_sales),
            'total_orders': shop.total_orders,
            'average_rating': float(shop.average_rating),
            'status': shop.get_status_display()
        }
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def pricing_info(self, request):
        """Get shop pricing information"""
        user = request.user
        wallet, created = Wallet.objects.get_or_create(user=user)
        existing_shops_count = Shop.objects.filter(owner=user).count()
        
        return Response({
            'shop_fee': self.SHOP_FEE,
            'current_balance': wallet.balance,
            'existing_shops_count': existing_shops_count,
            'first_shop_free': existing_shops_count == 0,
            'can_create_shop': existing_shops_count == 0 or wallet.balance >= self.SHOP_FEE
        })


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing products with proper CRUD operations.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsSellerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['created_at', 'price', 'average_rating', 'view_count']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related('seller', 'shop', 'category')
        
        # Filter by shop
        shop = self.request.query_params.get('shop')
        if shop:
            queryset = queryset.filter(shop_id=shop)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # Filter by availability
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            queryset = queryset.filter(stock_quantity__gt=0)
        
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Increment view count
        Product.objects.filter(id=instance.id).update(view_count=F('view_count') + 1)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_to_cart(self, request, pk=None):
        """Add product to user's cart"""
        product = self.get_object()
        quantity = int(request.data.get('quantity', 1))
        variant_id = request.data.get('variant_id')
        
        if product.stock_quantity < quantity:
            return Response(
                {'error': 'Insufficient stock'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant_id=variant_id if variant_id else None,
            defaults={'quantity': quantity, 'price': product.price}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        return Response({'message': 'Product added to cart'})

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get product reviews"""
        product = self.get_object()
        reviews = Review.objects.filter(product=product).order_by('-created_at')
        serializer = ProductReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_review(self, request, pk=None):
        """Add a review for the product"""
        product = self.get_object()
        rating = request.data.get('rating')
        title = request.data.get('title', 'Review')
        comment = request.data.get('comment', '')
        order_item_id = request.data.get('order_item_id')
        
        if not rating or int(rating) < 1 or int(rating) > 5:
            return Response(
                {'error': 'Rating must be between 1 and 5'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not order_item_id:
            return Response(
                {'error': 'Order item ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order_item = OrderItem.objects.get(
                id=order_item_id,
                order__customer=request.user,
                product=product
            )
        except OrderItem.DoesNotExist:
            return Response(
                {'error': 'Order item not found or you cannot review this product'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has already reviewed this order item
        if hasattr(order_item, 'review'):
            return Response(
                {'error': 'You have already reviewed this purchase'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        review = Review.objects.create(
            customer=request.user,
            product=product,
            order_item=order_item,
            rating=int(rating),
            title=title,
            comment=comment
        )
        
        # Update product average rating
        avg_rating = Review.objects.filter(product=product).aggregate(
            avg=Avg('rating')
        )['avg']
        product.average_rating = round(avg_rating, 2) if avg_rating else 0
        product.review_count = Review.objects.filter(product=product).count()
        product.save()
        
        serializer = ProductReviewSerializer(review)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def add_to_wishlist(self, request, pk=None):
        """Add product to wishlist"""
        product = self.get_object()
        
        wishlist_item, created = Wishlist.objects.get_or_create(
            user=request.user,
            product=product
        )
        
        if created:
            return Response({'message': 'Product added to wishlist'})
        else:
            return Response({'message': 'Product already in wishlist'})

    @action(detail=False, methods=['get'])
    def my_products(self, request):
        """Get current user's products (for sellers)"""
        # Filter by shop if specified
        shop_id = request.query_params.get('shop')
        
        if shop_id:
            # Get products from specific shop owned by user
            try:
                shop = Shop.objects.get(id=shop_id, owner=request.user)
                products = Product.objects.filter(shop=shop, seller=request.user).order_by('-created_at')
            except Shop.DoesNotExist:
                return Response(
                    {'error': 'Shop not found or not owned by you'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Get all products from user's shops
            user_shops = Shop.objects.filter(owner=request.user)
            products = Product.objects.filter(shop__in=user_shops, seller=request.user).order_by('-created_at')
        
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured products"""
        featured_products = Product.objects.filter(
            is_featured=True, 
            is_active=True
        ).order_by('-created_at')[:10]
        
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for product categories (read-only).
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get products in this category"""
        category = self.get_object()
        products = Product.objects.filter(
            category=category, 
            is_active=True
        ).order_by('-created_at')
        
        # Apply pagination
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class CartViewSet(viewsets.ModelViewSet):
    """
    ViewSet for shopping cart management.
    """
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart

    @action(detail=False, methods=['get'])
    def items(self, request):
        """Get cart items"""
        cart = self.get_object()
        items = CartItem.objects.filter(cart=cart).select_related('product')
        serializer = CartItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to cart"""
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if product.stock_quantity < quantity:
            return Response(
                {'error': 'Insufficient stock'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart = self.get_object()
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity, 'price': product.price}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        return Response({'message': 'Item added to cart'})

    @action(detail=False, methods=['put'])
    def update_item(self, request):
        """Update cart item quantity"""
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        
        try:
            cart = self.get_object()
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if quantity <= 0:
            cart_item.delete()
            return Response({'message': 'Item removed from cart'})
        
        cart_item.quantity = quantity
        cart_item.save()
        
        return Response({'message': 'Cart item updated'})

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear all items from cart"""
        cart = self.get_object()
        CartItem.objects.filter(cart=cart).delete()
        return Response({'message': 'Cart cleared'})

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        """Proceed to checkout"""
        cart = self.get_object()
        cart_items = CartItem.objects.filter(cart=cart)
        
        if not cart_items.exists():
            return Response(
                {'error': 'Cart is empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate totals
        subtotal = sum(item.quantity * item.price for item in cart_items)
        delivery_fee = 2.99  # Fixed delivery fee
        total = subtotal + delivery_fee
        
        # Create order
        order = Order.objects.create(
            customer=request.user,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total_amount=total,
            status='pending',
            delivery_address=request.data.get('delivery_address', ''),
            delivery_phone=request.data.get('delivery_phone', '')
        )
        
        # Create order items
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                unit_price=cart_item.price,
                total_price=cart_item.quantity * cart_item.price,
                product_name=cart_item.product.name
            )
        
        # Clear cart
        cart_items.delete()
        
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for order management (read-only for customers).
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order"""
        order = self.get_object()
        
        if order.status in ['delivered', 'cancelled']:
            return Response(
                {'error': 'Cannot cancel this order'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'cancelled'
        order.save()
        
        return Response({'message': 'Order cancelled successfully'})

    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """Get user's orders with filtering"""
        orders = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)


class WishlistViewSet(viewsets.ModelViewSet):
    """
    ViewSet for wishlist management.
    """
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Add or remove product from wishlist"""
        product_id = request.data.get('product_id')
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        wishlist_item = Wishlist.objects.filter(
            user=request.user, 
            product=product
        ).first()
        
        if wishlist_item:
            wishlist_item.delete()
            return Response({'message': 'Product removed from wishlist', 'in_wishlist': False})
        else:
            Wishlist.objects.create(user=request.user, product=product)
            return Response({'message': 'Product added to wishlist', 'in_wishlist': True})