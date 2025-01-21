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
    path('search/', views.search, name='search'),  # No query provided
    path('search/<str:query>/', views.search, name='search_with_query'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),


    path('notifications/', views.user_notifications, name='user-notifications'),
    path('notifications/mark-all/', views.mark_all_notifications, name='mark-all-notifications'),
    path('notifications/<str:notification_id>/mark/', views.mark_notification, name='mark-notification'),
    path('notifications/<str:notification_id>/delete/', views.delete_notification, name='delete-notification'),
    path('notifications/<str:notification_id>/restore/', views.restore_notification, name='restore-notification'),

    # Admin notification endpoints
    path('admin/notifications/', views.admin_notifications, name='admin-notifications'),
    path('admin/notifications/<str:notification_id>/', views.admin_notification_detail, name='admin-notification-detail'),
]