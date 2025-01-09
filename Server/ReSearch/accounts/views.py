from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    LoginSerializer,
    UpdateUserSerializer,
    AdminUpdateUserSerializer
)
from .models import User

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
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
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
        # Choose serializer based on user role
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

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update user profile including profile image and bio
    """
    SerializerClass = AdminUpdateUserSerializer if request.user.is_superuser else UpdateUserSerializer
    serializer = SerializerClass(request.user, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(request.user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({
            'error': 'Invalid old password'
        }, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({
        'message': 'Password changed successfully'
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_auth_status(request):
    return Response({
        'isAuthenticated': True,
        'user': UserSerializer(request.user).data
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
