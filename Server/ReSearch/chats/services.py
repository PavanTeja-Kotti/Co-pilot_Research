# services.py
import json
import redis
from django.conf import settings
from datetime import datetime, timedelta

class RedisService:
    def __init__(self):
        self.redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True
        )
        
    def set_user_online(self, user_id, chat_id=None):
        """Set user as online"""
        key = f"online_users:{chat_id}" if chat_id else "online_users"
        self.redis.sadd(key, user_id)
        self.redis.set(f"user:{user_id}:last_seen", datetime.now().isoformat())

    def set_user_offline(self, user_id, chat_id=None):
        """Set user as offline"""
        key = f"online_users:{chat_id}" if chat_id else "online_users"
        self.redis.srem(key, user_id)
        self.redis.set(f"user:{user_id}:last_seen", datetime.now().isoformat())

    def get_online_users(self, chat_id=None):
        """Get online users"""
        key = f"online_users:{chat_id}" if chat_id else "online_users"
        return [int(uid) for uid in self.redis.smembers(key)]

    def get_user_last_seen(self, user_id):
        """Get user's last seen timestamp"""
        last_seen = self.redis.get(f"user:{user_id}:last_seen")
        return datetime.fromisoformat(last_seen) if last_seen else None

    def add_to_message_queue(self, user_id, message_data):
        """Add message to offline user's queue"""
        key = f"message_queue:{user_id}"
        self.redis.lpush(key, json.dumps(message_data))

    def get_message_queue(self, user_id):
        """Get all queued messages for user"""
        key = f"message_queue:{user_id}"
        messages = []
        while True:
            message = self.redis.rpop(key)
            if not message:
                break
            messages.append(json.loads(message))
        return messages

    def set_typing_status(self, user_id, chat_id, is_typing=True):
        """Set user's typing status"""
        key = f"typing:{chat_id}"
        if is_typing:
            self.redis.setex(key, 5, user_id)  # Expires after 5 seconds
        else:
            self.redis.delete(key)

    def get_typing_users(self, chat_id):
        """Get users currently typing in a chat"""
        key = f"typing:{chat_id}"
        user_id = self.redis.get(key)
        return [int(user_id)] if user_id else []