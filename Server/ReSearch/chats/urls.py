# urls.py
from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    # Chat URLs
    path('chats/', views.chat_list, name='chat-list'),
    path('chats/create/', views.create_chat, name='chat-create'),
    path('chats/<int:chat_id>/', views.chat_detail, name='chat-detail'),
    
    # Group Chat URLs
    path('groups/', views.group_list, name='group-list'),
    path('groups/create/', views.create_group, name='group-create'),
    path('groups/<int:group_id>/', views.group_detail, name='group-detail'),
    path('groups/<int:group_id>/members/add/', views.add_group_member, name='group-add-member'),
    path('groups/<int:group_id>/members/remove/', views.remove_group_member, name='group-remove-member'),
    
    # Message URLs
    path('messages/', views.message_list, name='message-list'),
    path('messages/create/', views.create_message, name='message-create'),
    path('messages/read/', views.mark_messages_read, name='mark-messages-read'),
    path('messages/<int:message_id>/delete/', views.delete_message, name='delete-message'),
]