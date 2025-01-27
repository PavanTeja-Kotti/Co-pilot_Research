import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  Input,
  List,
  Typography,
  Upload,
  message,
  theme,
} from "antd";
import {
  SendOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import MessageBubble from "./MessageBubble";
import { styles } from "./styles";
import { chatapi } from "../../utils/socket";
import { useAuth } from "../../utils/auth";

const { TextArea } = Input;
const { useToken } = theme;

// Loading Animation Component
const LoadingAnimation = () => {
  const { token } = useToken();

  return (
    <div className="loading-container">
      <style>
        {`
          .loading-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${token.colorBgContainer};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeOut 0.5s ease-out 2s forwards;
          }

          .loading-logo {
            width: 60px;
            height: 60px;
            border: 3px solid ${token.colorPrimary};
            border-radius: 50%;
            animation: pulse 1.5s ease-out infinite;
          }

          .loading-text {
            margin-top: 20px;
            font-size: 18px;
            color: ${token.colorTextSecondary};
            opacity: 0;
            animation: slideUp 0.5s ease-out 0.5s forwards;
          }

          .loading-dots {
            display: flex;
            gap: 6px;
            margin-top: 12px;
          }

          .loading-dot {
            width: 8px;
            height: 8px;
            background-color: ${token.colorPrimary};
            border-radius: 50%;
            animation: bounce 1s infinite;
          }

          .loading-dot:nth-child(2) {
            animation-delay: 0.2s;
          }

          .loading-dot:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes fadeOut {
            from {
              opacity: 1;
              visibility: visible;
            }
            to {
              opacity: 0;
              visibility: hidden;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .chat-container {
            opacity: 0;
            animation: fadeIn 0.5s ease-out 2.2s forwards;
          }
        `}
      </style>
      <div className="loading-logo" />
      <div className="loading-text">Initializing Chat</div>
      <div className="loading-dots">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  );
};

const Chat = ({ uniqueID, paper = null }) => {
  const { token } = useToken();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const { uploadFile, addUploadedFiles } = useAuth();
  const [processedFiles, setProcessedFiles] = useState(new Set()); 

  useEffect(() => {
    // Check for new files that haven't been processed yet
    addUploadedFiles.forEach((file) => {
        if (!processedFiles.has(file.name)) {
            handleFileUpload(file); // Call the upload function
            setProcessedFiles((prev) => new Set(prev).add(file.name)); // Mark file as processed
        }
    });
}, [addUploadedFiles]);

  // Helper functions for session storage
  const getStorageKey = (uniqueId, sessionId) => `chat_${uniqueId}_${sessionId}`;

  const saveToSessionStorage = (messages, sessionId) => {
    if (!uniqueID || !sessionId) return;
    const key = getStorageKey(uniqueID, sessionId);
    sessionStorage.setItem(key, JSON.stringify({
      messages,
      sessionId,
      lastUpdated: new Date().toISOString()
    }));
  };

  const loadFromSessionStorage = (sessionId) => {
    if (!uniqueID || !sessionId) return null;
    const key = getStorageKey(uniqueID, sessionId);
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored chat:', error);
        return null;
      }
    }
    return null;
  };

  const addMessage = (messageData) => {
    setMessages(prev => {
      const messageExists = prev.some(m => m.id === messageData.id);
      if (messageExists) return prev;
      const newMessages = [...prev, messageData];
      saveToSessionStorage(newMessages, messageData.session_id);
      return newMessages;
    });
  };

  const handleAIChatMessage = useCallback((data) => {
    if (data.type === "chat_created") {
      const newSessionId = data.chat_id;
      setSessionId(newSessionId);

      const existingChat = loadFromSessionStorage(newSessionId);
      if (existingChat) {
        setMessages(existingChat.messages);
      }

      setIsConnected(true);
      setIsLoading(false);
      setIsWaitingForAI(false);
    } else if (data.type === "message") {
      const msg = data.message;
      const currentSessionId = data.session_id || sessionId;

      if (currentSessionId) {
        addMessage({
          id: msg.id,
          sender: msg.sender,
          text_content: msg.text_content,
          content: msg.content || {},
          message_type: msg.message_type,
          status: msg.status,
          attachments: msg.attachments || [],
          created_at: msg.created_at,
          receipts: msg.receipts || [],
          metadata: msg.metadata || {},
          session_id: currentSessionId,
        });
      }

      if (msg.sender.username === "AI Assistant") {
        setIsLoading(false);
        setIsWaitingForAI(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    } else if (data.type === "error") {
      message.error(data.message);
      setIsLoading(false);
      setIsWaitingForAI(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [uniqueID, sessionId, addMessage]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && isConnected && !isLoading && !isWaitingForAI) {
      try {
        setIsLoading(true);
        setIsWaitingForAI(true);

        const messageToSend = inputMessage;
        setInputMessage("");

        await chatapi.sendAIChatMessage({
          text: messageToSend,
          message_type: "TEXT",
          content: {},
          session_id: sessionId,
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        message.error("Failed to send message");
        setIsLoading(false);
        setIsWaitingForAI(false);

        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    }
  };

  const handleFileUpload = async (file) => {
    const tempMessageId = `upload-${Date.now()}`;

    try {
      setUploadingFiles((prev) =>
        new Map(prev).set(tempMessageId, {
          file,
          progress: 0,
          status: "uploading",
        })
      );

      const result = await uploadFile(file, (progress) => {
        setUploadingFiles((prev) =>
          new Map(prev).set(tempMessageId, {
            file,
            progress,
            status: "uploading",
          })
        );
      });

      setUploadingFiles((prev) =>
        new Map(prev).set(tempMessageId, {
          file,
          progress: 100,
          status: "done",
          result,
        })
      );

      await chatapi.sendAIChatMessage({
        text: "File uploaded",
        message_type: result.type,
        content: {},
        session_id: sessionId,
        file: result,
      });
      setInputMessage("");

      setTimeout(() => {
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.delete(tempMessageId);
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to upload file:", error);
      message.error("Failed to upload file");

      setUploadingFiles((prev) =>
        new Map(prev).set(tempMessageId, {
          file,
          progress: 0,
          status: "error",
          error: error.message,
        })
      );

      setTimeout(() => {
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.delete(tempMessageId);
          return next;
        });
      }, 5000);
    }
  };

  // Initialize chat connection
  useEffect(() => {
    const connectToAIChat = async () => {
      try {
        const existingSessions = Object.keys(sessionStorage)
          .filter(key => key.startsWith(`chat_${uniqueID}_`))
          .map(key => {
            const data = JSON.parse(sessionStorage.getItem(key));
            return {
              key,
              sessionId: data.sessionId,
              lastUpdated: new Date(data.lastUpdated)
            };
          })
          .sort((a, b) => b.lastUpdated - a.lastUpdated);

        if (existingSessions.length > 0) {
          const mostRecentSession = existingSessions[0];
          const storedChat = loadFromSessionStorage(mostRecentSession.sessionId);

          if (storedChat) {
            setSessionId(storedChat.sessionId);
            setMessages(storedChat.messages);

            await chatapi.connectAIChat();
            setIsConnected(true);
            setIsLoading(false);
            setIsWaitingForAI(false);
            return;
          }
        }

        await chatapi.sendAIChatMessage({
          text: "Hello AI!",
          message_type: "TEXT",
          content: {},
          file: paper ? {
            "message": "File uploaded successfully",
            "path": paper.pdf_url,
            "file_type": "PDF",
            "type": "DOCUMENT",
            "name": "PDF FILE",
            "size": 0,
          } : null
        });
      } catch (error) {
        console.error("Failed to connect to AI chat:", error);
        message.error("Failed to connect to AI chat");
      }
    };

    chatapi.ws.onMessage("ai", handleAIChatMessage);
    connectToAIChat();

    return () => {
      chatapi.disconnectAIChat();
      chatapi.ws.offMessage("ai", handleAIChatMessage);
    };
  }, [uniqueID]);

  // Initial loading animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  return (
    <div style={{ position: 'relative', height: "100%", flex: 1 }}>
      {initialLoading && <LoadingAnimation />}
      <div className="chat-container" style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: token.colorBgContainer,
      }}>
        <div ref={chatContainerRef} className="custom-scroll" style={styles.aiChatMessages}>
          <style>
            {`
              .message-enter {
                animation: slideIn 0.3s ease-out forwards;
              }

              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

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

              .send-button-active {
                transform: scale(1);
                transition: transform 0.2s ease;
              }
              
              .send-button-active:hover {
                transform: scale(1.05);
              }
              
              .send-button-active:active {
                transform: scale(0.95);
              }
            `}
          </style>
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <div className="message-enter">
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  sender={msg.sender}
                />
              </div>
            )}
          />
          {isLoading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px',
              opacity: 0,
              animation: 'fadeIn 0.3s ease-out forwards'
            }}>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.aiChatInput} className="chat-input-container">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

            {/* Input Text Area */}
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
              placeholder={
                !isConnected
                  ? "Connecting..."
                  : isWaitingForAI
                    ? "Waiting for AI response..."
                    : isLoading
                      ? "AI is typing..."
                      : "Type a message..."
              }
              autoSize={false} // Fixed height for boxy design
              style={{
                flex: 1,
                height: "32px", // Reduced height for compact design
                backgroundColor: "#1A1A1A",
                borderColor: "#1A1A1A",
                color: "#fff",
                borderRadius: "3px", // Boxy design with minimal rounding
                padding: "6px 10px",
                fontSize: "14px",
                lineHeight: "1.4", // Adjusted line height for compactness
                resize: "none",
                transition: "border-color 0.3s ease",
                overflow: "hidden",
              }}
              disabled={!isConnected || isLoading || isWaitingForAI}
            />

            {/* Send Button */}
            <Button
              type="primary"
              onClick={handleSendMessage}
              style={{
                height: "32px", // Match the height of the text area and upload button
                borderRadius: "3px", // Boxy design with minimal rounding
                padding: "0 16px",
                backgroundColor: token.colorPrimary, // Ant Design primary color
                borderColor: "#1890ff",
                color: "#fff",
                fontWeight: "500",
              }}
              disabled={!isConnected || isLoading || isWaitingForAI || !inputMessage.trim()}
              loading={isLoading}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;