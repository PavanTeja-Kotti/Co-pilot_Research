from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone

class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, username, password, **extra_fields)

class NotificationType(models.TextChoices):
    """Enum for different types of notifications"""
    SYSTEM = 'SYSTEM', 'System Notification'
    ALERT = 'ALERT', 'Alert'
    MESSAGE = 'MESSAGE', 'Message'
    UPDATE = 'UPDATE', 'Update'
    OTHER = 'OTHER', 'Other'

class NotificationManager(models.Manager):
    """Custom manager to handle soft deletes"""
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def with_deleted(self):
        """Include soft-deleted records"""
        return super().get_queryset()

    def only_deleted(self):
        """Get only soft-deleted records"""
        return super().get_queryset().filter(deleted_at__isnull=False)

class User(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    profile_image = models.TextField(blank=True, null=True, help_text="Base64 encoded profile image")
    bio = models.TextField(blank=True, null=True, help_text="User biography")
    last_login_at = models.DateTimeField(null=True, blank=True)
    first_login = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

    def login(self):
        """Update login-related fields when user logs in"""
        if self.first_login:
            self.first_login = False
            self.save(update_fields=['first_login'])
        self.last_login_at = timezone.now()
        self.save(update_fields=['last_login_at'])

    def save(self, *args, **kwargs):
        if self._state.adding:  # Only on first save/creation
            self.first_login = True
        super().save(*args, **kwargs)

    def get_unread_notifications_count(self):
        """Get count of unread notifications for the user"""
        return self.notifications.filter(is_read=False, deleted_at__isnull=True).count()

    def get_all_notifications(self, include_deleted=False):
        """Get all notifications for the user, optionally including deleted ones"""
        if include_deleted:
            return self.notifications.all()
        return self.notifications.filter(deleted_at__isnull=True)

class Notification(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="User who receives the notification"
    )
    title = models.CharField(
        max_length=255,
        help_text="Title of the notification"
    )
    message = models.TextField(
        help_text="Content of the notification"
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        help_text="Type of notification"
    )
    is_read = models.BooleanField(
        default=False,
        help_text="Whether the notification has been read"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the notification was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the notification was last updated"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the notification was read"
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Soft delete timestamp"
    )
    
    # Define managers
    objects = NotificationManager()  # Default manager (excludes soft-deleted items)
    all_objects = models.Manager()   # Include all objects including soft-deleted

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read', 'deleted_at']),
        ]

    def __str__(self):
        return f"{self.notification_type}: {self.title} for {self.user.email}"

    def soft_delete(self):
        """Soft delete the notification"""
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def restore(self):
        """Restore a soft-deleted notification"""
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])

    def mark_as_read(self):
        """Mark the notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    def mark_as_unread(self):
        """Mark the notification as unread"""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])