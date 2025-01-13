# # consumers.py
# import json
# import asyncio
# from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.db import database_sync_to_async
# from .services import RedisService
# from .models import Chat, GroupChat, Message, MessageReceipt
# from .serializers import MessageSerializer
# from django.core.exceptions import ObjectDoesNotExist

# class BaseChatConsumer(AsyncWebsocketConsumer):
#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         self.redis_service = RedisService()
#         self.heartbeat_task = None

#     async def connect(self):
#         """Handle connection"""
#         if not self.scope['user'].is_authenticated:
#             await self.close()
#             return

#         self.user = self.scope['user']
        
#         # Set up heartbeat
#         self.heartbeat_task = asyncio.create_task(self.heartbeat())
        
#         # Process any queued messages
#         await self.process_message_queue()
        
#         await self.accept()

#     async def disconnect(self, close_code):
#         """Handle disconnection"""
#         if self.heartbeat_task:
#             self.heartbeat_task.cancel()
            
#         if hasattr(self, 'chat_group'):
#             # Set user offline
#             await database_sync_to_async(self.redis_service.set_user_offline)(
#                 self.user.id,
#                 self.chat_group
#             )
            
#             # Notify others
#             await self.channel_layer.group_send(
#                 self.chat_group,
#                 {
#                     'type': 'user_offline',
#                     'user_id': self.user.id
#                 }
#             )
            
#             await self.channel_layer.group_discard(
#                 self.chat_group,
#                 self.channel_name
#             )

#     async def heartbeat(self):
#         """Maintain presence information"""
#         try:
#             while True:
#                 if hasattr(self, 'chat_group'):
#                     await database_sync_to_async(self.redis_service.set_user_online)(
#                         self.user.id,
#                         self.chat_group
#                     )
#                 await asyncio.sleep(30)  # Update every 30 seconds
#         except asyncio.CancelledError:
#             pass

#     async def process_message_queue(self):
#         """Process queued messages for user"""
#         messages = await database_sync_to_async(self.redis_service.get_message_queue)(
#             self.user.id
#         )
#         for message in messages:
#             await self.send(json.dumps(message))

# class ChatConsumer(BaseChatConsumer):

#     async def connect(self):
#         """Handle private chat connection"""
#         if not self.scope['user'].is_authenticated:
#             await self.close()
#             return

#         self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        
#         try:
#             # Verify user is participant
#             chat = await database_sync_to_async(Chat.objects.get)(id=self.chat_id)
#             is_participant = await database_sync_to_async(chat.participants.filter(id=self.user.id).exists)()
            
#             if not is_participant:
#                 await self.close()
#                 return
                
#             self.chat_group = f'chat_{self.chat_id}'
#             await self.channel_layer.group_add(
#                 self.chat_group,
#                 self.channel_name
#             )
            
#             await super().connect()
            
#             # Set user online and notify others
#             await database_sync_to_async(self.redis_service.set_user_online)(
#                 self.user.id,
#                 self.chat_group
#             )
            
#             # Get online users
#             online_users = await database_sync_to_async(self.redis_service.get_online_users)(
#                 self.chat_group
#             )
            
#             await self.send(json.dumps({
#                 'type': 'connection_established',
#                 'chat_id': self.chat_id,
#                 'online_users': online_users
#             }))
            
#             # Notify others
#             await self.channel_layer.group_send(
#                 self.chat_group,
#                 {
#                     'type': 'user_online',
#                     'user_id': self.user.id
#                 }
#             )
            
#         except ObjectDoesNotExist:
#             await self.close()

#     async def receive(self, text_data):
#         """Handle received messages"""
#         try:
#             data = json.loads(text_data)
#             message_type = data.get('type', 'message')
            
#             if message_type == 'message':
#                 message = await self.save_message(data)
#                 if message:
#                     # Broadcast to all participants
#                     message_data = await self.get_message_data(message)
                    
#                     await self.channel_layer.group_send(
#                         self.chat_group,
#                         {
#                             'type': 'chat_message',
#                             'message': message_data
#                         }
#                     )
                    
