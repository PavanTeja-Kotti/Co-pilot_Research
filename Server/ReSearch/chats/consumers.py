import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db.models import Prefetch
from django.db.models import Q
from .models import (
    Chat, 
    GroupChat, 
    Message, 
    MessageReceipt, 
    GroupMembership,
    MessageType,
    MessageStatus,
    MessageAttachment
)
from .serializers import (
    MessageSerializer,
    ChatSerializer,
    GroupChatSerializer
)
from django.db import models

logger = logging.getLogger(__name__)

class BaseChatConsumer(AsyncWebsocketConsumer):
    """Base consumer for shared functionality"""
    
    async def connect(self):
        """Handle connection"""
        if not self.scope['user'].is_authenticated:
            logger.error("Unauthenticated connection attempt")
            await self.close()
            return False
            
        self.user = self.scope['user']
        logger.info(f"Base connection established for user: {self.user.id}")
        return True

    @database_sync_to_async
    def get_message_data(self, message):
        """Get serialized message data"""
        try:
            return MessageSerializer(message).data
        except Exception as e:
            logger.error(f"Error serializing message: {str(e)}")
            return None

class ChatManagementConsumer(AsyncWebsocketConsumer):
    """Consumer for managing chat and group creation/deletion"""
    
    async def connect(self):
        """Handle connection"""
        if not self.scope['user'].is_authenticated:
            logger.error("Unauthenticated management connection attempt")
            await self.close()
            return
            
        self.user = self.scope['user']
        
        # Create a personal channel for the user
        self.user_channel = f'user_{self.user.id}_management'
        await self.channel_layer.group_add(
            self.user_channel,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Management connection established for user: {self.user.id}")
        
    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'user_channel'):
            await self.channel_layer.group_discard(
                self.user_channel,
                self.channel_name
            )
        logger.info(f"Management connection closed for user: {self.user.id}")

    async def receive(self, text_data):
        """Handle management commands"""
        try:
            data = json.loads(text_data)
            command = data.get('command')
            logger.info(f"Received management command: {command}")
            
            if command == 'create_chat':
                chat = await self.create_chat(data)
                if chat:
                    # Notify all participants about the new chat
                    for participant in chat['participants']:
                        await self.channel_layer.group_send(
                            f'user_{participant["id"]}_management',
                            {
                                'type': 'chat_notification',
                                'message': {
                                    'type': 'chat_created',
                                    'chat': chat
                                }
                            }
                        )
                else:
                    await self.send_error('Failed to create chat')
                    
            elif command == 'get_all_chats':
                try:
                    chats = await self.get_all_chats()
                    await self.send(json.dumps({
                        'type': 'chats_list',
                        'chats': chats
                    }))
                except Exception as e:
                    logger.error(f"Error fetching chats: {str(e)}")
                    await self.send_error('Failed to fetch chats')
                    
            elif command == 'create_group':
                group = await self.create_group(data)
                print(group)
                if group:
                    # Notify all group members about the new group
                    for member in group['members']:
                        await self.channel_layer.group_send(
                            f'user_{member["user"]["id"]}_management',
                            {
                                'type': 'chat_notification',
                                'message': {
                                    'type': 'group_created',
                                    'group': group
                                }
                            }
                        )
                else:
                    await self.send_error('Failed to create group')
                    
            elif command == 'delete_chat':
                chat_data = await self.delete_chat(data.get('chat_id'))
                if chat_data:
                    # Notify all participants about chat deletion
                    for participant in chat_data['participants']:
                        await self.channel_layer.group_send(
                            f'user_{participant["id"]}_management',
                            {
                                'type': 'chat_notification',
                                'message': {
                                    'type': 'chat_deleted',
                                    'chat_id': data.get('chat_id')
                                }
                            }
                        )
                else:
                    await self.send_error('Failed to delete chat')
                    
            elif command == 'delete_group':
                group_data = await self.delete_group(data.get('group_id'))
                if group_data:
                    # Notify all members about group deletion
                    for member in group_data['members']:
                        await self.channel_layer.group_send(
                            f'user_{member["id"]}_management',
                            {
                                'type': 'chat_notification',
                                'message': {
                                    'type': 'group_deleted',
                                    'group_id': data.get('group_id')
                                }
                            }
                        )
                else:
                    await self.send_error('Failed to delete group')
                    
            elif command == 'add_members':
                try:
                    success, group = await self.add_group_members(
                        data.get('group_id'),
                        data.get('member_ids', [])
                    )
                    if success:
                        # Notify all members (including new ones) about the update
                        for member in group['members']:
                            await self.channel_layer.group_send(
                                f'user_{member["id"]}_management',
                                {
                                    'type': 'chat_notification',
                                    'message': {
                                        'type': 'members_added',
                                        'group_id': data.get('group_id'),
                                        'member_ids': data.get('member_ids', []),
                                        'group': group
                                    }
                                }
                            )
                    else:
                        await self.send_error('Failed to add members')
                except Exception as e:
                    logger.error(f"Error adding members: {str(e)}")
                    await self.send_error('Failed to add members')
                    
            elif command == 'remove_members':
                try:
                    success, group = await self.remove_group_members(
                        data.get('group_id'),
                        data.get('member_ids', [])
                    )
                    if success:
                        # Get list of removed member IDs for notification
                        removed_member_ids = data.get('member_ids', [])
                        
                        # Notify both remaining and removed members
                        all_affected_users = (
                            [{'id': mid} for mid in removed_member_ids] + 
                            group['members']
                        )
                        
                        for member in all_affected_users:
                            await self.channel_layer.group_send(
                                f'user_{member["id"]}_management',
                                {
                                    'type': 'chat_notification',
                                    'message': {
                                        'type': 'members_removed',
                                        'group_id': data.get('group_id'),
                                        'member_ids': removed_member_ids,
                                        'group': group
                                    }
                                }
                            )
                    else:
                        await self.send_error('Failed to remove members')
                except Exception as e:
                    logger.error(f"Error removing members: {str(e)}")
                    await self.send_error('Failed to remove members')
                    
            else:
                await self.send_error(f'Unknown command: {command}')
                    
        except json.JSONDecodeError:
            logger.error("Invalid JSON in management command")
            await self.send_error('Invalid command format')
        except Exception as e:
            logger.error(f"Error handling management command: {str(e)}", exc_info=True)
            await self.send_error('Internal server error')

    async def chat_notification(self, event):
        """Handle chat notifications and send them to the connected client"""
        try:
            await self.send(json.dumps(event['message']))
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}")

    async def send_error(self, message):
        """Helper method to send error messages"""
        try:
            await self.send(json.dumps({
                'type': 'error',
                'message': message
            }))
        except Exception as e:
            logger.error(f"Error sending error message: {str(e)}")

    @database_sync_to_async
    def get_all_chats(self):
        """Get all private and group chats for the user with latest 20 messages each"""
        try:
            # Get messages subquery
            message_queryset = Message.objects.filter(
                deleted_at__isnull=True
            ).order_by('-created_at')

            # Get private chats
            private_chats = Chat.objects.filter(
                participants=self.user,
                is_active=True
            ).prefetch_related(
                'participants',
                Prefetch(
                    'messages',
                    queryset=message_queryset,
                    to_attr='recent_messages'
                )
            ).order_by('-last_message_at')

            # Get group chats
            group_chats = GroupChat.objects.filter(
                members=self.user,
                is_active=True,
                groupmembership__is_active=True
            ).prefetch_related(
                'members',
                'admins',
                Prefetch(
                    'messages',
                    queryset=message_queryset,
                    to_attr='recent_messages'
                )
            ).order_by('-last_message_at')

            # Serialize the chats
            private_chat_data = ChatSerializer(
                private_chats,
                many=True,
                context={'user': self.user}
            ).data
            group_chat_data = GroupChatSerializer(
                group_chats,
                many=True,
                context={'user': self.user}
            ).data

            # Combine and sort all chats
            all_chats = []
            for chat in private_chat_data:
                messages = chat.get('messages', [])[:20][::-1]
                all_chats.append({
                    'id': chat['id'],
                    'type': 'private',
                    'participants': chat['participants'],
                    'last_message': chat['last_message'],
                    'last_message_at': chat['last_message_at'],
                    'unread_count': chat['unread_count'],
                    'messages': messages
                })
            
            for chat in group_chat_data:
                messages = chat.get('messages', [])[:20][::-1]
                all_chats.append({
                    'id': chat['id'],
                    'type': 'group',
                    'name': chat['name'],
                    'image': chat['image'],
                    'last_message': chat['last_message'],
                    'last_message_at': chat['last_message_at'],
                    'unread_count': chat['unread_count'],
                    'members': chat['members'],
                    'messages': messages
                })

            # Sort by last_message_at
            sorted_chats = sorted(
                all_chats,
                key=lambda x: (x['last_message_at'] is None, x['last_message_at'] or ''),
                reverse=True
            )

            return sorted_chats

        except Exception as e:
            logger.error(f"Error fetching chats: {str(e)}")
            raise

    @database_sync_to_async
    def create_chat(self, data):
        """Create a new private chat"""
        try:
            participant_ids = data.get('participant_ids', [])
            
            if not participant_ids or len(participant_ids) > 2 or len([p for p in participant_ids if p != self.user.id]) != 1:
                logger.error("Invalid participant count for chat creation")
                return None

            if self.user.id not in participant_ids:
                participant_ids.append(self.user.id)

            # Check existing chat
            existing_chat = Chat.objects.filter(
                participants__id__in=participant_ids
            ).annotate(
                participant_count=models.Count('participants')
            ).filter(
                participant_count=len(participant_ids)
            ).first()
           
            if existing_chat:
                logger.info("Chat already exists between the participants")
                return None
               
            # Create new chat
            chat = Chat.objects.create()
            chat.participants.set(participant_ids)

            if not chat.id:
                logger.error("Failed to create chat")
                return None
            
            logger.info(f"New chat created between user {self.user.id} and participants {participant_ids}")
            return ChatSerializer(chat, context={'user': self.user}).data
            
        except Exception as e:
            logger.error(f"Error creating chat: {str(e)}")
            return None

    @database_sync_to_async
    def create_group(self, data):
        """Create a new group chat"""
        try:
            if not data.get('name'):
                logger.error("Group name not provided")
                return None
          
            group = GroupChat.objects.create(
                name=data.get('name'),
                description=data.get('description', ''),
                creator=self.user
            )
            
            # Add creator as admin and member
            group.admins.add(self.user)
            GroupMembership.objects.create(
                user=self.user,
                group=group,
                is_active=True
            )
            
            # Add other members
            member_ids = data.get('member_ids', [])
            for member_id in member_ids:
                if member_id != self.user.id:
                    GroupMembership.objects.create(
                        user_id=member_id,
                        group=group,
                        is_active=True
                    )
            
            return GroupChatSerializer(group, context={'user': self.user}).data
        except Exception as e:
            logger.error(f"Error creating group: {str(e)}")
            return None

    @database_sync_to_async
    def delete_chat(self, chat_id):
        """Delete a chat and return participant data for notifications"""
        try:
            chat = Chat.objects.get(id=chat_id)
            if chat.participants.filter(id=self.user.id).exists():
                chat_data = ChatSerializer(chat, context={'user': self.user}).data
                chat.is_active = False
                chat.save()
                return chat_data
            logger.warning(f"Unauthorized chat deletion attempt: {chat_id}")
            return None
        except Chat.DoesNotExist:
            logger.error(f"Chat not found for deletion: {chat_id}")
            return None
        except Exception as e:
            logger.error(f"Error deleting chat: {str(e)}")
            return None

    @database_sync_to_async
    def delete_group(self, group_id):
        """Delete a group and return member data for notifications"""
        try:
            group = GroupChat.objects.get(id=group_id)
            if self.user == group.creator or group.admins.filter(id=self.user.id).exists():
                group_data = GroupChatSerializer(group, context={'user': self.user}).data
                group.is_active = False
                group.save()
                return group_data
            logger.warning(f"Unauthorized group deletion attempt: {group_id}")
            return None
        except GroupChat.DoesNotExist:
            logger.error(f"Group not found for deletion: {group_id}")
            return None
        except Exception as e:
            logger.error(f"Error deleting group: {str(e)}")
            return None

    @database_sync_to_async
    def add_group_members(self, group_id, member_ids):
        """Add members to a group"""
        try:
            group = GroupChat.objects.get(id=group_id)
            if self.user == group.creator or group.admins.filter(id=self.user.id).exists():
                # Add new members
                members_added = False
                for member_id in member_ids:
                    membership, created = GroupMembership.objects.get_or_create(
                        user_id=member_id,
                        group=group,
                        defaults={'is_active': True}
                    )
                    
                    # If membership existed but was inactive, reactivate it
                    if not created and not membership.is_active:
                        membership.is_active = True
                        membership.save()
                        members_added = True
                    elif created:
                        members_added = True

                # Only return success if at least one member was added or reactivated
                if members_added:
                    # Refresh group data after adding members
                    group = GroupChat.objects.get(id=group_id)
                    return True, GroupChatSerializer(group, context={'user': self.user}).data
                else:
                    logger.info(f"No new members added to group: {group_id}")
                    return False, GroupChatSerializer(group, context={'user': self.user}).data
            
            logger.warning(f"Unauthorized member addition attempt: {group_id}")
            return False, None
            
        except GroupChat.DoesNotExist:
            logger.error(f"Group not found for adding members: {group_id}")
            return False, None
        except Exception as e:
            logger.error(f"Error adding members to group: {str(e)}")
            return False, None

    @database_sync_to_async
    def remove_group_members(self, group_id, member_ids):
        """Remove members from a group"""
        try:
            group = GroupChat.objects.get(id=group_id)
            if self.user == group.creator or group.admins.filter(id=self.user.id).exists():
                # Store original members for notification
                original_members = list(group.members.all())
                
                # Remove members
                current_time = timezone.now()
                affected_rows = GroupMembership.objects.filter(
                    user_id__in=member_ids,
                    group=group,
                    is_active=True  # Only affect active memberships
                ).update(
                    is_active=False,
                    left_at=current_time
                )
                
                if affected_rows > 0:
                    # Refresh group data after removing members
                    group = GroupChat.objects.get(id=group_id)
                    group_data = GroupChatSerializer(group, context={'user': self.user}).data
                    
                    # Add removed members to the notification list
                    removed_members = User.objects.filter(id__in=member_ids)
                    all_affected_members = set(original_members) | set(removed_members)
                    
                    return True, {
                        **group_data,
                        'removed_members': [{'id': member.id} for member in removed_members]
                    }
                else:
                    logger.info(f"No members were removed from group: {group_id}")
                    return False, GroupChatSerializer(group, context={'user': self.user}).data
                    
            logger.warning(f"Unauthorized member removal attempt: {group_id}")
            return False, None
            
        except GroupChat.DoesNotExist:
            logger.error(f"Group not found for removing members: {group_id}")
            return False, None
        except Exception as e:
            logger.error(f"Error removing members from group: {str(e)}")
            return False, None
