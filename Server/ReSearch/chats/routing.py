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
    re_path(r'^ws/chat/(?P<chat_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/$', 
        consumers.ChatConsumer.as_asgi(),
        name='private-chat'
    ),
    
    # Group Chat WebSocket
    re_path(r'^ws/group/(?P<group_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/$', 
        consumers.GroupChatConsumer.as_asgi(),
        name='group-chat'
    ),
    
    # Notifications WebSocket
    re_path(r'^ws/notifications/$', 
        consumers.NotificationConsumer.as_asgi(),
        name='notifications'
    ),
    re_path(r'^ws/projectchat/$', 
        consumers.DiffChatConsumer.as_asgi(),
        name='projectchat'
    ),
]