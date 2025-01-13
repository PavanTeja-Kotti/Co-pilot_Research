from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    LoginSerializer,
    UpdateUserSerializer,
    AdminUpdateUserSerializer,
    NotificationSerializer,
    NotificationDetailSerializer,
    CreateNotificationSerializer,
    UpdateNotificationSerializer,
    NotificationListSerializer
)
from .models import User, Notification
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Registration successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            request,
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        if user:
            refresh = RefreshToken.for_user(user)
            
            # Store first_login value before updating
            is_first_time = user.first_login
            
            # Update login status
            user.login()

            user_data = UserSerializer(user).data
            user_data['first_login'] = is_first_time
            
            return Response({
                'message': 'Login successful',
                'user': user_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
            })
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({
            'message': 'Logged out successfully'
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        SerializerClass = AdminUpdateUserSerializer if request.user.is_superuser else UpdateUserSerializer
        serializer = SerializerClass(request.user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        user = request.user
        user.is_active = False
        user.save()
        return Response({
            'message': 'User deactivated successfully'
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_auth_status(request):
    return Response({
        'isAuthenticated': True,
        'user': UserSerializer(request.user).data,
        'first_time_login': request.user.first_login
    })

# Admin only views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_management(request):
    if not request.user.is_staff:
        return Response({
            'error': 'Permission denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    if not request.user.is_staff:
        return Response({
            'error': 'Permission denied'
        }, status=status.HTTP_403_FORBIDDEN)

    user = get_object_or_404(User, id=user_id)

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = AdminUpdateUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        user.is_active = False
        user.save()
        return Response({
            'message': f'User {user.email} deactivated successfully'
        })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search(request, query=None):
    if query:
        users = User.objects.filter(
            Q(email__icontains=query) | 
            Q(username__icontains=query) | 
            Q(first_name__icontains=query),
            is_active=True
        ).exclude(id=request.user.id).distinct()
    else:
        users = User.objects.filter(is_active=True).exclude(id=request.user.id)[:20]  # Return 20 users if no query

    user_data = list(users.values(
        'id', 'email', 'username', 'first_name', 'last_name', 
        'profile_image'
    ))

    return Response(user_data)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_notifications(request):
    """Get user's notifications with optional filters"""
    is_read = request.query_params.get('is_read')
    include_deleted = request.query_params.get('include_deleted') == 'true'
    
    notifications = request.user.notifications.all()
    
    if is_read is not None:
        is_read = is_read.lower() == 'true'
        notifications = notifications.filter(is_read=is_read)
    
    if not include_deleted:
        notifications = notifications.filter(deleted_at__isnull=True)
        
    notifications = notifications.order_by('-created_at')
    
    serializer = NotificationListSerializer(notifications, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification(request, notification_id):
    """Mark notification as read/unread"""
    action = request.data.get('action')
    notification = get_object_or_404(
        Notification.objects.filter(user=request.user), 
        id=notification_id
    )
    
    if action == 'read':
        notification.mark_as_read()
    elif action == 'unread':
        notification.mark_as_unread()
    else:
        return Response(
            {'error': 'Invalid action. Use "read" or "unread".'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return Response(NotificationSerializer(notification).data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Soft delete a notification"""
    notification = get_object_or_404(
        Notification.objects.filter(user=request.user), 
        id=notification_id
    )
    
    notification.soft_delete()
    return Response({'message': 'Notification deleted successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_notification(request, notification_id):
    """Restore a soft-deleted notification"""
    notification = get_object_or_404(
        Notification.all_objects.filter(user=request.user), 
        id=notification_id
    )
    
    notification.restore()
    return Response(NotificationSerializer(notification).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications(request):
    """Mark all notifications as read"""
    notifications = request.user.notifications.filter(
        is_read=False,
        deleted_at__isnull=True
    )
    
    for notification in notifications:
        notification.mark_as_read()
    
    return Response({'message': 'All notifications marked as read'})

# Admin Notification Management Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_notifications(request):
    """Admin endpoint to manage notifications"""
    if not request.user.is_staff:
        return Response(
            {'error': 'Permission denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        # Get all notifications with optional filters
        user_id = request.query_params.get('user_id')
        include_deleted = request.query_params.get('include_deleted') == 'true'
        
        notifications = Notification.all_objects.all() if include_deleted else Notification.objects.all()
        
        if user_id:
            notifications = notifications.filter(user_id=user_id)
            
        notifications = notifications.order_by('-created_at')
        serializer = NotificationDetailSerializer(notifications, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new notification
        serializer = CreateNotificationSerializer(data=request.data)
        if serializer.is_valid():
            notification = serializer.save()
            return Response(
                NotificationDetailSerializer(notification).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_notification_detail(request, notification_id):
    """Admin endpoint to manage individual notifications"""
    if not request.user.is_staff:
        return Response(
            {'error': 'Permission denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    notification = get_object_or_404(Notification.all_objects, id=notification_id)
    
    if request.method == 'GET':
        serializer = NotificationDetailSerializer(notification)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = UpdateNotificationSerializer(
            notification, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            notification = serializer.save()
            return Response(NotificationDetailSerializer(notification).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Hard delete for admin
        notification.delete()
        return Response(
            {'message': 'Notification permanently deleted'}, 
            status=status.HTTP_200_OK
        )