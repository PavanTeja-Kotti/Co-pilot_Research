import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  Button,
  Avatar,
  Typography,
  List,
  Space,
  Upload,
  theme,
  message as antMessage,
  Popconfirm,
  Mentions
} from "antd";
import {
  ArrowLeftOutlined,
  TeamOutlined,
  SendOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import MessageBubble from "./MessageBubble";
import { chatapi, webSocket } from "../../utils/socket";
import { useAuth } from "../../utils/auth";

const { useToken } = theme;
const { Text } = Typography;

const ALLOWED_FILE_TYPES = [
  "image/*",
  "video/*",
  "video/mkv",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-rar-compressed",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ChatView = ({
  chat,
  onBack,
  message,
  setMessage,
  onSendMessage,
  onFileUpload,
  messagesEndRef,
}) => {
  const { uploadFile } = useAuth();
  const { token } = useToken();
  const scrollRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(chat.messages.length);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const [mentionOptions, setMentionOptions] = useState([]);

  // Handle member search for mentions
  const onSearch = (searchValue, prefix) => {
    if (prefix === '@') {
      const filteredMembers = chat.members.filter(member => {
        const displayName = member.username;
        return displayName.toLowerCase().includes(searchValue.toLowerCase());
      });
      
      setMentionOptions(filteredMembers.map(member => {
        const displayName = member.username;
        return {
          key: member.id,
          value: displayName,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small">
                {displayName[0].toUpperCase()}
              </Avatar>
              <span>{displayName}</span>
            </div>
          )
        };
      }));
    }
  };

  // Handle scroll events
  const handleScroll = useCallback((e) => {
    const element = e.target;
    const isScrolledNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShouldAutoScroll(isScrolledNearBottom);
  }, []);

  // Initial scroll to bottom
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !chat.messages.length) return;

    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    if (
      chat.messages.length > lastMessageCountRef.current &&
      shouldAutoScroll
    ) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
    lastMessageCountRef.current = chat.messages.length;
  }, [chat.messages, shouldAutoScroll]);

  // Chat connection management
  useEffect(() => {
    const initializeChat = async () => {
      try {
        if (chat.type === "group") {
          await chatapi.joinGroup(chat.id);
        } else {
          await chatapi.joinChat(chat.id);
        }
      } catch (error) {
        console.error("Failed to connect to chat:", error);
        antMessage.error("Failed to connect to chat");
      }
    };

    if (chat.id) {
      initializeChat();
    }

    return () => {
      if (chat.id) {
        if (chat.type === "group") {
          chatapi.leaveGroup(chat.id);
        } else {
          chatapi.leaveChat(chat.id);
        }
      }
    };
  }, [chat.id, chat.type]);

  // Message websocket handling
  const handleMessage = useCallback(
    (data) => {
      onSendMessage(data, chat.id, chat.type);
    },
    [chat.id, chat.type, onSendMessage]
  );

  useEffect(() => {
    const unsubscribe = webSocket.onMessage(
      chat.type === "group" ? "group" : "chat",
      handleMessage
    );
    return () => unsubscribe();
  }, [handleMessage, chat.type]);

  // Extract mentions from message
  const extractMentions = (text) => {
    const mentions = [];
    const regex = /@(\w+)\s/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = chat.members.find(member => 
        member.username === mentionedName
      );
      
      if (mentionedUser) {
        mentions.push({
          name: mentionedName,
          id: mentionedUser.id
        });
      }
    }
    return mentions;
  };

  // Handle file uploads
  const handleFileUpload = async (file) => {
    if (file.size > MAX_FILE_SIZE) {
      antMessage.error('File size should not exceed 50MB');
      return false;
    }

    if (!ALLOWED_FILE_TYPES.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -2));
      }
      return type === file.type;
    })) {
      antMessage.error('File type not supported');
      return false;
    }

    setPendingFiles(prev => [...prev, {
      id: Date.now(),
      file,
      preview: URL.createObjectURL(file)
    }]);

    return false;
  };

  // Handle removing pending file
  const handleRemovePendingFile = (fileId) => {
    setPendingFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && pendingFiles.length === 0) return;
  
    try {
      const mentions = extractMentions(message);
      const uploadResults = [];
      const uploadErrors = [];
  
      // Upload all files first
      for (const pendingFile of pendingFiles) {
        const tempMessageId = `upload-${pendingFile.id}`;
        try {
          setUploadingFiles(prev => 
            new Map(prev).set(tempMessageId, {
              file: pendingFile.file,
              progress: 0,
              status: "uploading",
            })
          );
  
          const result = await uploadFile(pendingFile.file, (progress) => {
            setUploadingFiles(prev =>
              new Map(prev).set(tempMessageId, {
                file: pendingFile.file,
                progress,
                status: "uploading",
              })
            );
          });
  
          uploadResults.push({
            type: result.type,
            result: result
          });
  
          setUploadingFiles(prev => {
            const next = new Map(prev);
            next.delete(tempMessageId);
            return next;
          });
        } catch (error) {
          console.error("Failed to upload file:", error);
          uploadErrors.push(pendingFile.file.name);
          
          setUploadingFiles(prev =>
            new Map(prev).set(tempMessageId, {
              file: pendingFile.file,
              progress: 0,
              status: "error",
              error: error.message,
            })
          );
  
          setTimeout(() => {
            setUploadingFiles(prev => {
              const next = new Map(prev);
              next.delete(tempMessageId);
              return next;
            });
          }, 5000);
        }
      }
  
      // Determine message type and send accordingly
      if (uploadResults.length > 0) {
        const isMultiple = uploadResults.length > 1 || (uploadResults.length === 1 && trimmedMessage);
        
        if (isMultiple) {
          // Send as MULTIPLE if there are multiple files or one file with text
          if (trimmedMessage) {
            if (chat.type === "group") {
              await chatapi.sendGroupMessage(chat.id, trimmedMessage, 'MULTIPLE', uploadResults, mentions);
            } else {
              await chatapi.sendChatMessage(chat.id, trimmedMessage, 'MULTIPLE', uploadResults, mentions);
            }
            setMessage("");
          } else {
            if (chat.type === "group") {
              await chatapi.sendGroupMessage(chat.id, null, 'MULTIPLE', uploadResults, mentions);
            } else {
              await chatapi.sendChatMessage(chat.id, null, 'MULTIPLE', uploadResults, mentions);
            }
          }
        } else {
          // Send as single file type if there's just one file without text
          const singleUpload = uploadResults[0];
          if (chat.type === "group") {
            await chatapi.sendGroupMessage(chat.id, null, singleUpload.type, singleUpload.result, mentions);
          } else {
            await chatapi.sendChatMessage(chat.id, null, singleUpload.type, singleUpload.result, mentions);
          }
        }
      } else if (trimmedMessage) {
        // Send text only message if no files were uploaded successfully
        if (chat.type === "group") {
          await chatapi.sendGroupMessage(chat.id, trimmedMessage, 'TEXT', null, mentions);
        } else {
          await chatapi.sendChatMessage(chat.id, trimmedMessage, 'TEXT', null, mentions);
        }
        setMessage("");
      }
  
      // Show errors if any files failed to upload
      if (uploadErrors.length > 0) {
        antMessage.error(`Failed to upload: ${uploadErrors.join(', ')}`);
      }
  
      // Clear pending files
      setPendingFiles([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      antMessage.error("Failed to send message");
    }
  };

  // Render message list
  const renderMessages = () => {
    const uploadingMessages = Array.from(uploadingFiles.entries()).map(
      ([id, data]) => ({
        id,
        type: "file-upload",
        content: data.file.name,
        progress: data.progress,
        status: data.status,
        error: data.error,
        sender: { id: "self" },
        timestamp: Date.now(),
      })
    );

    const allMessages = [...chat.messages, ...uploadingMessages].sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );

    return (
      <List
        dataSource={allMessages}
        renderItem={(msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            sender={msg.sender}
            type={chat.type}
          />
        )}
      />
    );
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: token.colorBgContainer,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1f1f1f",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ color: "#ffffff" }} />}
          onClick={onBack}
          style={{ padding: 0 }}
        />
        <Avatar
          style={{ backgroundColor: "#1677ff" }}
          icon={chat.type === "group" ? <TeamOutlined /> : null}
        >
          {chat.avatar}
        </Avatar>
        <div style={{ flex: 1 }}>
          <Text strong style={{ color: "#ffffff", display: "block" }}>
            {chat.name}
          </Text>
          {chat.type === "group" && (
            <Text style={{ color: "#8c8c8c", fontSize: 12 }}>
              {chat.members
                .map((member) => member.display_name || member.username)
                .join(", ")}
            </Text>
          )}
        </div>

        <Popconfirm
          title="Are you sure to delete this chat?"
          onConfirm={async () => {
            if (chat.type === "group") {
              await chatapi.deleteGroup(chat.id);
            } else {
              await chatapi.deleteChat(chat.id);
            }
          }}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<DeleteOutlined style={{ color: "red" }} />} />
        </Popconfirm>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="custom-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 0",
        }}
        onScroll={handleScroll}
      >
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

        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {/* Input Area */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #1f1f1f",
          paddingBottom: 5,
        }}
      >
        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <div style={{ 
            padding: "8px 0", 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "8px" 
          }}>
            {pendingFiles.map(file => (
              <div
                key={file.id}
                style={{
                  position: "relative",
                  backgroundColor: "#2d2d2d",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span style={{ color: "#fff", fontSize: "12px" }}>
                  {file.file.name}
                </span>
                <CloseCircleOutlined
                  style={{ color: "#ff4d4f", cursor: "pointer" }}
                  onClick={() => handleRemovePendingFile(file.id)}
                />
              </div>
            ))}
          </div>
        )}
        
        <Space.Compact style={{ width: "100%", display: "flex", gap: 8 }}>
          <Upload
            showUploadList={false}
            beforeUpload={handleFileUpload}
            accept={ALLOWED_FILE_TYPES.join(',')}
          >
            <Button
              icon={<PaperClipOutlined />}
              style={{
                backgroundColor: "#1A1A1A",
                borderColor: "#1A1A1A",
                color: "#fff",
                borderRadius: "20px",
              }}
            />
          </Upload>
          <Mentions
            value={message}
            onChange={setMessage}
            onSearch={onSearch}
            options={mentionOptions}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type @ to mention someone"
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
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            style={{
              zIndex: 1,
              height: "auto",
              border: "none",
              padding: "0 16px",
              borderRadius: "20px",
            }}
          />
        </Space.Compact>
      </div>

      {/* Custom scrollbar styles */}
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
    </div>
  );
};

export default ChatView;