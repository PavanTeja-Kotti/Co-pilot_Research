from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile endpoints
    path('profile/', views.user_profile, name='profile'),
    path('change-password/', views.change_password, name='change-password'),
    path('check-auth/', views.check_auth_status, name='check-auth'),

    # Admin management endpoints
    path('users/', views.user_management, name='user-management'),
    path('users/<int:user_id>/', views.user_detail, name='user-detail'),
]