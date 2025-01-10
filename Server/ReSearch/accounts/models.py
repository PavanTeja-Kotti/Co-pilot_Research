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