# routing.py
from django.urls import re_path
from . import consumers
from . import aiconsumers

websocket_urlpatterns = [

    # AI Chat WebSocket
    re_path(r'^ws/ai/aichat/$', 
        aiconsumers.AIChatConsumer.as_asgi(),
        name='ai-chat'
    ),


    # Management WebSocket
    re_path(r'^ws/chat/manage/$', 
        consumers.ChatManagementConsumer.as_asgi(),
        name='chat-management'
    ),
    
    # Private Chat WebSocket
    re_path(r'^ws/chat/(?P<chat_id>\d+)/$', 
        consumers.ChatConsumer.as_asgi(),
        name='private-chat'
    ),
    
    # Group Chat WebSocket
    re_path(r'^ws/group/(?P<group_id>\d+)/$', 
        consumers.GroupChatConsumer.as_asgi(),
        name='group-chat'
    ),
    
    # Notifications WebSocket
    re_path(r'^ws/notifications/$', 
        consumers.NotificationConsumer.as_asgi(),
        name='notifications'
    ),
]