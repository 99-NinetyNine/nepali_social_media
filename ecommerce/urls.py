from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, CategoryViewSet, CartViewSet, 
    OrderViewSet, WishlistViewSet
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')

urlpatterns = [
    # Include all ViewSet routes
    path('', include(router.urls)),
]