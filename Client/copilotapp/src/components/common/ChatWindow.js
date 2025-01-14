import React, { useState } from "react";
import { Input, Button, List, Typography } from "antd";

const { Text } = Typography;

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;
    setMessages([...messages, { sender: "User", text: input }, { sender: "UI", text: input }]);
    setInput("");
  };

  return (
    <div style={{ height: "100%", padding: "16px", display: "flex", flexDirection: "column", background: "#1A1A1A" }}>
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
                  textAlign: "left", // Left-align the text inside the bubble
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