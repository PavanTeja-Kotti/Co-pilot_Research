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

const Chat = ({ uniqueID }) => {
  const { token } = useToken();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const { uploadFile } = useAuth();

  // Helper functions for session storage
  const getStorageKey = (uniqueId, sessionId) => `chat_${uniqueId}_${sessionId}`;
  
  const saveToSessionStorage = (messages, sessionId) => {

    console.log("Saving chat to session storage:", messages, sessionId, uniqueID);

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
      // Save to session storage after adding new message
      saveToSessionStorage(newMessages, messageData.session_id);
      return newMessages;
    });
  };

  const handleAIChatMessage = useCallback((data) => {
    if (data.type === "chat_created") {
      const newSessionId = data.chat_id;
      setSessionId(newSessionId);
      
      // Try to load existing chat
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
  }, [uniqueID,sessionId,addMessage]);

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
    // if (file.size > MAX_FILE_SIZE) {
    //   antMessage.error('File size should not exceed 50MB');
    //   return;
    // }

    // if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    //   antMessage.error('File type not supported');
    //   return;
    // }

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
        text: "ajshajkshjk",
        message_type: result.type,
        content: {},
        session_id: sessionId,
        file:result,
      });
      setInputMessage("");
      ///to do
    
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
        // Check if there's an existing session in storage
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
          // Use the most recent session
          const mostRecentSession = existingSessions[0];
          const storedChat = loadFromSessionStorage(mostRecentSession.sessionId);
          
          if (storedChat) {
            setSessionId(storedChat.sessionId);
            setMessages(storedChat.messages);
            
            // Reconnect to existing session
            await chatapi.connectAIChat()
            setIsConnected(true);
            setIsLoading(false);
            setIsWaitingForAI(false);

            return;
          }
        }

        // If no valid stored session, start new chat
        await chatapi.sendAIChatMessage({
          text: "Hello AI!",
          message_type: "TEXT",
          content: {},
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
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      flex: 1,
      backgroundColor: token.colorBgContainer,
    }}>
      <div ref={chatContainerRef} className="custom-scroll" style={styles.aiChatMessages}>
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
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              sender={msg.sender}
            />
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
              disabled={!isConnected || isLoading || isWaitingForAI}
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
            placeholder={
              !isConnected 
                ? "Connecting..." 
                : isWaitingForAI 
                  ? "Waiting for AI response..." 
                  : isLoading 
                    ? "AI is typing..." 
                    : "Type a message..."
            }
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
            disabled={!isConnected || isLoading || isWaitingForAI}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            style={{
              height: "auto",
              borderRadius: "20px",
              padding: "0 16px",
              // backgroundColor: "#8B5CF6",
              border: "none",
              backgroundColor: token.colorPrimary,
            }}
            disabled={!isConnected || isLoading || isWaitingForAI || !inputMessage.trim()}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;