from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

app_name = 'accounts'


urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('profile/', views.user_profile, name='user-profile'),
    path('auth-status/', views.check_auth_status, name='auth-status'),
    path('users/', views.user_management, name='user-management'),
    path('users/<int:user_id>/', views.user_detail, name='user-detail'),
]