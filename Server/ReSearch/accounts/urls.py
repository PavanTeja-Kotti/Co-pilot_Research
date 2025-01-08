from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile endpoints
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('change-password/',views. ChangePasswordView.as_view(), name='change-password'),
    path('check-auth/', views.check_auth_status, name='check-auth'),


    # Admin management endpoints
    path('users/', views.UserManagementView.as_view(), name='user-management'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user-detail'),
]