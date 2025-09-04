from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import math

User = get_user_model()


class Driver(models.Model):
    VEHICLE_TYPES = [
        ('bicycle', 'Bicycle'),
        ('motorcycle', 'Motorcycle'),
        ('car', 'Car'),
        ('truck', 'Truck'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Application Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
        ('inactive', 'Inactive'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    
    # Personal documents
    citizenship_number = models.CharField(max_length=50)
    citizenship_photo = models.ImageField(upload_to='driver_docs/citizenship/')
    driving_license_number = models.CharField(max_length=50)
    driving_license_photo = models.ImageField(upload_to='driver_docs/license/')
    profile_photo = models.ImageField(upload_to='driver_docs/photos/')
    
    # Vehicle information
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)
    vehicle_model = models.CharField(max_length=100)
    vehicle_number_plate = models.CharField(max_length=20)
    vehicle_photo = models.ImageField(upload_to='driver_docs/vehicles/')
    vehicle_registration = models.ImageField(upload_to='driver_docs/registration/')
    
    # Status and ratings
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_online = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    
    # Location (current)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    
    # Performance metrics
    total_deliveries = models.PositiveIntegerField(default=0)
    successful_deliveries = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Penalties
    violation_count = models.PositiveIntegerField(default=0)
    penalty_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    def get_success_rate(self):
        if self.total_deliveries == 0:
            return 0
        return (self.successful_deliveries / self.total_deliveries) * 100

    def calculate_distance_from_point(self, lat, lng):
        if not self.current_latitude or not self.current_longitude:
            return float('inf')
        
        # Haversine formula
        R = 6371  # Earth's radius in km
        
        lat1, lon1 = float(self.current_latitude), float(self.current_longitude)
        lat2, lon2 = float(lat), float(lng)
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c

    def __str__(self):
        return f"Driver {self.user.username} - {self.vehicle_type}"


class DeliveryOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Assignment'),
        ('assigned', 'Assigned to Driver'),
        ('picked_up', 'Picked Up'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('failed', 'Delivery Failed'),
        ('cancelled', 'Cancelled'),
    ]

    delivery_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    ecommerce_order = models.OneToOneField(
        'ecommerce.Order', 
        on_delete=models.CASCADE, 
        related_name='delivery'
    )
    driver = models.ForeignKey(
        Driver, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='deliveries'
    )
    
    # Pickup location (usually store/restaurant)
    pickup_address = models.TextField()
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_phone = models.CharField(max_length=20)
    pickup_instructions = models.TextField(blank=True)
    
    # Delivery location
    delivery_address = models.TextField()
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    delivery_phone = models.CharField(max_length=20)
    delivery_instructions = models.TextField(blank=True)
    
    # Distance and fees
    distance_km = models.DecimalField(max_digits=6, decimal_places=2)
    base_fee = models.DecimalField(max_digits=8, decimal_places=2, default=50.00)
    distance_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    total_delivery_fee = models.DecimalField(max_digits=8, decimal_places=2)
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    estimated_pickup_time = models.DateTimeField(null=True, blank=True)
    estimated_delivery_time = models.DateTimeField(null=True, blank=True)
    
    # Actual times
    assigned_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Additional info
    special_instructions = models.TextField(blank=True)
    priority_level = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def calculate_delivery_fee(self):
        # Base fee + distance-based fee (NPR 10 per km)
        self.distance_fee = self.distance_km * 10
        self.total_delivery_fee = self.base_fee + self.distance_fee
        return self.total_delivery_fee

    def __str__(self):
        return f"Delivery {self.delivery_id} - {self.status}"


class DeliveryTracking(models.Model):
    delivery = models.ForeignKey(DeliveryOrder, on_delete=models.CASCADE, related_name='tracking')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    status_note = models.CharField(max_length=200, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Tracking for {self.delivery.delivery_id} at {self.timestamp}"


class DeliveryRating(models.Model):
    delivery = models.OneToOneField(DeliveryOrder, on_delete=models.CASCADE, related_name='rating')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_ratings_given')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='ratings_received')
    
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback = models.TextField(blank=True)
    
    # Rating categories
    speed_rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=5)
    politeness_rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=5)
    care_rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=5)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating}★ rating for delivery {self.delivery.delivery_id}"


class DriverViolation(models.Model):
    VIOLATION_TYPES = [
        ('late_delivery', 'Late Delivery'),
        ('no_show', 'No Show'),
        ('rude_behavior', 'Rude Behavior'),
        ('damaged_goods', 'Damaged Goods'),
        ('wrong_delivery', 'Wrong Delivery Address'),
        ('vehicle_issue', 'Vehicle Related Issue'),
        ('other', 'Other'),
    ]

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='violations')
    delivery = models.ForeignKey(DeliveryOrder, on_delete=models.CASCADE, related_name='violations')
    violation_type = models.CharField(max_length=30, choices=VIOLATION_TYPES)
    description = models.TextField()
    penalty_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    is_resolved = models.BooleanField(default=False)
    
    reported_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='violation_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Violation: {self.violation_type} - Driver {self.driver.user.username}"


class DeliveryZone(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Zone boundaries (simplified as center point + radius)
    center_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    center_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    radius_km = models.DecimalField(max_digits=6, decimal_places=2, default=20.00)
    
    base_delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=50.00)
    per_km_rate = models.DecimalField(max_digits=6, decimal_places=2, default=10.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_location_in_zone(self, lat, lng):
        # Calculate distance from center
        R = 6371  # Earth's radius in km
        
        lat1, lon1 = float(self.center_latitude), float(self.center_longitude)
        lat2, lon2 = float(lat), float(lng)
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        distance = R * c
        return distance <= float(self.radius_km)

    def __str__(self):
        return self.name