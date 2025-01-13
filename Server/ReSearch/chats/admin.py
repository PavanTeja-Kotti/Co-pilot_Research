# admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Chat, GroupChat, Message, MessageReceipt, GroupMembership,MessageAttachment

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_participants', 'created_at', 'is_active', 'last_message_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('participants__email', 'participants__username')
    readonly_fields = ('created_at', 'updated_at', 'last_message_at')
    
    def get_participants(self, obj):
        return ", ".join([user.username for user in obj.participants.all()])
    get_participants.short_description = 'Participants'

@admin.register(GroupChat)
class GroupChatAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'created_at', 'is_active', 'member_count', 'last_message_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description', 'creator__email', 'members__email')
    readonly_fields = ('created_at', 'updated_at', 'last_message_at')
    
    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'get_chat', 'message_type', 'created_at', 'is_read', 'get_message_preview')
    list_filter = ('message_type', 'created_at', 'status')
    search_fields = ('sender__email', 'text_content')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_chat(self, obj):
        if obj.chat:
            return f'Private: {obj.chat}'
        return f'Group: {obj.group_chat}'
    get_chat.short_description = 'Chat'
    
    def get_message_preview(self, obj):
        if obj.text_content:
            return obj.text_content[:50] + '...' if len(obj.text_content) > 50 else obj.text_content
        return 'No text content'
    get_message_preview.short_description = 'Message Preview'
    
    def is_read(self, obj):
        return obj.status == 'READ'
    is_read.boolean = True
    is_read.short_description = 'Read'

@admin.register(MessageReceipt)
class MessageReceiptAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'delivered_at', 'read_at')
    list_filter = ('delivered_at', 'read_at')
    search_fields = ('user__email', 'message__text_content')
    readonly_fields = ('delivered_at', 'read_at')

@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'group', 'joined_at', 'left_at', 'is_active')
    list_filter = ('is_active', 'joined_at', 'left_at')
    search_fields = ('user__email', 'group__name')
    readonly_fields = ('joined_at', 'left_at')

@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'file_name', 'file_type', 'file_size_display', 'created_at', 'get_file_path')
    list_filter = ('file_type', 'created_at')
    search_fields = ('file_name', 'file_type', 'file_path')
    readonly_fields = ('created_at',)

    def file_size_display(self, obj):
        """Display file size in a human-readable format"""
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    file_size_display.short_description = 'File Size'

    def get_file_path(self, obj):
        """Display file path with truncation if too long"""
        if obj.file_path:
            if len(obj.file_path) > 50:
                return f"{obj.file_path[:25]}...{obj.file_path[-25:]}"
            return obj.file_path
        return "No path specified"
    get_file_path.short_description = 'File Path'

# Optional: Custom admin site configuration
class ChatAdminSite(admin.AdminSite):
    site_header = 'Chat Administration'
    site_title = 'Chat Admin Portal'
    index_title = 'Chat Management'

# Optional: Register with custom admin site
# chat_admin_site = ChatAdminSite(name='chat_admin')
# chat_admin_site.register(Chat, ChatAdmin)
# chat_admin_site.register(GroupChat, GroupChatAdmin)
# chat_admin_site.register(Message, MessageAdmin)
# chat_admin_site.register(MessageReceipt, MessageReceiptAdmin)
# chat_admin_site.register(GroupMembership, GroupMembershipAdmin)