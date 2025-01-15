# Generated by Django 5.1.4 on 2025-01-14 13:37

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MessageAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.TextField(blank=True, help_text='Base64 encoded file content', null=True)),
                ('file_path', models.CharField(help_text='Path to the stored file on disk or cloud storage', max_length=512)),
                ('file_name', models.CharField(max_length=255)),
                ('file_size', models.IntegerField()),
                ('file_type', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Chat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('participants', models.ManyToManyField(help_text='Users participating in the chat', related_name='private_chats', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='GroupChat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('name', models.CharField(help_text='Name of the group', max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('image', models.TextField(blank=True, help_text='Base64 encoded group image', null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('admins', models.ManyToManyField(related_name='admin_of_groups', to=settings.AUTH_USER_MODEL)),
                ('creator', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_groups', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='GroupMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('left_at', models.DateTimeField(blank=True, null=True)),
                ('muted_until', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='chats.groupchat')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='groupchat',
            name='members',
            field=models.ManyToManyField(related_name='group_chats', through='chats.GroupMembership', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.JSONField(default=dict, help_text='JSON field to store different types of content')),
                ('text_content', models.TextField(blank=True, help_text='Optional text content of the message', null=True)),
                ('message_type', models.CharField(choices=[('TEXT', 'Text Message'), ('IMAGE', 'Image Message'), ('VIDEO', 'Video Message'), ('AUDIO', 'Audio Message'), ('DOCUMENT', 'Document'), ('LOCATION', 'Location'), ('CONTACT', 'Contact'), ('STICKER', 'Sticker'), ('SYSTEM', 'System Message')], default='TEXT', max_length=20)),
                ('status', models.CharField(choices=[('SENT', 'Sent'), ('DELIVERED', 'Delivered'), ('READ', 'Read'), ('DELETED', 'Deleted')], default='SENT', max_length=20)),
                ('metadata', models.JSONField(default=dict, help_text='Additional metadata for the message')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('chat', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chats.chat')),
                ('group_chat', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chats.groupchat')),
                ('reply_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='replies', to='chats.message')),
                ('sender', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
                ('attachments', models.ManyToManyField(blank=True, related_name='messages', to='chats.messageattachment')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='MessageReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='chats.message')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name='chat',
            index=models.Index(fields=['-last_message_at'], name='chats_chat_last_me_faf72f_idx'),
        ),
        migrations.AddIndex(
            model_name='groupmembership',
            index=models.Index(fields=['user', 'group', 'is_active'], name='chats_group_user_id_a126c4_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='groupmembership',
            unique_together={('user', 'group')},
        ),
        migrations.AddIndex(
            model_name='groupchat',
            index=models.Index(fields=['-last_message_at'], name='chats_group_last_me_04c559_idx'),
        ),
        migrations.AddIndex(
            model_name='groupchat',
            index=models.Index(fields=['name'], name='chats_group_name_a300b9_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['chat', '-created_at'], name='chats_messa_chat_id_b17a3f_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['group_chat', '-created_at'], name='chats_messa_group_c_a52ea0_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['sender', '-created_at'], name='chats_messa_sender__b92f58_idx'),
        ),
        migrations.AddIndex(
            model_name='messagereceipt',
            index=models.Index(fields=['message', 'user'], name='chats_messa_message_7aaba1_idx'),
        ),
        migrations.AddIndex(
            model_name='messagereceipt',
            index=models.Index(fields=['user', '-read_at'], name='chats_messa_user_id_c946be_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='messagereceipt',
            unique_together={('message', 'user')},
        ),
    ]
