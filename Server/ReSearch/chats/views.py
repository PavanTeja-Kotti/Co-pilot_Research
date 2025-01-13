from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Exists, OuterRef
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Chat, GroupChat, Message, MessageReceipt, GroupMembership
from .serializers import (
    ChatSerializer, 
    GroupChatSerializer, 
    MessageSerializer, 
    MessageCreateSerializer,
    GroupMembershipSerializer
)
from .services import RedisService

redis_service = RedisService()

# Chat views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_list(request):
    """Get list of user's chats with unread counts and last messages"""
    chats = Chat.objects.filter(
        participants=request.user,
        is_active=True
    ).annotate(
        unread_count=Count(
            'messages',
            filter=Q(
                messages__receipts__user=request.user,
                messages__receipts__read_at__isnull=True,
                messages__deleted_at__isnull=True
            )
        )
    ).order_by('-last_message_at')
    
    serializer = ChatSerializer(chats, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_chat(request):
    """Create a new chat with another user"""
    participant_id = request.data.get('participant_id')
    if not participant_id:
        return Response(
            {'error': 'participant_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    # Check if chat already exists
    existing_chat = Chat.objects.filter(
        participants=request.user
    ).filter(
        participants=participant_id
    ).first()
    
    if existing_chat:
        serializer = ChatSerializer(existing_chat, context={'request': request})
        return Response(serializer.data)
        
    # Create new chat
    chat = Chat.objects.create()
    chat.participants.add(request.user, participant_id)
    
    serializer = ChatSerializer(chat, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_detail(request, chat_id):
    """Get chat details"""
    chat = get_object_or_404(
        Chat.objects.filter(participants=request.user),
        id=chat_id
    )
    serializer = ChatSerializer(chat, context={'request': request})
    return Response(serializer.data)

# Group chat views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_list(request):
    """Get list of user's group chats"""
    groups = GroupChat.objects.filter(
        members=request.user,
        is_active=True
    ).annotate(
        unread_count=Count(
            'messages',
            filter=Q(
                messages__receipts__user=request.user,
                messages__receipts__read_at__isnull=True,
                messages__deleted_at__isnull=True
            )
        )
    ).order_by('-last_message_at')
    
    serializer = GroupChatSerializer(groups, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_group(request):
    """Create a new group chat"""
    name = request.data.get('name')
    if not name:
        return Response(
            {'error': 'name is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    group = GroupChat.objects.create(
        name=name,
        description=request.data.get('description', ''),
        creator=request.user
    )
    group.members.add(request.user)
    group.admins.add(request.user)
    
    # Add other members if provided
    member_ids = request.data.get('member_ids', [])
    for member_id in member_ids:
        GroupMembership.objects.create(
            group=group,
            user_id=member_id
        )
    
    serializer = GroupChatSerializer(group, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_detail(request, group_id):
    """Get group chat details"""
    group = get_object_or_404(
        GroupChat.objects.filter(members=request.user),
        id=group_id
    )
    serializer = GroupChatSerializer(group, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_group_member(request, group_id):
    """Add a member to group chat"""
    group = get_object_or_404(
        GroupChat.objects.filter(admins=request.user),
        id=group_id
    )
    
    user_id = request.data.get('user_id')
    if not user_id:
        return Response(
            {'error': 'user_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    membership, created = GroupMembership.objects.get_or_create(
        group=group,
        user_id=user_id,
        defaults={'is_active': True}
    )
    
    if not created and not membership.is_active:
        membership.is_active = True
        membership.left_at = None
        membership.save()
        
    return Response({'status': 'member added'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_group_member(request, group_id):
    """Remove a member from group chat"""
    group = get_object_or_404(
        GroupChat.objects.filter(admins=request.user),
        id=group_id
    )
    
    user_id = request.data.get('user_id')
    if not user_id:
        return Response(
            {'error': 'user_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    membership = get_object_or_404(
        GroupMembership,
        group=group,
        user_id=user_id,
        is_active=True
    )
    
    membership.is_active = False
    membership.left_at = timezone.now()
    membership.save()
    
    return Response({'status': 'member removed'})

# Message views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def message_list(request):
    """Get messages for a chat or group chat"""
    chat_id = request.query_params.get('chat_id')
    group_id = request.query_params.get('group_id')
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 50))
    
    if not (chat_id or group_id):
        return Response(
            {'error': 'chat_id or group_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    messages = Message.objects.filter(deleted_at__isnull=True)
    
    if chat_id:
        chat = get_object_or_404(
            Chat.objects.filter(participants=request.user),
            id=chat_id
        )
        messages = messages.filter(chat=chat)
    else:
        group = get_object_or_404(
            GroupChat.objects.filter(members=request.user),
            id=group_id
        )
        messages = messages.filter(group_chat=group)
        
    # Paginate messages
    start = (page - 1) * page_size
    end = start + page_size
    messages = messages.order_by('-created_at')[start:end]
    
    serializer = MessageSerializer(messages, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_message(request):
    """Create a new message"""
    serializer = MessageCreateSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        message = serializer.save(sender=request.user)
        
        # Update last_message_at
        if message.chat:
            message.chat.last_message_at = timezone.now()
            message.chat.save()
        else:
            message.group_chat.last_message_at = timezone.now()
            message.group_chat.save()
            
        # Create receipts for other participants
        if message.chat:
            participants = message.chat.participants.exclude(id=request.user.id)
        else:
            participants = message.group_chat.members.exclude(id=request.user.id)
            
        for participant in participants:
            MessageReceipt.objects.create(
                message=message,
                user=participant
            )
            
            # Add to Redis queue for offline users
            if participant.id not in redis_service.get_online_users(
                message.chat.id if message.chat else message.group_chat.id
            ):
                redis_service.add_to_message_queue(
                    participant.id,
                    MessageSerializer(message).data
                )
        
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_read(request):
    """Mark multiple messages as read"""
    message_ids = request.data.get('message_ids', [])
    if not message_ids:
        return Response(
            {'error': 'message_ids is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    receipts = MessageReceipt.objects.filter(
        message_id__in=message_ids,
        user=request.user,
        read_at__isnull=True
    )
    
    for receipt in receipts:
        receipt.mark_as_read()
        
    return Response({'status': 'messages marked as read'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """Soft delete a message"""
    message = get_object_or_404(
        Message.objects.filter(sender=request.user),
        id=message_id
    )
    message.soft_delete()
    return Response({'status': 'message deleted'})