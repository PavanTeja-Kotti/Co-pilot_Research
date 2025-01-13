import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button, Input, List, Typography, Avatar, Upload, message, theme } from "antd";
import {
  RobotOutlined,
  SendOutlined,
  PaperClipOutlined,
  FileOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { styles } from "./styles";
import { chatapi, webSocket } from "../../utils/socket";

const { TextArea } = Input;
const { Text } = Typography;
const { useToken } = theme;

const MessageBubble = ({ message, sender }) => {
  const isOwnMessage = sender === "sender";

  const renderContent = () => {
    switch (message.type) {
      case "file":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              backgroundColor: isOwnMessage ? "#1677ff" : "#ffffff",
              color: isOwnMessage ? "#ffffff" : "#000000",
              borderRadius: 16,
              cursor: "pointer",
            }}
          >
            <FileOutlined />
            <div>
              <div>{message.fileName}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {message.fileSize}
              </div>
            </div>
          </div>
        );
      case "image":
        return (
          <img
            src={message.url}
            alt="Uploaded"
            style={{
              maxWidth: "200px",
              borderRadius: 16,
              backgroundColor: "#ffffff",
            }}
          />
        );
      default:
        return (
          <Text
            style={{
              display: "inline-block",
              padding: "10px 12px",
              backgroundColor: isOwnMessage ? "#1677ff" : "#ffffff",
              color: isOwnMessage ? "#ffffff" : "#000000",
              borderRadius: 16,
              fontSize: 14,
              wordBreak: "break-word",
              boxShadow: !isOwnMessage ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {message.text}
          </Text>
        );
    }
  };

  return (
    <div
      style={{
        textAlign: isOwnMessage ? "right" : "left",
        marginBottom: 12,
        padding: "0 12px",
      }}
    >
      <div style={{ maxWidth: "75%", display: "inline-block" }}>
        {renderContent()}
      </div>
    </div>
  );
};

