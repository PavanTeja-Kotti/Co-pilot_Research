import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from dataclasses import dataclass, asdict
from abc import ABC, abstractmethod
from . import consumers



# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enums for message types and statuses
class MessageType(Enum):
    TEXT = 'TEXT'
    SYSTEM = 'SYSTEM'
    AI = 'AI'
    IMAGE = 'IMAGE'
    FILE = 'FILE'

class MessageStatus(Enum):
    SENT = 'SENT'
    DELIVERED = 'DELIVERED'
    READ = 'READ'
    FAILED = 'FAILED'


@dataclass
class Attachment:
    id: str
    file_type: str
    file_name: str
    file_path: str
    file_size: int
    created_at: str
    file: Optional[str] = None


    
    

@dataclass
class User:
    id: int
    username: str
    email: str
    profile_image: Optional[str] = None
    is_active: bool = True
    first_name: str = ''
    last_name: str = ''

@dataclass
class MessageReceipt:
    id: str
    user: Dict[str, Any]
    delivered_at: Optional[str] = None
    read_at: Optional[str] = None

@dataclass
class ChatMessage:
    id: str
    sender: Dict[str, Any]
    text_content: str
    content: Dict[str, Any]
    message_type: str
    status: str
    created_at: str
    updated_at: str
    attachments: List[Dict] = None
    reply_to: Optional[int] = None
    reply_to_message: Optional[Dict] = None
    deleted_at: Optional[str] = None
    receipts: List[MessageReceipt] = None
    metadata: Dict[str, Any] = None

    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if v is not None}

@dataclass
class ChatSession:
    id: str
    type: str
    name: str
    avatar: str
    members: List[Dict[str, Any]]
    messages: List[ChatMessage]
    last_message: str = ""
    time: str = ""
    unread: int = 0
    member_count: int = 2
    sender: Optional[str] = None
    profile_image: Optional[str] = None

    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if v is not None}

# Abstract base class for AI model integration
class AIModelInterface(ABC):
    @abstractmethod
    async def generate_response(self, message: str, context: List[Dict]) -> str:
        pass

# Simple AI model implementation
class SimpleAIModel(AIModelInterface):
    async def generate_response(self, message: str, context: List[Dict]) -> str:
        # Simulate AI processing delay (3-5 seconds)
        base_delay = 0
        await asyncio.sleep(base_delay)
        
        # Simple response generation
        response = f"I understand you said: {message}. This is a placeholder response."
        return response

