from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in

@receiver(user_logged_in)
def track_user_login(sender, request, user, **kwargs):
    user.login()