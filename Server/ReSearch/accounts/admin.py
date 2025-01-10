from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User, Notification

class NotificationInline(admin.TabularInline):
    model = Notification
    extra = 0
    fields = ('title', 'message', 'notification_type', 'is_read', 'created_at', 'read_at')
    readonly_fields = ('created_at', 'read_at')
    can_delete = True
    show_change_link = True

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 
                   'date_joined', 'last_login_at', 'first_login', 'unread_notifications_count')
    list_filter = ('is_staff', 'is_active', 'date_joined', 'first_login')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    inlines = [NotificationInline]
    
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'profile_image', 'profile_image_preview', 'bio')}),
        ('Login info', {'fields': ('last_login_at', 'first_login')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Notifications', {'fields': ('unread_notifications_count',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'first_name', 'last_name', 
                      'profile_image', 'bio', 'is_staff', 'is_active')}
        ),
    )

    readonly_fields = ('profile_image_preview', 'last_login_at', 'first_login', 'unread_notifications_count')

    def profile_image_preview(self, obj):
        if obj.profile_image:
            return format_html(
                '<img src="data:image/jpeg;base64,{}" width="150" height="150" style="object-fit: cover; border-radius: 10px;" />',
                obj.profile_image
            )
        return 'No image uploaded'
    profile_image_preview.short_description = 'Profile Image Preview'

    def unread_notifications_count(self, obj):
        count = obj.get_unread_notifications_count()
        return format_html(
            '<span style="color: {};">{}</span>',
            'red' if count > 0 else 'green',
            count
        )
    unread_notifications_count.short_description = 'Unread Notifications'

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_email', 'title', 'notification_type', 'is_read', 
                   'created_at', 'read_at', 'deleted_at')
    list_filter = ('notification_type', 'is_read', 'created_at', 'deleted_at')
    search_fields = ('user__email', 'title', 'message')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        (None, {
            'fields': ('user', 'title', 'message', 'notification_type')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at', 'deleted_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'read_at', 'deleted_at')
    
    actions = ['mark_as_read', 'mark_as_unread', 'soft_delete', 'restore']

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'

    def mark_as_read(self, request, queryset):
        for notification in queryset:
            notification.mark_as_read()
        self.message_user(request, f"{queryset.count()} notifications marked as read")
    mark_as_read.short_description = "Mark selected notifications as read"

    def mark_as_unread(self, request, queryset):
        for notification in queryset:
            notification.mark_as_unread()
        self.message_user(request, f"{queryset.count()} notifications marked as unread")
    mark_as_unread.short_description = "Mark selected notifications as unread"

    def soft_delete(self, request, queryset):
        for notification in queryset:
            notification.soft_delete()
        self.message_user(request, f"{queryset.count()} notifications soft deleted")
    soft_delete.short_description = "Soft delete selected notifications"

    def restore(self, request, queryset):
        for notification in queryset:
            notification.restore()
        self.message_user(request, f"{queryset.count()} notifications restored")
    restore.short_description = "Restore selected notifications"

    def get_queryset(self, request):
        # Show all notifications including soft-deleted ones in admin
        return Notification.all_objects.all()

admin.site.register(User, CustomUserAdmin)