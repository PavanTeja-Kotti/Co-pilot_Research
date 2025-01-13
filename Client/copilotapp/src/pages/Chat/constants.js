export const sampleChats = [
  {
    id: 1,
    name: "Bob Wilson",
    avatar: "B",
    type: "private",
    lastMessage: "The project is ready for review",
    time: "11:20 AM",
    unread: 1,
    messages: [
      { sender: 'receiver', text: 'The project is ready for review', type: 'text' },
      { sender: 'sender', text: 'Great, I will take a look', type: 'text' },
      { sender: 'receiver', text: 'Thanks, let me know your thoughts', type: 'text' }
    ]
  },
  {
    id: 2,
    name: "Project Team",
    avatar: "PT",
    type: "group",
    members: ["Bob", "Alice", "John", "You"],
    lastMessage: "Meeting at 3 PM",
    time: "10:30 AM",
    unread: 3,
    messages: [
      { sender: 'Alice', text: 'Meeting at 3 PM', type: 'text' }
    ]
  }
];

// styles.js
export const styles = {
  container: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 1000
  },
  chatButton: {
    width: 56,
    height: 56,
    backgroundColor: '#1677ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  chatContainer: {
    position: 'fixed',
    bottom: 96,
    right: 20,
    width: 375,
    height: 600,
    maxHeight: 'calc(100vh - 116px)',
    backgroundColor: '#000000',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflow: 'hidden'
  },
  aiChatButton: {
    position: 'fixed',
    bottom: 20,
    right: 90,
    zIndex: 1000,
    backgroundColor: '#8B5CF6',
    color: '#fff'
  }
};