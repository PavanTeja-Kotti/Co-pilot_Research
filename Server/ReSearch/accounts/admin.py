from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 
                   'date_joined', 'last_login_at', 'first_login')
    list_filter = ('is_staff', 'is_active', 'date_joined', 'first_login')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'profile_image', 'bio')}),
        ('Login info', {'fields': ('last_login_at', 'first_login')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'first_name', 'last_name', 
                      'profile_image', 'bio', 'is_staff', 'is_active')}
        ),
    )

    readonly_fields = ('profile_image_preview', 'last_login_at', 'first_login')

    def profile_image_preview(self, obj):
        if obj.profile_image:
            return f'<img src="data:image/jpeg;base64,{obj.profile_image}" width="150" height="150" />'
        return 'No image uploaded'
    profile_image_preview.allow_tags = True
    profile_image_preview.short_description = 'Profile Image Preview'

admin.site.register(User, CustomUserAdmin)