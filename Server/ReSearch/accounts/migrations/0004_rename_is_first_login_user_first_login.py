# Generated by Django 5.1.4 on 2025-01-09 08:49

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_is_first_login_user_last_login_at'),
    ]

    operations = [
        migrations.RenameField(
            model_name='user',
            old_name='is_first_login',
            new_name='first_login',
        ),
    ]