#             elif message_type == 'typing':
#                 await database_sync_to_async(self.redis_service.set_typing_status)(
#                     self.user.id,
#                     self.chat_group,
#                     data.get('is_typing', True)
#                 )
                
#                 await self.channel_layer.group_send(
#                     self.chat_group,
#                     {
#                         'type': 'typing_status',
#                         'user_id': self.user.id,
#                         'is_typing': data.get('is_typing', True)
#                     }
#                 )
                
#             elif message_type == 'read_receipt':
#                 await self.mark_message_read(data.get('message_id'))
                
#         except json.JSONDecodeError:
#             await self.send(json.dumps({
#                 'type': 'error',
#                 'message': 'Invalid message format'
#             }))

#     @database_sync_to_async
#     def save_message(self, data):
#         """Save message to database"""
#         message = Message.objects.create(
#             sender=self.user,
#             chat_id=self.chat_id,
#             text_content=data.get('text'),
#             content=data.get('content', {}),
#             message_type=data.get('type', 'TEXT')
#         )
        
#         # Create receipts for other participants
#         participants = message.chat.participants.exclude(id=self.user.id)
#         for participant in participants:
#             MessageReceipt.objects.create(
#                 message=message,
#                 user=participant
#             )
            
#             # Queue message for offline users
#             if participant.id not in self.redis_service.get_online_users(self.chat_group):
#                 self.redis_service.add_to_message_queue(
#                     participant.id,
#                     {
#                         'type': 'message',
#                         'message': MessageSerializer(message).data
#                     }
#                 )
        
#         return message

#     @database_sync_to_async
#     def mark_message_read(self, message_id):
#         """Mark message as read"""
#         try:
#             receipt = MessageReceipt.objects.get(
#                 message_id=message_id,
#                 user=self.user
#             )
#             receipt.mark_as_read()
#         except MessageReceipt.DoesNotExist:
#             pass

#     @database_sync_to_async
#     def get_message_data(self, message):
#         """Get serialized message data"""
#         return MessageSerializer(message).data

#     async def chat_message(self, event):
#         """Handle chat messages"""
#         await self.send(json.dumps({
#             'type': 'message',
#             'message': event['message']
#         }))

#     async def typing_status(self, event):
#         """Handle typing status"""
#         await self.send(json.dumps({
#             'type': 'typing',
#             'user_id': event['user_id'],
#             'is_typing': event['is_typing']
#         }))

#     async def user_online(self, event):
#         """Handle user coming online"""
#         await self.send(json.dumps({
#             'type': 'user_online',
#             'user_id': event['user_id']
#         }))

#     async def user_offline(self, event):
#         """Handle user going offline"""
#         await self.send(json.dumps({
#             'type': 'user_offline',
#             'user_id': event['user_id']
#         }))




# class GroupChatConsumer(BaseChatConsumer):
#     async def connect(self):
#         """Handle group chat connection"""
#         if not self.scope['user'].is_authenticated:
#             await self.close()
#             return

#         self.group_id = self.scope['url_route']['kwargs']['group_id']
        
#         try:
#             # Verify user is member of the group
#             group = await database_sync_to_async(GroupChat.objects.get)(id=self.group_id)
#             is_member = await database_sync_to_async(
#                 group.members.filter(id=self.user.id, groupmembership__is_active=True).exists
#             )()
            
#             if not is_member:
#                 await self.close()
#                 return
                
#             self.chat_group = f'group_{self.group_id}'
#             await self.channel_layer.group_add(
#                 self.chat_group,
#                 self.channel_name
#             )
            
#             await super().connect()
            
#             # Set user online and notify others
#             await database_sync_to_async(self.redis_service.set_user_online)(
#                 self.user.id,
#                 self.chat_group
#             )
            
#             # Get online users
#             online_users = await database_sync_to_async(self.redis_service.get_online_users)(
#                 self.chat_group
#             )
            
#             await self.send(json.dumps({
#                 'type': 'connection_established',
#                 'group_id': self.group_id,
#                 'online_users': online_users
#             }))
            
