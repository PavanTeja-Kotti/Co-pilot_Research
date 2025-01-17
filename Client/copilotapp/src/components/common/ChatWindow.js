import React, { useState, useEffect } from "react";
import { Input, Button, List, Typography } from "antd";
import useWebSocket from "react-use-websocket";

const { Text } = Typography;

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Connect to the WebSocket server
  const { sendMessage, lastMessage } = useWebSocket("ws://127.0.0.1:8000/ws/chat/", {
    onOpen: () => console.log("Connected to WebSocket"),
    onClose: () => console.log("Disconnected from WebSocket"),
  });

  // Add the incoming WebSocket message to the chat
  useEffect(() => {
    if (lastMessage !== null) {
      const messageData = JSON.parse(lastMessage.data);
      setMessages((prev) => [...prev, { sender: "UI", text: messageData.message }]);
    }
  }, [lastMessage]);

  const handleSend = () => {
    if (input.trim() === "") return;

    // Add user message to chat
    setMessages([...messages, { sender: "User", text: input }]);

    // Send user message to the WebSocket server
    sendMessage(JSON.stringify({ message: input }));

    // Clear input
    setInput("");
  };

  return (
    <div
      style={{
        height: "100%",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        background: "#1A1A1A",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px" }}>
        <List
          dataSource={messages}
          renderItem={(message, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: message.sender === "User" ? "flex-end" : "flex-start",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "10px 15px",
                  borderRadius: "15px",
                  color: "#fff",
                  backgroundColor: message.sender === "User" ? "#1890FF" : "#333333",
                  textAlign: "left",
                  wordWrap: "break-word",
                }}
              >
                <Text>{message.text}</Text>
              </div>
            </div>
          )}
        />
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <Input
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
        />
        <Button type="primary" onClick={handleSend}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatWindow;
