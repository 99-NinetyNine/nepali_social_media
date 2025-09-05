#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('/home/acer/social_media')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'social_media.settings')
django.setup()

from django.contrib.auth import get_user_model
from ecommerce.models import Category, Product, ProductImage
from decimal import Decimal

User = get_user_model()

def create_sample_data():
    print("Creating sample shop data...")
    
    # Get or create a business user to be the seller
    try:
        seller = User.objects.filter(is_business=True).first()
        if not seller:
            seller = User.objects.create_user(
                username='shop_owner',
                email='shop@example.com',
                password='password123',
                is_business=True
            )
            print(f"Created business user: {seller.username}")
        else:
            print(f"Using existing business user: {seller.username}")
    except Exception as e:
        print(f"Error creating/finding seller: {e}")
        return
    
    # Create categories
    categories_data = [
        {'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
        {'name': 'Clothing', 'description': 'Fashion and apparel'},
        {'name': 'Food & Beverages', 'description': 'Fresh food and drinks'},
        {'name': 'Books', 'description': 'Books and educational materials'},
        {'name': 'Home & Garden', 'description': 'Home improvement and gardening'},
    ]
    
    categories = {}
    for cat_data in categories_data:
        category, created = Category.objects.get_or_create(
            name=cat_data['name'],
            defaults={'description': cat_data['description']}
        )
        categories[cat_data['name']] = category
        print(f"{'Created' if created else 'Found'} category: {category.name}")
    
    # Create products
    products_data = [
        {
            'name': 'Samsung Galaxy S24',
            'description': 'Latest Samsung smartphone with advanced camera features',
            'category': 'Electronics',
            'product_type': 'electronics',
            'price': Decimal('999.99'),
            'original_price': Decimal('1199.99'),
            'stock_quantity': 50,
            'is_featured': True
        },
        {
            'name': 'Nike Air Max',
            'description': 'Comfortable running shoes for everyday wear',
            'category': 'Clothing',
            'product_type': 'clothing',
            'price': Decimal('129.99'),
            'stock_quantity': 25
        },
        {
            'name': 'Fresh Pizza Margherita',
            'description': 'Delicious homemade pizza with fresh ingredients',
            'category': 'Food & Beverages',
            'product_type': 'food_realtime',
            'price': Decimal('15.99'),
            'stock_quantity': 100,
            'is_realtime_delivery': True,
            'preparation_time': 25
        },
        {
            'name': 'Python Programming Book',
            'description': 'Learn Python programming from scratch',
            'category': 'Books',
            'product_type': 'books',
            'price': Decimal('39.99'),
            'original_price': Decimal('49.99'),
            'stock_quantity': 15
        },
        {
            'name': 'Garden Tools Set',
            'description': 'Complete set of gardening tools for home use',
            'category': 'Home & Garden',
            'product_type': 'home_garden',
            'price': Decimal('79.99'),
            'stock_quantity': 30,
            'is_featured': True
        }
    ]
    
    for product_data in products_data:
        category_name = product_data.pop('category')
        category = categories[category_name]
        
        try:
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                defaults={
                    **product_data,
                    'category': category,
                    'seller': seller
                }
            )
            print(f"{'Created' if created else 'Found'} product: {product.name}")
        except Exception as e:
            print(f"Error creating product {product_data['name']}: {e}")
    
    print("Sample shop data creation completed!")
    print(f"Total categories: {Category.objects.count()}")
    print(f"Total products: {Product.objects.count()}")

if __name__ == '__main__':
    create_sample_data()