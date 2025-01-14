import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from dataclasses import dataclass, asdict, field
from abc import ABC, abstractmethod
from . import consumers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UUIDEncoder(json.JSONEncoder):
    """Custom JSON encoder for UUID objects"""
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Enum):
            return obj.value
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        return super().default(obj)

def serialize_uuid(obj: Any) -> Any:
    """Helper function to serialize UUIDs in dictionaries"""
    if isinstance(obj, dict):
        return {k: serialize_uuid(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_uuid(item) for item in obj]
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if hasattr(obj, 'to_dict'):
        return obj.to_dict()
    return obj

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

    def to_dict(self) -> dict:
        return serialize_uuid(asdict(self))

@dataclass
class User:
    id: str
    username: str
    email: str
    profile_image: Optional[str] = None
    is_active: bool = True
    first_name: str = ''
    last_name: str = ''

    def to_dict(self) -> dict:
        return serialize_uuid(asdict(self))

@dataclass
class MessageReceipt:
    id: str
    user: Dict[str, Any]
    delivered_at: Optional[str] = None
    read_at: Optional[str] = None

    def to_dict(self) -> dict:
        return serialize_uuid(asdict(self))

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
    attachments: List[Dict] = field(default_factory=list)
    reply_to: Optional[str] = None
    reply_to_message: Optional[Dict] = None
    deleted_at: Optional[str] = None
    receipts: List[Dict] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        data = {k: v for k, v in asdict(self).items() if v is not None}
        return serialize_uuid(data)

@dataclass
class ChatSession:
    id: str
    type: str
    name: str
    avatar: str
    members: List[Dict[str, Any]]
    messages: List[Dict]
    last_message: str = ""
    time: str = ""
    unread: int = 0
    member_count: int = 2
    sender: Optional[str] = None
    profile_image: Optional[str] = None

    def to_dict(self) -> dict:
        return serialize_uuid(asdict(self))

class AIModelInterface(ABC):
    @abstractmethod
    async def generate_response(self, message: str, context: List[Dict]) -> str:
        pass

class SimpleAIModel(AIModelInterface):
    async def generate_response(self, message: str, context: List[Dict]) -> str:
        await asyncio.sleep(0)
        return f"I understand you said: {message}. This is a placeholder response."

class AIChatConsumer(AsyncWebsocketConsumer):
    active_chats: Dict[str, Dict[str, Any]] = {}
    ai_model: AIModelInterface = SimpleAIModel()
    
    AI_ASSISTANT = {
        "id": str(uuid.uuid4()),
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
        try:
            self.user = self.scope["user"]
            if not self.user.is_authenticated:
                logger.error("Unauthenticated user attempted to connect")
                await self.close()
                return
            
            self.user_channel = f'ai_chat_{self.user.id}'
            
            if str(self.user.id) not in self.active_chats:
                self.active_chats[str(self.user.id)] = {}
            
            await self.channel_layer.group_add(self.user_channel, self.channel_name)
            await self.accept()
            logger.info(f"User {self.user.id} connected to AI chat")
            
        except Exception as e:
            logger.error(f"Error in AI chat connect: {str(e)}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
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
        return str(uuid.uuid4())

    async def create_new_session(self) -> ChatSession:
        session_id = self.generate_session_id()
        user_data = {
            "id": str(self.user.id),
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
        
        self.active_chats[str(self.user.id)][session_id] = session.to_dict()
        return session

    async def send(self, text_data=None, bytes_data=None):
        """Override send method to use custom JSON encoder"""
        if text_data is not None:
            if isinstance(text_data, str):
                text_data = json.loads(text_data)
            await super().send(text_data=json.dumps(text_data, cls=UUIDEncoder))
        else:
            await super().send(bytes_data=bytes_data)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            session_id = data.get('session_id')
            message_type = data.get('message_type', MessageType.TEXT.value)

            if not consumers.validate_message_data(message_type, data):
                await self.send({
                    'type': 'error',
                    'message': 'Invalid message data'
                })
                return

            if not session_id:
                session = await self.create_new_session()
                session_id = session.id
                await self.send({
                    'type': 'chat_created',
                    'chat_id': session_id,
                    'message': 'New chat session created successfully'
                })

            message = await self.save_message(data, session_id, is_ai=False)
            if message:
                chat_session = self.active_chats[str(self.user.id)][session_id]
                chat_session["lastMessage"] = message["text_content"]
                chat_session["time"] = datetime.now().strftime("%I:%M:%S %p")
                
                await self.channel_layer.group_send(
                    self.user_channel,
                    {
                        'type': 'chat_message',
                        'session_id': session_id,
                        'message': message,
                        'is_ai': False
                    }
                )
                
                asyncio.create_task(self.process_ai_response(message['text_content'], session_id))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON in chat message")
            await self.send({
                'type': 'error',
                'message': 'Invalid message format'
            })
        except Exception as e:
            logger.error(f"Error handling chat message: {str(e)}", exc_info=True)
            await self.send({
                'type': 'error',
                'message': 'Internal server error'
            })

    async def save_message(self, data: Dict, session_id: str, is_ai: bool = False) -> Dict:
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            timestamp = datetime.now().isoformat()
            
            sender = self.AI_ASSISTANT if is_ai else chat_session["members"][0]
            message_id = str(uuid.uuid4())
            
            file_data = data.get('file', {})
            attachments = []
            if file_data:
                attachment = Attachment(
                    id=str(uuid.uuid4()),
                    file_type=file_data.get('type', ''),
                    file_name=file_data.get('name', ''),
                    file_path=file_data.get('path', ''),
                    file_size=file_data.get('size', 0),
                    created_at=timestamp
                )
                attachments = [attachment.to_dict()]

            receipt = MessageReceipt(
                id=str(uuid.uuid4()),
                user=self.AI_ASSISTANT if not is_ai else chat_session["members"][0]
            )

            message = ChatMessage(
                id=message_id,
                sender=sender,
                text_content=data.get('text', ''),
                content=data.get('content', {}),
                message_type=data.get('message_type', MessageType.TEXT.value),
                status=MessageStatus.SENT.value,
                created_at=timestamp,
                updated_at=timestamp,
                attachments=attachments,
                receipts=[receipt.to_dict()],
                metadata={}
            )
            
            message_dict = message.to_dict()
            chat_session["messages"].append(message_dict)
            return message_dict
            
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            return None

    async def process_ai_response(self, user_message: str, session_id: str):
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            recent_messages = chat_session.get("messages", [])[-5:]
            
            ai_response = await self.ai_model.generate_response(user_message, recent_messages)
            typing_delay = 1 + (len(ai_response) / 100)
            await asyncio.sleep(typing_delay)
            
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
        try:
            if event.get('is_ai', False):
                await asyncio.sleep(0.1)
            
            message_data = {
                'type': 'message',
                'session_id': event['session_id'],
                'message': event['message']
            }
            
            # Ensure all data is serializable
            message_data = serialize_uuid(message_data)
            await self.send(message_data)
            
        except Exception as e:
            logger.error(f"Error in chat_message: {str(e)}", exc_info=True)

    async def update_message_status(self, message_id: str, session_id: str, status: MessageStatus):
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            for message in chat_session["messages"]:
                if message["id"] == message_id:
                    message["status"] = status.value
                    message["updated_at"] = datetime.now().isoformat()
                    
                    status_data = {
                        'type': 'message_status_updated',
                        'session_id': session_id,
                        'message_id': message_id,
                        'status': status.value
                    }
                    
                    # Ensure data is serializable
                    status_data = serialize_uuid(status_data)
                    
                    await self.channel_layer.group_send(
                        self.user_channel,
                        status_data
                    )
                    break
                    
        except Exception as e:
            logger.error(f"Error updating message status: {str(e)}", exc_info=True)

    async def message_status_updated(self, event):
        """Handle message status update notifications"""
        try:
            # Ensure data is serializable
            update_data = {
                'type': 'status_update',
                'session_id': event['session_id'],
                'message_id': event['message_id'],
                'status': event['status']
            }
            update_data = serialize_uuid(update_data)
            await self.send(update_data)
            
        except Exception as e:
            logger.error(f"Error in message_status_updated: {str(e)}", exc_info=True)

    async def handle_file_upload(self, file_data: Dict, session_id: str) -> Optional[Dict]:
        """Handle file upload in messages"""
        try:
            timestamp = datetime.now().isoformat()
            
            attachment = Attachment(
                id=str(uuid.uuid4()),
                file_type=file_data.get('type', ''),
                file_name=file_data.get('name', ''),
                file_path=file_data.get('path', ''),
                file_size=file_data.get('size', 0),
                created_at=timestamp,
                file=file_data.get('content')
            )
            
            return attachment.to_dict()
            
        except Exception as e:
            logger.error(f"Error handling file upload: {str(e)}", exc_info=True)
            return None

    async def mark_messages_delivered(self, session_id: str):
        """Mark all undelivered messages as delivered"""
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            
            for message in chat_session["messages"]:
                if message["status"] == MessageStatus.SENT.value:
                    await self.update_message_status(
                        message["id"], 
                        session_id, 
                        MessageStatus.DELIVERED
                    )
                    
        except Exception as e:
            logger.error(f"Error marking messages delivered: {str(e)}", exc_info=True)

    async def mark_messages_read(self, session_id: str):
        """Mark all unread messages as read"""
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            
            for message in chat_session["messages"]:
                if message["status"] in [MessageStatus.SENT.value, MessageStatus.DELIVERED.value]:
                    await self.update_message_status(
                        message["id"],
                        session_id,
                        MessageStatus.READ
                    )
                    
        except Exception as e:
            logger.error(f"Error marking messages read: {str(e)}", exc_info=True)

    async def get_chat_history(self, session_id: str) -> List[Dict]:
        """Get chat history for a session"""
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            # Ensure all messages are serializable
            return [serialize_uuid(msg) for msg in chat_session.get("messages", [])]
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}", exc_info=True)
            return []

    async def delete_message(self, message_id: str, session_id: str):
        """Delete a specific message"""
        try:
            chat_session = self.active_chats[str(self.user.id)][session_id]
            
            for i, message in enumerate(chat_session["messages"]):
                if message["id"] == message_id:
                    message["deleted_at"] = datetime.now().isoformat()
                    message["status"] = MessageStatus.DELETED.value
                    
                    delete_data = {
                        'type': 'message_deleted',
                        'session_id': session_id,
                        'message_id': message_id
                    }
                    delete_data = serialize_uuid(delete_data)
                    
                    await self.channel_layer.group_send(
                        self.user_channel,
                        delete_data
                    )
                    break
                    
        except Exception as e:
            logger.error(f"Error deleting message: {str(e)}", exc_info=True)

    async def message_deleted(self, event):
        """Handle message deletion notifications"""
        try:
            delete_notification = {
                'type': 'message_deleted',
                'session_id': event['session_id'],
                'message_id': event['message_id']
            }
            delete_notification = serialize_uuid(delete_notification)
            await self.send(delete_notification)
            
        except Exception as e:
            logger.error(f"Error in message_deleted: {str(e)}", exc_info=True)

    @staticmethod
    def format_error_message(error: str) -> Dict:
        """Format error message for client"""
        return {
            'type': 'error',
            'message': str(error),
            'timestamp': datetime.now().isoformat()
        }