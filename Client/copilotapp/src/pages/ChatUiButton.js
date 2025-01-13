import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from 'antd';
import { MessageOutlined, CloseOutlined } from '@ant-design/icons';
import ChatList from './Chat/ChatList';
import ChatView from './Chat/ChatView';
import CreateGroupModal from './Chat/CreateGroupModal';
import AIChat from './Chat/AIChat';
import { styles } from './Chat/styles';
import { useAuth } from '../utils/auth';
import { chatapi, webSocket } from '../utils/socket';

const ChatUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  // Helper functions
  const getDisplayName = (participant) => {
    if (participant.first_name || participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`.trim();
    }
    return participant.username;
  };

  const getAvatarText = (participant) => {
    if (participant.first_name) {
      return participant.first_name[0].toUpperCase();
    }
    if (participant.username) {
      return participant.username[0].toUpperCase();
    }
    return null;
  };

  // Format chat data consistently
  const formatChatData = useCallback((chat) => {
    const otherParticipant = chat.type === 'private' 
      ? chat.participants?.find(p => p.email !== user.email)
      : null;

    const members = chat.type === 'group' 
      ? chat.members.map(member => ({
          id: member.user.id,
          email: member.user.email,
          username: member.user.username,
          profile_image: member.user.profile_image,
          is_active: member.user.is_active,
          first_name: member.user.first_name,
          last_name: member.user.last_name,
          display_name: getDisplayName(member.user),
          joined_at: member.joined_at,
          muted_until: member.muted_until,
          is_admin: chat.admins?.some(admin => admin.id === member.user.id) || false
        }))
      : chat.participants || [];

    const lastMessageData = chat.last_message || {};
    const lastMessageTime = lastMessageData.created_at
      ? new Date(lastMessageData.created_at).toLocaleTimeString()
      : '';

    const baseChat = {
      id: chat.id,
      type: chat.type || 'private',
      lastMessage: lastMessageData.text_content || '',
      time: lastMessageTime,
      unread: chat.unread_count || 0,
      members,
      memberCount: members.length,
      messages: chat.messages || [],
      created_at: chat.created_at,
      updated_at: chat.updated_at
    };

    if (chat.type === 'group') {
      return {
        ...baseChat,
        name: chat.name,
        profile_image: chat.image,
        description: chat.description || '',
        isAdmin: chat.admins 
          ? chat.admins.some(admin => admin.email === user.email)
          : members.some(m => m.email === user.email && m.is_admin),
        creator: chat.creator ? {
          id: chat.creator.id,
          email: chat.creator.email,
          username: chat.creator.username,
          display_name: getDisplayName(chat.creator)
        } : null
      };
    }

    return {
      ...baseChat,
      name: otherParticipant ? getDisplayName(otherParticipant) : 'Unknown User',
      avatar: otherParticipant ? getAvatarText(otherParticipant) : null,
      sender: lastMessageData.sender ? getDisplayName(lastMessageData.sender) : '',
      profile_image: otherParticipant?.profile_image || null
    };
  }, [user.email]);

  // WebSocket message handler
  const handleManagementMessage = useCallback((data) => {
    if (data.type === 'chats_list') {
      const formattedChats = data.chats.map(formatChatData);
      setChats(formattedChats);
    }
    
    if (data.type === 'group_created' || data.type === 'chat_created') {
      const chatData = data.type === 'group_created' ? data.group : data.chat;
      const formattedChat = formatChatData({
        ...chatData,
        type: data.type === 'group_created' ? 'group' : 'private'
      });
      
      setChats(prevChats => {
        const chatExists = prevChats.some(chat => chat.id === formattedChat.id);
        if (chatExists) {
          return prevChats.map(chat => 
            chat.id === formattedChat.id ? formattedChat : chat
          );
        }
        return [...prevChats, formattedChat];
      });
    }
  }, [formatChatData]);

  // Message handling
  const handleSendMessage = useCallback((data, id, type) => {
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === id && chat.type === type) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, data.message],
            lastMessage: data.message.text_content || '',
            time: new Date(data.message.created_at).toLocaleTimeString(),
            last_message: data.message,
            last_message_at: data.message.created_at
          };
          setSelectedChat(updatedChat);
          return updatedChat;
        }
        return chat;
      });
      return updatedChats;
    });
    setMessage('');
  }, []);

  // File upload handling
  const handleFileUpload = useCallback(async (file) => {
    const isImage = file.type.startsWith('image/');
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    const newMessage = {
      sender: 'You',
      type: isImage ? 'image' : 'file',
      fileName: file.name,
      fileSize: `${fileSizeMB} MB`,
      fileUrl: '#',
      url: isImage ? URL.createObjectURL(file) : null,
      created_at: new Date().toISOString()
    };

    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === selectedChat.id) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastMessage: `Sent a ${isImage ? 'photo' : 'file'}`,
            time: new Date().toLocaleTimeString()
          };
          setSelectedChat(updatedChat);
          return updatedChat;
        }
        return chat;
      });
      return updatedChats;
    });
  }, [selectedChat]);

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeChats = async () => {
      try {
        await chatapi.listAllChats();
        return () => {
          webSocket.offMessage('management', handleManagementMessage);
          webSocket.disconnect('management');
        };
      } catch (error) {
        console.error('Failed to initialize chats:', error);
      }
    };

    if (user?.email) {
      initializeChats();
    }
  }, [user, handleManagementMessage]);

  // WebSocket message subscription
  useEffect(() => {
    const unsubscribe = webSocket.onMessage("management", handleManagementMessage);
    return () => unsubscribe();
  }, [handleManagementMessage]);



  return (
    <>
      <div style={styles.container}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
          onClick={() => setIsOpen(!isOpen)}
          style={styles.chatButton}
        />

        <div style={{
          ...styles.chatContainer,
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        }}>
          {!selectedChat ? (
            <ChatList
              chats={chats}
              onSelectChat={setSelectedChat}
              onCreateGroup={() => setShowGroupModal(true)}
            />
          ) : (
            <ChatView
              chat={selectedChat}
              onBack={() => setSelectedChat(null)}
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>

        <CreateGroupModal

          visible={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          chats={chats.filter(chat => chat.type === 'private')}
          onSelectChat={setSelectedChat}
          onCreate={null}
        />
      </div>

      <AIChat />
    </>
  );
};

export default ChatUI;