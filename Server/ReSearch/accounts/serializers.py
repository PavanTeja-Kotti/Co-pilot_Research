from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from .models import Notification, NotificationType

User = get_user_model()

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'title', 'message', 'notification_type', 'is_read',
            'created_at', 'updated_at', 'read_at'
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'read_at'
        )

class NotificationDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'user', 'title', 'message', 'notification_type',
            'is_read', 'created_at', 'updated_at', 'read_at', 'deleted_at'
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'read_at', 'deleted_at'
        )

class UserSerializer(serializers.ModelSerializer):
    unread_notifications_count = serializers.SerializerMethodField()
    notifications = NotificationSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'profile_image', 'bio', 'first_login', 'last_login_at',
            'unread_notifications_count', 'notifications'
        )
        read_only_fields = ('id', 'first_login', 'last_login_at')

    def get_unread_notifications_count(self, obj):
        return obj.get_unread_notifications_count()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'password', 'password_confirm',
            'first_name', 'last_name', 'profile_image', 'bio'
        )
        read_only_fields = ('id',)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise ValidationError("Passwords don't match")
        
        if 'profile_image' in data:
            try:
                import base64
                base64.b64decode(data['profile_image'])
            except Exception:
                raise ValidationError("Invalid base64 string for profile image")
            
            if len(data['profile_image']) > 5 * 1024 * 1024:  # 5MB limit
                raise ValidationError("Profile image size should not exceed 5MB")
        
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(**validated_data)

class UpdateUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(read_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'profile_image', 'bio', 'username')
        
    def validate_profile_image(self, value):
        if value:
            try:
                import base64
                base64.b64decode(value)
            except Exception:
                raise ValidationError("Invalid base64 string for profile image")
            
            if len(value) > 5 * 1024 * 1024:  # 5MB limit
                raise ValidationError("Profile image size should not exceed 5MB")
        return value

class AdminUpdateUserSerializer(serializers.ModelSerializer):
    notifications = NotificationSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'last_name', 'profile_image', 'bio',
            'is_active', 'is_staff', 'username', 'first_login', 'last_login_at',
            'notifications'
        )
        read_only_fields = ('last_login_at', 'first_login')

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class CreateNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('user', 'title', 'message', 'notification_type')

    def validate_notification_type(self, value):
        if value not in NotificationType.values:
            raise ValidationError(f"Invalid notification type. Must be one of: {', '.join(NotificationType.values)}")
        return value

class UpdateNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('title', 'message', 'notification_type', 'is_read')
        read_only_fields = ('is_read',)

    def validate_notification_type(self, value):
        if value not in NotificationType.values:
            raise ValidationError(f"Invalid notification type. Must be one of: {', '.join(NotificationType.values)}")
        return value

class NotificationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'is_read', 'created_at')
        read_only_fields = fields