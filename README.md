# Social Media Platform

A comprehensive social media platform with e-commerce capabilities, content monetization, and delivery services.

## 🚀 Features

### Social Media Features
- **Multi-Platform Posts**: Facebook-style posts, LinkedIn professional posts, Instagram stories, YouTube videos and shorts
- **Connections**: Follow, friend, and block system
- **Engagement**: Like, dislike, comment, share functionality
- **Stories**: 24-hour expiring content
- **Hashtags**: Trending topics and content discovery

### Professional Networking
- **Company Profiles**: Business accounts with enhanced features
- **Job Postings**: Recruitment and application system
- **Professional Connections**: LinkedIn-style networking

### E-commerce Marketplace
- **Product Listings**: Multi-category product catalog
- **Shopping Cart**: Full cart management system
- **Order Management**: Complete order lifecycle
- **Real-time Delivery**: Fast delivery for food items
- **Product Reviews**: Customer feedback system

### Content Monetization
- **Creator Earnings**: Revenue from views, likes, shares
- **Ad Revenue**: Advertising revenue sharing
- **Post Boosting**: Paid promotion system
- **Premium Content**: Subscription-based content

### Delivery System
- **Driver Network**: Independent contractor drivers
- **Vehicle Types**: Bicycle, motorcycle, car, truck support
- **Service Area**: 20km radius from Kathmandu, Maitighar
- **Real-time Tracking**: GPS-based delivery tracking
- **Rating System**: Driver and delivery ratings

### Premium Features
- **Ad-free Experience**: No ads for premium users
- **Enhanced Analytics**: Detailed insights
- **Priority Support**: Faster customer service
- **Extended Monetization**: Additional earning opportunities

### Content Moderation
- **Automated Filtering**: AI-powered content screening
- **Manual Review**: Human moderation team
- **Community Reporting**: User-driven content flagging
- **Violation Tracking**: Account violation management

## 🏗️ Architecture

### Backend (Django REST Framework)
```
social_media/
├── accounts/          # User authentication and profiles
├── posts/            # Social media posts and interactions
├── ecommerce/        # E-commerce functionality
├── delivery/         # Delivery and driver management
├── payments/         # Payment processing and subscriptions
├── moderation/       # Content moderation and reporting
└── social_media/     # Main Django settings
```

### Frontend (React TypeScript)
```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   ├── services/     # API services
│   ├── store/        # State management (Zustand)
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
├── public/           # Static assets
└── package.json      # Dependencies and scripts
```

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 4.2.7 + Django REST Framework 3.14.0
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + Celery
- **Payment**: Stripe integration
- **Authentication**: JWT tokens
- **File Storage**: Django file handling
- **API Documentation**: DRF built-in

### Frontend
- **Framework**: React 18.2 + TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios with interceptors
- **Styling**: Tailwind CSS + Headless UI
- **Forms**: React Hook Form + Yup validation
- **Notifications**: React Hot Toast

### Infrastructure
- **Web Server**: Gunicorn + Nginx
- **Process Manager**: Supervisor
- **Monitoring**: Built-in Django logging
- **Security**: CORS headers, CSRF protection

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- Redis 6+

## 🚀 Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   cd /home/acer/social_media
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Database setup**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=social_media_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

REDIS_URL=redis://localhost:6379

STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

### Frontend Configuration

Create a `.env.local` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/auth/profile/` - Get user profile
- `PATCH /api/auth/profile/` - Update user profile

### Posts
- `GET /api/posts/` - List posts
- `POST /api/posts/` - Create post
- `GET /api/posts/{id}/` - Get post details
- `POST /api/posts/{id}/like/` - Like/unlike post
- `POST /api/posts/{id}/share/` - Share post
- `GET /api/posts/{id}/comments/` - Get post comments

### E-commerce
- `GET /api/ecommerce/products/` - List products
- `GET /api/ecommerce/products/{id}/` - Product details
- `POST /api/ecommerce/cart/add/` - Add to cart
- `GET /api/ecommerce/cart/` - Get cart
- `POST /api/ecommerce/orders/` - Create order

### Payments
- `GET /api/payments/plans/` - List premium plans
- `POST /api/payments/subscribe/` - Subscribe to premium
- `GET /api/payments/wallet/` - Get wallet balance
- `POST /api/payments/wallet/add-funds/` - Add funds to wallet

## 🎯 Usage Examples

### Creating a Post
```typescript
const createPost = async (postData: PostForm) => {
  const formData = new FormData();
  formData.append('title', postData.title);
  formData.append('description', postData.description);
  formData.append('post_type', postData.post_type);
  
  const response = await postsApi.createPost(formData);
  return response.data;
};
```

### Adding to Cart
```typescript
const addToCart = async (productId: number, quantity: number) => {
  const response = await shopApi.addToCart(productId, quantity);
  return response.data;
};
```

### Subscribing to Premium
```typescript
const subscribeToPremium = async (planId: number) => {
  const response = await paymentsApi.subscribePremium(planId);
  // Handle Stripe payment intent
  return response.data;
};
```

## 🔒 Security Features

- **Input Validation**: Comprehensive form validation
- **SQL Injection Protection**: Django ORM protections
- **XSS Prevention**: Template auto-escaping
- **CSRF Protection**: Built-in Django middleware
- **Authentication**: JWT token-based auth
- **Authorization**: Role-based permissions
- **Content Moderation**: Automated and manual review
- **Payment Security**: Stripe PCI compliance

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   - Set `DEBUG=False`
   - Configure proper `ALLOWED_HOSTS`
   - Use production database
   - Set up Redis for caching

2. **Static Files**
   ```bash
   python manage.py collectstatic
   ```

3. **Database Migration**
   ```bash
   python manage.py migrate
   ```

4. **Process Management**
   - Use Gunicorn for Django
   - Configure Nginx for reverse proxy
   - Set up Supervisor for process management

5. **Frontend Build**
   ```bash
   npm run build
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions:
- Email: support@socialmedia.com.np
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## 🗺️ Roadmap

### Phase 1 (Completed)
- ✅ User authentication and profiles
- ✅ Basic social media features
- ✅ E-commerce foundation
- ✅ Payment integration
- ✅ Content moderation

### Phase 2 (In Progress)
- 🔄 Real-time notifications
- 🔄 Advanced analytics
- 🔄 Mobile app development
- 🔄 AI-powered recommendations

### Phase 3 (Planned)
- 📋 Video calling features
- 📋 Advanced delivery tracking
- 📋 Multi-language support
- 📋 Advanced creator tools

## ⚡ Performance

- **Response Times**: < 200ms for API calls
- **Caching**: Redis for session and query caching
- **Database**: Optimized queries with indexes
- **CDN**: Static asset delivery optimization
- **Monitoring**: Built-in performance tracking

## 🔍 Testing

### Backend Testing
```bash
python manage.py test
```

### Frontend Testing
```bash
cd frontend
npm test
```

---

**Built with ❤️ for the Nepal social media ecosystem**