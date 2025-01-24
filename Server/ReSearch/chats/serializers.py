from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Chat, 
    GroupChat, 
    Message, 
    MessageAttachment, 
    GroupMembership, 
    MessageReceipt,
    UserChatNote
)

User = get_user_model()

class UserChatNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserChatNote
        fields = ['title', 'notes']

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information serializer"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_image', 'is_active', "first_name","last_name"]
        read_only_fields = ['email', 'is_active']

class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for message attachments"""
    class Meta:
        model = MessageAttachment
        fields = ['id', 'file','file_path','file_name', 'file_size', 'file_type', 'created_at']
        read_only_fields = ['created_at']

    def validate_file_size(self, value):
        """Validate file size (example: max 10MB)"""
        max_size = 10 * 1024 * 1024  # 10MB
        if value > max_size:
            raise serializers.ValidationError('File size cannot exceed 10MB')
        return value

class MessageReceiptSerializer(serializers.ModelSerializer):
    """Serializer for message receipt status"""
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = MessageReceipt
        fields = ['id', 'user', 'delivered_at', 'read_at']
        read_only_fields = ['delivered_at', 'read_at']

class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender = UserBasicSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, required=False)
    receipts = MessageReceiptSerializer(many=True, read_only=True)
    reply_to_message = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'text_content', 'content', 'message_type',
            'status', 'attachments', 'reply_to', 'reply_to_message',
            'created_at', 'updated_at', 'deleted_at', 'receipts', 'metadata'
        ]
        read_only_fields = ['sender', 'status', 'created_at', 'updated_at', 'deleted_at']

    def get_reply_to_message(self, obj):
        """Get basic information about the replied message"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'text_content': obj.reply_to.text_content,
                'sender': UserBasicSerializer(obj.reply_to.sender).data,
                'message_type': obj.reply_to.message_type
            }
        return None

    def create(self, validated_data):
        attachments_data = validated_data.pop('attachments', [])
        # Support both DRF view and WebSocket context
        sender = self.context.get('request', {}).user if hasattr(self.context.get('request'), 'user') else self.context.get('user')
        
        if not sender:
            raise serializers.ValidationError("User context is required for message creation")
        
        message = Message.objects.create(sender=sender, **validated_data)
        
        for attachment_data in attachments_data:
            attachment = MessageAttachment.objects.create(**attachment_data)
            message.attachments.add(attachment)
        
        return message

class GroupMembershipSerializer(serializers.ModelSerializer):
    """Serializer for group membership"""
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'joined_at', 'left_at', 'muted_until', 'is_active']
        read_only_fields = ['joined_at', 'left_at']

class ChatSerializer(serializers.ModelSerializer):
    """Serializer for private chats"""
    participants = UserBasicSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            'id', 'participants', 'created_at', 'updated_at',
            'last_message_at', 'is_active', 'last_message', 'unread_count','messages'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_message_at']
    
    def get_messages(self, obj):
        messages = getattr(obj, 'recent_messages', [])[:20]
        return MessageSerializer(messages, many=True).data

    def get_user_from_context(self):
        """Flexible method to extract user from context"""
        # Try to get user from request in DRF views
        if hasattr(self.context.get('request'), 'user'):
            return self.context['request'].user
        # Fallback to direct user in WebSocket context
        return self.context.get('user')

    def get_last_message(self, obj):
        """Get the last message in the chat"""
        last_message = obj.messages.filter(deleted_at__isnull=True).first()
        if last_message:
            return MessageSerializer(last_message).data
        return None

    def get_unread_count(self, obj):
        """Get count of unread messages for the current user"""
        user = self.get_user_from_context()
        if not user:
            return 0
        
        return obj.messages.filter(
            receipts__user=user,
            receipts__read_at__isnull=True,
            deleted_at__isnull=True
        ).count()

class GroupChatSerializer(serializers.ModelSerializer):
    """Serializer for group chats"""
    creator = UserBasicSerializer(read_only=True)
    admins = UserBasicSerializer(many=True, read_only=True)
    members = GroupMembershipSerializer(source='groupmembership_set', many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()

    class Meta:
        model = GroupChat
        fields = [
            'id', 'name', 'description', 'image', 'creator', 'admins',
            'members', 'created_at', 'updated_at', 'last_message_at',
            'is_active', 'last_message', 'unread_count','messages'
        ]
        read_only_fields = ['creator', 'created_at', 'updated_at', 'last_message_at']
    
    def get_messages(self, obj):
        messages = getattr(obj, 'recent_messages', [])[:20]
        return MessageSerializer(messages, many=True).data

    def get_user_from_context(self):
        """Flexible method to extract user from context"""
        # Try to get user from request in DRF views
        if hasattr(self.context.get('request'), 'user'):
            return self.context['request'].user
        # Fallback to direct user in WebSocket context
        return self.context.get('user')

    def get_last_message(self, obj):
        """Get the last message in the group"""
        last_message = obj.messages.filter(deleted_at__isnull=True).first()
        if last_message:
            return MessageSerializer(last_message).data
        return None

    def get_unread_count(self, obj):
        """Get count of unread messages for the current user"""
        user = self.get_user_from_context()
        if not user:
            return 0
        
        return obj.messages.filter(
            receipts__user=user,
            receipts__read_at__isnull=True,
            deleted_at__isnull=True
        ).count()

# Serializer for creating/updating messages
class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new messages"""
    attachments = MessageAttachmentSerializer(many=True, required=False)

    class Meta:
        model = Message
        fields = [
            'chat', 'group_chat', 'text_content', 'content',
            'message_type', 'reply_to', 'attachments', 'metadata'
        ]

    def create(self, validated_data):
        """
        Create method that works with both request and direct user context
        """
        # Support both DRF view and WebSocket context
        sender = self.context.get('request', {}).user if hasattr(self.context.get('request'), 'user') else self.context.get('user')
        
        if not sender:
            raise serializers.ValidationError("User context is required for message creation")

        attachments_data = validated_data.pop('attachments', [])
        message = Message.objects.create(sender=sender, **validated_data)
        
        # Create message receipts for all participants
        if message.chat:
            participants = message.chat.participants.all()
        else:
            participants = message.group_chat.members.all()
            
        for participant in participants:
            if participant != message.sender:
                MessageReceipt.objects.create(
                    message=message,
                    user=participant
                )
        # Handle attachments
        for attachment_data in attachments_data:
            attachment = MessageAttachment.objects.create(**attachment_data)
            message.attachments.add(attachment)
        
        return message

    def validate(self, data):
        """Validate that either chat or group_chat is provided, but not both"""
        chat = data.get('chat')
        group_chat = data.get('group_chat')
        
        if not chat and not group_chat:
            raise serializers.ValidationError(
                "Either chat or group_chat must be provided"
            )
        if chat and group_chat:
            raise serializers.ValidationError(
                "Message can't belong to both private and group chat"
            )
            
        return data