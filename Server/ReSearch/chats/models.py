from django.db import models
from django.utils import timezone
from django.conf import settings
import uuid

class MessageStatus(models.TextChoices):
    """Enum for message status"""
    SENT = 'SENT', 'Sent'
    DELIVERED = 'DELIVERED', 'Delivered'
    READ = 'READ', 'Read'
    DELETED = 'DELETED', 'Deleted'

class MessageType(models.TextChoices):
    """Enum for message types"""
    TEXT = 'TEXT', 'Text Message'
    IMAGE = 'IMAGE', 'Image Message'
    VIDEO = 'VIDEO', 'Video Message'
    AUDIO = 'AUDIO', 'Audio Message'
    DOCUMENT = 'DOCUMENT', 'Document'
    LOCATION = 'LOCATION', 'Location'
    CONTACT = 'CONTACT', 'Contact'
    STICKER = 'STICKER', 'Sticker'
    SYSTEM = 'SYSTEM', 'System Message'

class BaseChat(models.Model):
    """Abstract base model for chat functionality"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True

class Chat(BaseChat):
    """Model for one-to-one chats between users"""
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='private_chats',
        help_text="Users participating in the chat"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['-last_message_at']),
        ]

    def __str__(self):
        participants = self.participants.all()
        return f"Chat between {', '.join([str(p) for p in participants])}"
    
    def hard_delete(self):
        """Hard delete the chat and associated messages"""
        self.delete();  # Delete the chat

class GroupChat(BaseChat):
    """Model for group chats"""
    name = models.CharField(max_length=255, help_text="Name of the group")
    description = models.TextField(blank=True, null=True)
    image = models.TextField(
        blank=True, 
        null=True, 
        help_text="Base64 encoded group image"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_groups'
    )
    admins = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='admin_of_groups'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='GroupMembership',
        related_name='group_chats'
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['-last_message_at']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"Group: {self.name}"
    
    def hard_delete(self):
        """Hard delete the group chat and associated messages"""
        self.delete();

class GroupMembership(models.Model):
    """Model to track group chat membership details"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    muted_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['user', 'group']
        indexes = [
            models.Index(fields=['user', 'group', 'is_active']),
        ]

class MessageAttachment(models.Model):
    """Model for message attachments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.TextField(help_text="Base64 encoded file content", null=True, blank=True)
    file_path = models.CharField(
        max_length=512, 
        help_text="Path to the stored file on disk or cloud storage"
    )
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    file_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} ({self.file_type})"

class Message(models.Model):
    """Model for chat messages"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='messages'
    )
    group_chat = models.ForeignKey(
        GroupChat,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_messages'
    )
    content = models.JSONField(
        default=dict,
        help_text="JSON field to store different types of content"
    )
    text_content = models.TextField(
        null=True,
        blank=True,
        help_text="Optional text content of the message"
    )
    attachments = models.ManyToManyField(
        MessageAttachment,
        related_name='messages',
        blank=True
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT
    )
    status = models.CharField(
        max_length=20,
        choices=MessageStatus.choices,
        default=MessageStatus.SENT
    )
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    metadata = models.JSONField(
        default=dict,
        help_text="Additional metadata for the message"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['chat', '-created_at']),
            models.Index(fields=['group_chat', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        chat_type = "group" if self.group_chat else "private"
        return f"{chat_type} message from {self.sender}"

    def soft_delete(self):
        """Soft delete the message"""
        self.deleted_at = timezone.now()
        self.status = MessageStatus.DELETED
        self.save(update_fields=['deleted_at', 'status'])

    def mark_as_delivered(self):
        """Mark message as delivered"""
        if self.status == MessageStatus.SENT:
            self.status = MessageStatus.DELIVERED
            self.save(update_fields=['status'])

    def mark_as_read(self):
        """Mark message as read"""
        if self.status in [MessageStatus.SENT, MessageStatus.DELIVERED]:
            self.status = MessageStatus.READ
            self.save(update_fields=['status'])

class MessageReceipt(models.Model):
    """Model to track message read/delivery status per user"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='receipts'
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['message', 'user']),
            models.Index(fields=['user', '-read_at']),
        ]

    def mark_as_delivered(self):
        """Mark message as delivered for this user"""
        if not self.delivered_at:
            self.delivered_at = timezone.now()
            self.save(update_fields=['delivered_at'])

    def mark_as_read(self):
        """Mark message as read for this user"""
        if not self.read_at:
            self.read_at = timezone.now()
            if not self.delivered_at:
                self.delivered_at = self.read_at
            self.save(update_fields=['read_at', 'delivered_at'])