from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 
                 'profile_image', 'bio')
        read_only_fields = ('id',)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'password_confirm', 
                 'first_name', 'last_name', 'profile_image', 'bio')
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
    email = serializers.EmailField(read_only=True)  # Make email read-only by default
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'profile_image', 'bio' ,'username')
        
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
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'profile_image', 'bio', 
                 'is_active', 'is_staff', 'username')

    def validate_profile_image(self, value):
        if value:
            try:
                import base64
                base64.b64decode(value)
            except Exception:
                raise ValidationError("Invalid base64 string for profile image")
            
            if len(value) > 5 * 1024 * 1024:
                raise ValidationError("Profile image size should not exceed 5MB")
        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()