class ChatConsumer(BaseChatConsumer):
    """Consumer for private chats"""
    
    async def connect(self):
        """Handle private chat connection"""
        if not await super().connect():
            return
        
        try:
            self.chat_id = self.scope['url_route']['kwargs']['chat_id']
            logger.info(f"Connecting to private chat: {self.chat_id}")
            
            chat = await self.get_chat()

        

            if not chat or not chat.is_active:
                logger.error(f"Chat not found or inactive: {self.chat_id}")
                await self.close()
                return
                
            self.chat_group = f'chat_{self.chat_id}'
            await self.channel_layer.group_add(
                self.chat_group,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"Connected to private chat: {self.chat_id}")
            
        except Exception as e:
            logger.error(f"Error in private chat connect: {str(e)}", exc_info=True)
            
            await self.close()

    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'chat_group'):
            await self.channel_layer.group_discard(
                self.chat_group,
                self.channel_name
            )
        logger.info(f"Disconnected from private chat: {self.chat_id}")

    async def receive(self, text_data):
        """Handle received messages"""
        try:
            data = json.loads(text_data)
            
            # Validate required fields based on message type
            message_type = data.get('message_type', MessageType.TEXT)
            if not self.validate_message_data(message_type, data):
                await self.send(json.dumps({
                    'type': 'error',
                    'message': 'Invalid message data'
                }))
                return

            message = await self.save_message(data)
            
            if message:
                message_data = await self.get_message_data(message)
                await self.channel_layer.group_send(
                    self.chat_group,
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON in chat message")
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))
        except Exception as e:
            logger.error(f"Error handling chat message: {str(e)}", exc_info=True)
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    def validate_message_data(self, message_type, data):
        """Validate message data based on message type"""
        try:
            if message_type == MessageType.TEXT:
                return bool(data.get('text'))
                
            elif message_type in [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.DOCUMENT]:
                file_data = data.get('file', {})
                return all([
                    file_data.get('path'),
                    file_data.get('name'),
                    file_data.get('type')
                ])
                
            elif message_type == MessageType.LOCATION:
                return all([
                    data.get('latitude') is not None,
                    data.get('longitude') is not None
                ])
                
            elif message_type == MessageType.CONTACT:
                return all([
                    data.get('contact_name'),
                    data.get('contact_phone')
                ])
                
            elif message_type == MessageType.STICKER:
                return bool(data.get('sticker_id'))
                
            elif message_type == MessageType.SYSTEM:
                return bool(data.get('action'))
                
            return False
            
        except Exception as e:
            logger.error(f"Error validating message data: {str(e)}")
            return False

    @database_sync_to_async
    def get_chat(self):
        """Get chat and verify user is participant"""
        try:
           
            chat = Chat.objects.get(id=self.chat_id)
            if chat.participants.filter(id=self.user.id).exists():
                return chat
            return None
        except Chat.DoesNotExist:

            return None
        except Exception as e:
            logger.error(f"Error getting chat: {str(e)}")
            print(e)    
            return None

    @database_sync_to_async
    def save_message(self, data):
        """Save message to database with support for all message types"""
        try:
            message_type = data.get('message_type', MessageType.TEXT)
            content = data.get('content', {})
            
            # Create base message object
            message = Message(
                sender=self.user,
                chat_id=self.chat_id,
                message_type=message_type,
                content=content
            )

            # Handle different message types
            if message_type == MessageType.TEXT:
                message.text_content = data.get('text')
                
            elif message_type in [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.DOCUMENT]:
                # Handle file attachments
                file_data = data.get('file', {})
                if file_data:
                    attachment = MessageAttachment.objects.create(
                        file_path=file_data.get('path'),
                        file_name=file_data.get('name'),
                        file_size=file_data.get('size', 0),
                        file_type=file_data.get('type')
                    )
                    message.save()  # Save message first to get ID
                    message.attachments.add(attachment)

            elif message_type == MessageType.LOCATION:
                message.content = {
                    'latitude': data.get('latitude'),
                    'longitude': data.get('longitude'),
                    'address': data.get('address', '')
                }

            elif message_type == MessageType.CONTACT:
                message.content = {
                    'name': data.get('contact_name'),
                    'phone': data.get('contact_phone'),
                    'email': data.get('contact_email', ''),
                    'additional_info': data.get('additional_info', {})
                }

            elif message_type == MessageType.STICKER:
                message.content = {
                    'sticker_id': data.get('sticker_id'),
                    'pack_id': data.get('pack_id', ''),
                    'sticker_metadata': data.get('sticker_metadata', {})
                }

            elif message_type == MessageType.SYSTEM:
                message.content = {
                    'action': data.get('action'),
                    'metadata': data.get('metadata', {})
                }

            # Save the message
            message.save()

            # Create receipts for other participants
            participants = message.chat.participants.exclude(id=self.user.id)
            MessageReceipt.objects.bulk_create([
                MessageReceipt(message=message, user=participant)
                for participant in participants
            ])

            return message

        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}", exc_info=True)
            return None

    async def chat_message(self, event):
        """Handle chat messages"""
        await self.send(json.dumps({
            'type': 'message',
            'message': event['message']
        }))

