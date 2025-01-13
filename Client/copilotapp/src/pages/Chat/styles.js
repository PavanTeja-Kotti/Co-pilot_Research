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
    header: {
      padding: '20px 16px',
      borderBottom: '1px solid #1f1f1f',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: 20
    },
    chatList: {
      flex: 1,
      overflowY: 'auto'
    },
    chatItem: {
      padding: '12px 16px',
      borderBottom: '1px solid #1f1f1f',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    },
    avatar: {
      backgroundColor: '#1677ff',
      marginRight: 12
    },
    chatItemContent: {
      flex: 1
    },
    messageBubbleContainer: {
      marginBottom: 12,
      padding: '0 12px'
    },
    messageBubble: {
      display: 'inline-block',
      padding: '10px 12px',
      borderRadius: 16,
      fontSize: 14,
      wordBreak: 'break-word'
    },
    inputContainer: {
      padding: '8px 12px',
      borderTop: '1px solid #1f1f1f'
    },
    input: {
      backgroundColor: '#1A1A1A',
      borderColor: '#1A1A1A',
      color: '#fff',
      resize: 'none',
      padding: '10px 12px',
      fontSize: '14px'
    },
    sendButton: {
      height: 'auto',
      border: 'none',
      padding: '0 16px'
    },
   aiChatContainer: {
    position: 'fixed',
    // top: 80, // Add space for header
    // bottom: 96,
    // right: 90,
    // width: 375,
    // height: 600,
    top: 40, // Add space for header
    bottom: 96,
    right: 90,
    width: 375,
    height: 500,

    backgroundColor: '#000000',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 999 // Ensure it's below header but above other content
  },
  aiChatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
    minHeight: 0,
    backgroundColor: '#000000'
  },
  aiChatInput: {
    padding: '8px 12px',
    borderTop: '1px solid #1f1f1f',
    backgroundColor: '#000000'
  },
  aiChatHeader: {
    padding: '16px',
    borderBottom: '1px solid #1f1f1f',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#000000'
  },
  aiChatButton: {
    position: 'fixed',
    bottom: 20,
    right: 90,
    zIndex: 1000,
    width: 56,
    height: 56,
    backgroundColor: '#8B5CF6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }
};
  
  // Message bubble styles based on sender
  export const getMessageBubbleStyle = (isOwnMessage) => ({
    backgroundColor: isOwnMessage ? '#1677ff' : '#ffffff',
    color: isOwnMessage ? '#ffffff' : '#000000',
    boxShadow: !isOwnMessage ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
  });