#             # Notify others
#             await self.channel_layer.group_send(
#                 self.chat_group,
#                 {
#                     'type': 'user_online',
#                     'user_id': self.user.id
#                 }
#             )
            
#         except ObjectDoesNotExist:
#             await self.close()

#     async def receive(self, text_data):
#         """Handle received messages"""
#         try:
#             data = json.loads(text_data)
#             message_type = data.get('type', 'message')
            
#             if message_type == 'message':
#                 # Verify user is still an active member
#                 is_member = await self.verify_membership()
#                 if not is_member:
#                     await self.send(json.dumps({
#                         'type': 'error',
#                         'message': 'You are no longer a member of this group'
#                     }))
#                     return
                    
#                 message = await self.save_message(data)
#                 if message:
#                     message_data = await self.get_message_data(message)
                    
#                     await self.channel_layer.group_send(
#                         self.chat_group,
#                         {
#                             'type': 'chat_message',
#                             'message': message_data
#                         }
#                     )
                    
#             elif message_type == 'typing':
#                 await database_sync_to_async(self.redis_service.set_typing_status)(
#                     self.user.id,
#                     self.chat_group,
#                     data.get('is_typing', True)
#                 )
                
#                 await self.channel_layer.group_send(
#                     self.chat_group,
#                     {
#                         'type': 'typing_status',
#                         'user_id': self.user.id,
#                         'is_typing': data.get('is_typing', True)
#                     }
#                 )
                
#             elif message_type == 'read_receipt':
#                 await self.mark_message_read(data.get('message_id'))
                
#         except json.JSONDecodeError:
#             await self.send(json.dumps({
#                 'type': 'error',
#                 'message': 'Invalid message format'
#             }))

#     @database_sync_to_async
#     def verify_membership(self):
#         """Verify user is still an active member of the group"""
#         return GroupMembership.objects.filter(
#             group_id=self.group_id,
#             user=self.user,
#             is_active=True,
#             left_at__isnull=True
#         ).exists()

#     @database_sync_to_async
#     def save_message(self, data):
#         """Save message to database"""
#         message = Message.objects.create(
#             sender=self.user,
#             group_chat_id=self.group_id,
#             text_content=data.get('text'),
#             content=data.get('content', {}),
#             message_type=data.get('type', 'TEXT')
#         )
        
#         # Create receipts for other active members
#         active_members = message.group_chat.members.exclude(id=self.user.id).filter(
#             groupmembership__is_active=True,
#             groupmembership__left_at__isnull=True
#         )
        
#         for member in active_members:
#             MessageReceipt.objects.create(
#                 message=message,
#                 user=member
#             )
            
#             # Queue message for offline users
#             if member.id not in self.redis_service.get_online_users(self.chat_group):
#                 self.redis_service.add_to_message_queue(
#                     member.id,
#                     {
#                         'type': 'message',
#                         'message': MessageSerializer(message).data
#                     }
#                 )
        
#         return message

#     @database_sync_to_async
#     def mark_message_read(self, message_id):
#         """Mark message as read"""
#         try:
#             receipt = MessageReceipt.objects.get(
#                 message_id=message_id,
#                 user=self.user,
#                 message__group_chat_id=self.group_id
#             )
#             receipt.mark_as_read()
#         except MessageReceipt.DoesNotExist:
#             pass

#     @database_sync_to_async
#     def get_message_data(self, message):
#         """Get serialized message data"""
#         return MessageSerializer(message).data

#     async def chat_message(self, event):
#         """Handle chat messages"""
#         await self.send(json.dumps({
#             'type': 'message',
#             'message': event['message']
#         }))

#     async def typing_status(self, event):
#         """Handle typing status"""
#         await self.send(json.dumps({
#             'type': 'typing',
#             'user_id': event['user_id'],
#             'is_typing': event['is_typing']
#         }))

#     async def user_online(self, event):
#         """Handle user coming online"""
#         await self.send(json.dumps({
#             'type': 'user_online',
#             'user_id': event['user_id']
#         }))

#     async def user_offline(self, event):
#         """Handle user going offline"""
#         await self.send(json.dumps({
#             'type': 'user_offline',
#             'user_id': event['user_id']
#         }))