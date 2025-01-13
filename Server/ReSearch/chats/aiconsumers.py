from channels.generic.websocket import AsyncWebsocketConsumer
import json
import logging
import asyncio
from typing import Dict, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

class MessageType(Enum):
    TEXT = 'text'
    SYSTEM = 'system'
    AI = 'ai'

class AIChatConsumer(AsyncWebsocketConsumer):
    # Store active chat sessions
    active_chats: Dict[int, List[Dict]] = {}
    
    async def connect(self):
        """Handle connection setup for AI chat"""
        try:
            # Get the authenticated user from scope
            self.user = self.scope["user"]
            
            if not self.user.is_authenticated:
                logger.error("Unauthenticated user attempted to connect")
                await self.close()
                return
            
            # Create a unique channel name for this user
            self.user_channel = f'ai_chat_{self.user.id}'
            
            # Initialize empty chat history for this user
            self.active_chats[self.user.id] = []
            
            # Add the user to their personal chat group
            await self.channel_layer.group_add(
                self.user_channel,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"User {self.user.id} connected to AI chat")
            
        except Exception as e:
            logger.error(f"Error in AI chat connect: {str(e)}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        """Handle user disconnection and clear chat history"""
        try:
            if hasattr(self, 'user_channel'):
                await self.channel_layer.group_discard(
                    self.user_channel,
                    self.channel_name
                )
            
            # Clear user's chat history
            if hasattr(self, 'user') and self.user.id in self.active_chats:
                del self.active_chats[self.user.id]
                logger.info(f"Cleared chat history for user {self.user.id}")
            
            logger.info(f"User {self.user.id} disconnected from AI chat")
            
        except Exception as e:
            logger.error(f"Error in disconnect: {str(e)}", exc_info=True)

    async def receive(self, text_data):
        """Handle received messages"""
        try:
            data = json.loads(text_data)
            message = await self.save_message(data)
            
            if message:
                message_data = await self.get_message_data(message)
                await self.channel_layer.group_send(
                    self.user_channel,
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
                
                # Generate and send AI response
                ai_response = await self.generate_ai_response(message_data['text_content'])
                ai_message = await self.save_message({
                    'text': ai_response,
                    'message_type': MessageType.AI.value,
                    'content': {}
                })
                
                if ai_message:
                    ai_message_data = await self.get_message_data(ai_message)
                    await self.channel_layer.group_send(
                        self.user_channel,
                        {
                            'type': 'chat_message',
                            'message': ai_message_data
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

    async def save_message(self, data):
        """Save message to active chat session"""
        try:
            message = {
                'id': len(self.active_chats.get(self.user.id, [])),
                'sender': self.user.id,
                'text_content': data.get('text', ''),
                'content': data.get('content', {}),
                'message_type': data.get('message_type', MessageType.TEXT.value),
                'timestamp': datetime.now().isoformat(),
                'is_read': True
            }
            
            # Add message to active chat
            self.active_chats.setdefault(self.user.id, []).append(message)
            
            return message
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            return None

    async def get_message_data(self, message):
        """Format message data for sending"""
        return {
            'id': message['id'],
            'sender': message['sender'],
            'text_content': message['text_content'],
            'content': message['content'],
            'message_type': message['message_type'],
            'timestamp': message['timestamp'],
            'is_read': message['is_read']
        }

    async def chat_message(self, event):
        """Handle chat messages"""
        await self.send(json.dumps({
            'type': 'message',
            'message': event['message']
        }))

    async def generate_ai_response(self, user_message: str) -> str:
        """
        Generate AI response to user message
        You can integrate your preferred AI model here
        """
        try:
            # Get recent chat history for context
            chat_history = self.active_chats.get(self.user.id, [])
            recent_context = chat_history[-5:]  # Get last 5 messages for context
            
            # Simulate AI processing delay
            await asyncio.sleep(1)
            
            # Simple example response
            # Replace this with your AI model integration
            response = f"I understand you said: {user_message}. This is a placeholder response."
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}", exc_info=True)
            return "I apologize, but I'm having trouble generating a response right now."