class AIChatConsumer(AsyncWebsocketConsumer):
    # Class variables
    active_chats: Dict[int, Dict[str, Dict]] = {}
    ai_model: AIModelInterface = SimpleAIModel()
    
    AI_ASSISTANT = {
        "id": 0,
        "username": "AI Assistant",
        "email": "ai@assistant.com",
        "profile_image": None,
        "is_active": True,
        "first_name": "AI",
        "last_name": "Assistant"
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_channel = None
        self.user = None

    async def connect(self):
        """Handle WebSocket connection setup"""
        try:
            self.user = self.scope["user"]
            
            if not self.user.is_authenticated:
                logger.error("Unauthenticated user attempted to connect")
                await self.close()
                return
            
            self.user_channel = f'ai_chat_{self.user.id}'
            
            if self.user.id not in self.active_chats:
                self.active_chats[self.user.id] = {}
            
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
        """Handle WebSocket disconnection"""
        try:
            if hasattr(self, 'user_channel'):
                await self.channel_layer.group_discard(
                    self.user_channel,
                    self.channel_name
                )
            
            if hasattr(self, 'user'):
                logger.info(f"User {self.user.id} disconnected from AI chat")
            
        except Exception as e:
            logger.error(f"Error in disconnect: {str(e)}", exc_info=True)

    def generate_session_id(self) -> str:
        """Generate unique session identifier"""
        return f"ai_chat_{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    async def create_new_session(self) -> ChatSession:
        """Create a new chat session"""
        session_id = self.generate_session_id()
        user_data = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "profile_image": getattr(self.user, 'profile_image', None),
            "is_active": True,
            "first_name": getattr(self.user, 'first_name', ''),
            "last_name": getattr(self.user, 'last_name', '')
        }
        
        session = ChatSession(
            id=session_id,
            type="private",
            name="AI Assistant",
            avatar="AI",
            members=[user_data, self.AI_ASSISTANT],
            messages=[],
            sender=self.user.username,
            profile_image=user_data["profile_image"]
        )
        
        self.active_chats[self.user.id][session_id] = session.to_dict()
        return session

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            session_id = data.get('session_id')


            message_type = data.get('message_type', MessageType.TEXT)
            if not consumers.validate_message_data(message_type, data):
                await self.send(json.dumps({
                    'type': 'error',
                    'message': 'Invalid message data'
                }))
                return

            
            if not session_id:
                session = await self.create_new_session()
                session_id = session.id
                
                await self.send(json.dumps({
                    'type': 'chat_created',
                    'chat_id': session_id,
                    'message': 'New chat session created successfully'
                }))

            # Process user message immediately
            message = await self.save_message(data, session_id, is_ai=False)
            
            if message:
                chat_session = self.active_chats[self.user.id][session_id]
                chat_session["lastMessage"] = message["text_content"]
                chat_session["time"] = datetime.now().strftime("%I:%M:%S %p")
                
                # Send user message immediately
                await self.channel_layer.group_send(
                    self.user_channel,
                    {
                        'type': 'chat_message',
                        'session_id': session_id,
                        'message': message,
                        'is_ai': False
                    }
                )
                
                # Process AI response asynchronously
                asyncio.create_task(self.process_ai_response(message['text_content'], session_id))
                
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

    async def save_message(self, data: Dict, session_id: str, is_ai: bool = False) -> Dict:
        """Save message to chat session"""
        try:
            
            chat_session = self.active_chats[self.user.id][session_id]
            timestamp = datetime.now().isoformat()
            
            sender = self.AI_ASSISTANT if is_ai else chat_session["members"][0]
            message_type = data.get('message_type', MessageType.TEXT)

            id=uuid.uuid4().hex[:8]
            file_data = data.get('file', {})
            message = ChatMessage(
                id=id,
                sender=sender,
                text_content=data.get('text', ''),
                content=data.get('content', {}),
                message_type=data.get('message_type', MessageType.TEXT.value),
                status=MessageStatus.SENT.value,
                created_at=timestamp,
                updated_at=timestamp,
                attachments=   [ 
                    asdict(Attachment(
                        id=uuid.uuid4().hex[:8],
                        file_type=file_data.get('type', ''),
                        file_name=file_data.get('name', ''),
                        file_path=file_data.get('path', ''),
                        file_size=file_data.get('size', 0),
                        created_at=timestamp
                    )) 
                ] if file_data else [] ,
                receipts=[
                    asdict(MessageReceipt(
                        id=id,
                        user=self.AI_ASSISTANT if not is_ai else chat_session["members"][0]
                    ))
                ],
                metadata={}
            )
            
            message_dict = message.to_dict()
            chat_session["messages"].append(message_dict)
            return message_dict
            
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            return None

    async def process_ai_response(self, user_message: str, session_id: str):
        """Process AI response asynchronously"""
        try:
            # Get chat context
            chat_session = self.active_chats[self.user.id][session_id]
            recent_messages = chat_session.get("messages", [])[-5:]
            
            # Generate AI response
            ai_response = await self.ai_model.generate_response(user_message, recent_messages)
            
            # Add typing delay based on response length
            typing_delay = 1 + (len(ai_response) / 100)  # Longer response = longer delay
            await asyncio.sleep(typing_delay)
            
            # Save and send AI message
            ai_message = await self.save_message({
                'text': ai_response,
                'message_type': MessageType.AI.value,
                'content': {}
            }, session_id, is_ai=True)
            
            if ai_message:
                chat_session["lastMessage"] = ai_message["text_content"]
                chat_session["time"] = datetime.now().strftime("%I:%M:%S %p")
                
                await self.channel_layer.group_send(
                    self.user_channel,
                    {
                        'type': 'chat_message',
                        'session_id': session_id,
                        'message': ai_message,
                        'is_ai': True
                    }
                )
                
        except Exception as e:
            logger.error(f"Error processing AI response: {str(e)}", exc_info=True)
            # Send error message to user
            error_message = await self.save_message({
                'text': "I apologize, but I'm having trouble generating a response right now.",
                'message_type': MessageType.SYSTEM.value,
                'content': {}
            }, session_id, is_ai=True)
            
            if error_message:
                await self.channel_layer.group_send(
                    self.user_channel,
                    {
                        'type': 'chat_message',
                        'session_id': session_id,
                        'message': error_message,
                        'is_ai': True
                    }
                )

    async def chat_message(self, event):
        """Handle chat message delivery"""
        try:
            # Add small delay for AI messages to ensure proper ordering
            if event.get('is_ai', False):
                await asyncio.sleep(0.1)
            
            await self.send(json.dumps({
                'type': 'message',
                'session_id': event['session_id'],
                'message': event['message']
            }))
        except Exception as e:
            logger.error(f"Error in chat_message: {str(e)}", exc_info=True)

    async def update_message_status(self, message_id: int, session_id: str, status: MessageStatus):
        """Update message status and notify clients"""
        try:
            chat_session = self.active_chats[self.user.id][session_id]
            for message in chat_session["messages"]:
                if message["id"] == message_id:
                    message["status"] = status.value
                    message["updated_at"] = datetime.now().isoformat()
                    
                    await self.channel_layer.group_send(
                        self.user_channel,
                        {
                            'type': 'message_status_updated',
                            'session_id': session_id,
                            'message_id': message_id,
                            'status': status.value
                        }
                    )
                    break
                    
        except Exception as e:
            logger.error(f"Error updating message status: {str(e)}", exc_info=True)

    async def message_status_updated(self, event):
        """Handle message status update notifications"""
        try:
            await self.send(json.dumps({
                'type': 'status_update',
                'session_id': event['session_id'],
                'message_id': event['message_id'],
                'status': event['status']
            }))
        except Exception as e:
            logger.error(f"Error in message_status_updated: {str(e)}", exc_info=True)