const Chat = ({ onclose }) => {
  const { token } = useToken();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleAIMessage = useCallback((data) => {
    if (data.type === 'message') {
      const msg = data.message;
      
      setMessages(prev => {
        // Check if message with this ID already exists
        const messageExists = prev.some(m => m.id === msg.id);
        if (messageExists) {
          return prev; // Don't add duplicate message
        }

        const newMessage = {
          id: msg.id,
          sender: msg.message_type === 'ai' ? 'receiver' : 'sender',
          text: msg.text_content,
          type: msg.content?.type || 'text',
          fileName: msg.content?.filename,
          fileSize: msg.content?.fileSize,
          url: msg.content?.url,
          timestamp: msg.timestamp || new Date().toISOString(),
          is_read: msg.is_read
        };

        return [...prev, newMessage];
      });
      
      setIsLoading(false);
      // Focus input after message is received
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else if (data.type === 'error') {
      message.error(data.message);
      setIsLoading(false);
      // Focus input after error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, []);

  useEffect(() => {
    const connectToAIChat = async () => {
      try {
        await chatapi.connectAIChat();
        setIsConnected(true);
        // Add initial welcome message with ID
        setMessages([{
          id: 'welcome-message',
          sender: "receiver",
          text: "Hello! How can I help you today?",
          type: "text",
          timestamp: new Date().toISOString(),
          is_read: true
        }]);
      } catch (error) {
        console.error('Failed to connect to AI chat:', error);
        message.error('Failed to connect to AI chat');
      }
    };

    chatapi.ws.onMessage('ai_chat', handleAIMessage);
    connectToAIChat();

    return () => {
      chatapi.disconnectAIChat();
      chatapi.ws.offMessage('ai_chat', handleAIMessage);
    };
  }, [handleAIMessage]);

  useEffect(() => {
    const unsubscribe = webSocket.onMessage('ai', handleAIMessage);
    return () => unsubscribe();
  }, [handleAIMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && isConnected && !isLoading) {
      try {
        setIsLoading(true);
        setInputMessage(""); // Clear input immediately

        // Send to WebSocket - don't manually add the message
        await chatapi.sendAIChatMessage(inputMessage);
      } catch (error) {
        console.error('Failed to send message:', error);
        message.error('Failed to send message');
        setIsLoading(false);
        // Focus input after error
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    }
  };

  const handleFileUpload = async (file) => {
    if (!isConnected || isLoading) {
      message.error('Cannot upload file at this time');
      return false;
    }

    const isImage = file.type.startsWith("image/");
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (fileSizeMB > 5) {
      message.error('File size should not exceed 5MB');
      return false;
    }

    try {
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Content = e.target.result;
        
        // Send file through WebSocket - don't manually add the message
        await chatapi.sendAIChatMessage(
          `Uploaded file: ${file.name}`, 
          'file',
          {
            filename: file.name,
            content: base64Content,
            fileType: file.type,
            fileSize: fileSizeMB,
            type: isImage ? 'image' : 'file',
            url: isImage ? URL.createObjectURL(file) : null
          }
        );
        // File message will be added by handleAIMessage when received from server
      };

      reader.onerror = () => {
        message.error('Failed to read file');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload file:', error);
      message.error('Failed to upload file');
      setIsLoading(false);
    }

    return false;
  };

  return (
    <div style={styles.aiChatContainer}>
      <div style={styles.aiChatHeader}>
        <Avatar style={{ backgroundColor: "#8B5CF6" }}>AI</Avatar>
        <div style={{ flex: 1 }}>
          <Text strong style={{ color: "#ffffff" }}>
            AI Assistant {!isConnected && "(Connecting...)"}
          </Text>
        </div>
        <Button
          type="text"
          onClick={onclose}
          icon={<CloseOutlined style={{ color: "#ffffff" }} />}
        />
      </div>

      <div className="custom-scroll" style={styles.aiChatMessages}>
        <style>
          {`
            .custom-scroll::-webkit-scrollbar {
              width: 1px;
              background-color: transparent;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
              background-color: ${token.colorTextQuaternary};
              border-radius: 20px;
            }
            .custom-scroll::-webkit-scrollbar-track {
              background-color: ${token.colorBgContainer};
            }
            .custom-scroll:hover::-webkit-scrollbar-thumb {
              background-color: ${token.colorTextTertiary};
            }
            .custom-scroll {
              scrollbar-width: thin;
              scrollbar-color: ${token.colorTextQuaternary} transparent;
            }
            .custom-scroll:hover {
              scrollbar-color: ${token.colorTextTertiary} transparent;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
              transition: background-color 0.2s;
            }
          `}
        </style>

        <List
          dataSource={messages}
          renderItem={(msg) => (
            <MessageBubble message={msg} sender={msg.sender} key={msg.id} />
          )}
        />
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.aiChatInput}>
        <div style={{ display: "flex", gap: 8 }}>
          <Upload
            showUploadList={false}
            beforeUpload={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt"
          >
            <Button
              icon={<PaperClipOutlined />}
              style={{
                backgroundColor: "#1A1A1A",
                borderColor: "#1A1A1A",
                color: "#fff",
                borderRadius: "20px",
              }}
              disabled={!isConnected || isLoading}
            />
          </Upload>
          <TextArea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isConnected ? (isLoading ? "AI is typing..." : "Type a message...") : "Connecting..."}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{
              flex: 1,
              backgroundColor: "#1A1A1A",
              borderColor: "#1A1A1A",
              color: "#fff",
              borderRadius: "20px",
              resize: "none",
              padding: "10px 12px",
              fontSize: "14px",
            }}
            disabled={!isConnected || isLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            style={{
              height: "auto",
              borderRadius: "20px",
              padding: "0 16px",
              backgroundColor: "#8B5CF6",
              border: "none",
            }}
            disabled={!isConnected || isLoading || !inputMessage.trim()}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<RobotOutlined />}
        onClick={() => setIsOpen(true)}
        style={{
          ...styles.aiChatButton,
          display: isOpen ? "none" : "flex",
        }}
      />

      {isOpen && <Chat onclose={() => {
        setIsOpen(false);
      }} />}
    </>
  );
};

export default AIChat;