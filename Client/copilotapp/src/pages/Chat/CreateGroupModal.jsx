import React, { useState, useCallback, useEffect } from "react";
import { Modal, Space, Input, Select, Typography, Tabs, List, Avatar } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import debounce from "lodash/debounce";
import { chatapi } from "../../utils/socket";
import api from "../../utils/api";
import { useAuth } from "../../utils/auth";

const { TextArea } = Input;
const { Text } = Typography;


const ChatModal = ({ visible, onClose,chats, onSelectChat, onCreate }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("private");
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  // Group chat state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // Private chat state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Fetch initial users when tab opens
  useEffect(() => {
    const fetchInitialUsers = async () => {
      setSearching(true);
      try {
        const res = await api.accounts().serachUser("");  // Empty search to get initial 20 users
        setFilteredUsers(res.data);
      } catch (error) {
        console.error("Failed to fetch initial users:", error);
        setFilteredUsers([]);
      } finally {
        setSearching(false);
      }
    };

    if (visible && activeTab === "private") {
      setSearchTerm("");
      fetchInitialUsers();
    }
  }, [visible, activeTab]);

  // Handle private chat search
  const handlePrivateSearch = useCallback(
    debounce(async (value) => {
      setSearchTerm(value);
      setSearching(true);
      try {
        const res = await api.accounts().serachUser(value); // Will return initial 20 if value is empty
        setFilteredUsers(res.data);
      } catch (error) {
        console.error("Search failed:", error);
        setFilteredUsers([]);
      } finally {
        setSearching(false);
      }
    }, 500),
    []
  );

  // Debounced search function for group
  const debouncedSearch = useCallback(
    debounce(async (searchValue) => {
      if (searchValue.trim()) {
        setSearching(true);
        try {
          const res = await api.accounts().serachUser(searchValue);
          const options = res.data.map((user) => ({
            label: user.name || user.username,
            value: user.id,
            user: user,
          }));
          setSearchResults(options);
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500),
    []
  );

  const handleCreate = async () => {
    if (activeTab === "private" && selectedUser) {

      const exstingchat=chats.find(chat => chat.type === 'private' && chat.members.some(member => member.id === selectedUser.id));

      if(exstingchat){
        if (onSelectChat) {
          onSelectChat(exstingchat);
        }
        handleClose();
        return;
      }
     
      await chatapi.createChat([selectedUser.id]);
      if (onCreate) onCreate();
      handleClose();
    } else if (activeTab === "group" && groupName.trim()) {
      await chatapi.createGroup(
        groupName,
        selectedGroupMembers.map((member) => member.value) || [],
        groupDescription
      );
      if (onCreate) onCreate();
      handleClose();
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setSelectedGroupMembers([]);
    setSelectedUser(null);
    setSearchResults([]);
    setSearchTerm("");
    setSearching(false);
    onClose();
  };

  const isCreateDisabled = () => {
    if (activeTab === "private") {
      return !selectedUser;
    }
    return !groupName.trim();
  };

  const items = [
    {
      key: "private",
      label: "Private Chat",
      children: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Input.Search
            placeholder="Search users"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handlePrivateSearch(e.target.value);
            }}
            style={{
              color: 'rgba(255, 255, 255, 0.85)'
            }}
            loading={searching}
          />
          <List
            dataSource={filteredUsers}
            renderItem={(user) => (
              <List.Item
                onClick={() => setSelectedUser(user)}
                className="cursor-pointer"
                style={{
                  padding: '8px',
                  margin: '4px 0',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: selectedUser?.id === user.id ? 'rgba(24, 144, 255, 0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: selectedUser?.id === user.id ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'
                  }
                }}
                onMouseEnter={(e) => {
                  if (!selectedUser || selectedUser.id !== user.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedUser || selectedUser.id !== user.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <List.Item.Meta
                  avatar={<Avatar src={user.avatar} />}
                  title={user.name || user.username}
                  description={user.email}
                />
              </List.Item>
            )}
            style={{ 
              maxHeight: "300px", 
              overflow: "auto",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.3)"
            }}
          />
        </Space>
      ),
    },
    {
      key: "group",
      label: "Group Chat",
      children: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text strong>Group Name</Text>
            <Input
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <Text strong>Description</Text>
            <TextArea
              placeholder="Enter group description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Text strong>Members</Text>
            <Select
              mode="multiple"
              placeholder="Search and select members"
              value={selectedGroupMembers.map((member) => member.value)}
              onChange={(values, options) => setSelectedGroupMembers(options)}
              onSearch={debouncedSearch}
              loading={searching}
              options={searchResults}
              filterOption={false}
              style={{ width: "100%" }}
              notFoundContent={searching ? "Searching..." : "No users found"}
            />
          </div>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="Create Chat"
      open={visible}
      onCancel={handleClose}
      onOk={handleCreate}
      okButtonProps={{
        disabled: isCreateDisabled(),
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        style={{ marginTop: -16 }}
      />
    </Modal>
  );
};

export default ChatModal;