class GroupChatConsumer(BaseChatConsumer):
    """Consumer for group chats"""
    
    async def connect(self):
        """Handle group chat connection"""
        if not await super().connect():
            return
            
        try:
            self.group_id = self.scope['url_route']['kwargs']['group_id']
            logger.info(f"Connecting to group chat: {self.group_id}")
            
            is_member = await self.verify_membership()
            if not is_member:
                logger.error(f"User not member of group: {self.group_id}")
                await self.close()
                return
                
            self.chat_group = f'group_{self.group_id}'
            await self.channel_layer.group_add(
                self.chat_group,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"Connected to group chat: {self.group_id}")
            
        except Exception as e:
            logger.error(f"Error in group chat connect: {str(e)}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'chat_group'):
            await self.channel_layer.group_discard(
                self.chat_group,
                self.channel_name
            )
        logger.info(f"Disconnected from group chat: {self.group_id}")

    async def receive(self, text_data):
        """Handle received messages"""
        try:
            data = json.loads(text_data)
            
            # Verify user is still an active member
            is_member = await self.verify_membership()
            if not is_member:
                logger.warning(f"User no longer member of group: {self.group_id}")
                await self.send(json.dumps({
                    'type': 'error',
                    'message': 'You are no longer a member of this group'
                }))
                return
                
            message = await self.save_message(data)
            if message:
                message_data = await self.get_message_data(message)
                await self.channel_layer.group_send(
                    self.chat_group,
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON in group message")
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))
        except Exception as e:
            logger.error(f"Error handling group message: {str(e)}", exc_info=True)
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    @database_sync_to_async
    def verify_membership(self):
        """Verify user is an active member of the group"""
        try:
            group = GroupChat.objects.get(id=self.group_id)
            return (group.is_active and 
                   GroupMembership.objects.filter(
                       group_id=self.group_id,
                       user=self.user,
                       is_active=True,
                       left_at__isnull=True
                   ).exists())
        except GroupChat.DoesNotExist:
            logger.error(f"Group not found: {self.group_id}")
            return False
        except Exception as e:
            logger.error(f"Error verifying group membership: {str(e)}")
            return False

    @database_sync_to_async
    def save_message(self, data):
        """Save message to database"""
        try:


            # Create the message
            message = Message.objects.create(
                
                sender=self.user,
                group_chat_id=self.group_id,
                text_content=data.get('text'),
                content=data.get('content', {}),
                message_type=data.get('message_type', MessageType.TEXT)
            )
            
            # Create receipts for other active members
           
            active_members = message.group_chat.members.exclude(
                id=self.user.id
            ).filter(
                groupmembership__is_active=True,
                groupmembership__left_at__isnull=True
            ).distinct()

            print("message",active_members,data)
            
            # Bulk create receipts
            receipts = [
                MessageReceipt(
                    message=message,
                    user=member
                ) for member in active_members
            ]
            MessageReceipt.objects.bulk_create(receipts)
            
            return message
        except Exception as e:
            logger.error(f"Error saving group message: {str(e)}")
            return None

    async def chat_message(self, event):
        """Handle chat messages"""
        await self.send(json.dumps({
            'type': 'message',
            'message': event['message']
        }))

    async def group_update(self, event):
        """Handle group update notifications"""
        await self.send(json.dumps({
            'type': 'group_update',
            'group_id': event['group_id'],
            'update_type': event['update_type'],
            'data': event.get('data', {})
        }))

class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer for handling user notifications"""
    
    async def connect(self):
        """Handle connection"""
        if not self.scope['user'].is_authenticated:
            logger.error("Unauthenticated notification connection attempt")
            await self.close()
            return
            
        self.user = self.scope['user']
        self.notification_group = f'notifications_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.notification_group,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Notification connection established for user: {self.user.id}")

    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'notification_group'):
            await self.channel_layer.group_discard(
                self.notification_group,
                self.channel_name
            )
        logger.info(f"Notification connection closed for user: {self.user.id}")

    async def receive(self, text_data):
        """Handle received commands"""
        try:
            data = json.loads(text_data)
            command = data.get('command')
            
            if command == 'mark_read':
                # Handle marking notifications as read
                pass
            else:
                logger.warning(f"Unknown notification command: {command}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON in notification command")
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Invalid command format'
            }))
        except Exception as e:
            logger.error(f"Error handling notification command: {str(e)}")
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    async def notify(self, event):
        """Send notification to user"""
        await self.send(json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))



