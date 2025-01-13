import api from "./api";

class WebSocketService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || api.baseURL.replace('http://', '');
        this.sockets = new Map();
        this.messageQueues = new Map();
        this.reconnectAttempts = new Map();
        this.connectionStates = new Map();
        this.pendingConnections = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageHandlers = new Map();
        this.connectionTimeout = 5000;
        this.tokenType = 'Bearer';
        this.authErrorHandlers = new Set();
        this.exitHandlers = new Set();
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.reconnect = this.reconnect.bind(this);
        this.send = this.send.bind(this);
        this.cleanup = this.cleanup.bind(this);
        // this.handleAppExit = this.handleAppExit.bind(this);
        
        // Setup exit handlers
        // this.setupExitHandlers();
    }

    // Exit Handling Methods
    setupExitHandlers() {
        // Handle browser window close
        window.addEventListener('beforeunload', this.handleAppExit);
        
        // Handle mobile app state changes
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.handleAppExit();
                }
            });
        }

        // Handle process termination (if in Node.js environment)
        if (typeof process !== 'undefined') {
            process.on('SIGTERM', this.handleAppExit);
            process.on('SIGINT', this.handleAppExit);
        }
    }

    removeExitHandlers() {
        window.removeEventListener('beforeunload', this.handleAppExit);
        
        if (typeof document !== 'undefined' && document.removeEventListener) {
            document.removeEventListener('visibilitychange', this.handleAppExit);
        }

        if (typeof process !== 'undefined') {
            process.off('SIGTERM', this.handleAppExit);
            process.off('SIGINT', this.handleAppExit);
        }
    }

    async handleAppExit() {
        console.log('App exit detected, cleaning up WebSocket connections...');
        
        // Notify exit handlers
        this.exitHandlers.forEach(handler => handler());
        
        // Close all open sockets gracefully
        const closePromises = [];
        
        for (const [socketKey, socket] of this.sockets.entries()) {
            if (socket.readyState === WebSocket.OPEN) {
                closePromises.push(
                    new Promise((resolve) => {
                        socket.addEventListener('close', resolve, { once: true });
                        this.setConnectionState(socketKey, 'disconnecting');
                        socket.close(1000, 'Application exit');
                    })
                );
            }
        }

        // Wait for all sockets to close with a timeout
        try {
            await Promise.race([
                Promise.all(closePromises),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Socket close timeout')), 1000)
                )
            ]);
        } catch (error) {
            console.warn('Some sockets may not have closed gracefully:', error);
        }

        // Clear all internal state
        this.clearAllState();
    }

    clearAllState() {
        this.sockets.clear();
        this.messageQueues.clear();
        this.reconnectAttempts.clear();
        this.connectionStates.clear();
        this.pendingConnections.clear();
        this.messageHandlers.clear();
        this.authErrorHandlers.clear();
        this.exitHandlers.clear();
    }

    // Auth-related methods
    onAuthError(callback) {
        this.authErrorHandlers.add(callback);
        return () => this.authErrorHandlers.delete(callback);
    }

    onExit(callback) {
        this.exitHandlers.add(callback);
        return () => this.exitHandlers.delete(callback);
    }

    handleAuthError() {
        // Notify all registered auth error handlers
        this.authErrorHandlers.forEach(handler => handler());
        this.cleanup();
    }

    isAuthError(event) {
        try {
            const data = JSON.parse(event.data);
            return data.code === 4001 || // Invalid token
                   data.code === 4002 || // Token expired 
                   data.code === 4003;   // Authentication required
        } catch {
            return event.code === 4001 || event.code === 4002 || event.code === 4003;
        }
    }

    // Connection State Management
    setConnectionState(socketKey, state) {
        this.connectionStates.set(socketKey, {
            state,
            timestamp: Date.now()
        });
    }

    getConnectionState(socketKey) {
        return this.connectionStates.get(socketKey)?.state || 'disconnected';
    }

    isPendingConnection(socketKey) {
        const pendingConnection = this.pendingConnections.get(socketKey);
        if (!pendingConnection) return false;

        const isStale = Date.now() - pendingConnection.timestamp > this.connectionTimeout;
        if (isStale) {
            this.pendingConnections.delete(socketKey);
            return false;
        }
        return true;
    }

    // Connection Management
    async connect(type, id = null) {
        const socketKey = this.getSocketKey(type, id);

        if (!api.accessToken) {
            this.handleAuthError();
            throw new Error('No authentication token available');
        }

        if (this.isConnected(type, id)) {
            console.log(`Already connected to ${type}${id ? ` ${id}` : ''}`);
            return this.sockets.get(socketKey);
        }

        if (this.isPendingConnection(socketKey)) {
            console.log(`Connection to ${type}${id ? ` ${id}` : ''} is pending`);
            return this.pendingConnections.get(socketKey).promise;
        }

        let socketUrl;
        switch (type) {
            case 'management':
                socketUrl = `ws://${this.baseUrl}/ws/chat/manage/`;
                break;
            case 'chat':
                if (!id) throw new Error('Chat ID is required');
                socketUrl = `ws://${this.baseUrl}/ws/chat/${id}/`;
                break;
            case 'group':
                if (!id) throw new Error('Group ID is required');
                socketUrl = `ws://${this.baseUrl}/ws/group/${id}/`;
                break;
            case 'notifications':
                socketUrl = `ws://${this.baseUrl}/ws/notifications/`;
                break;
            case 'ai':
                socketUrl = `ws://${this.baseUrl}/ws/ai/aichat/`;
                break;
            default:
                throw new Error('Invalid socket type');
        }

        const connectionPromise = new Promise((resolve, reject) => {
            try {
                const socket = new WebSocket(socketUrl + '?token=' + api.accessToken);
                this.setupSocket(socket, type, id);
                
                this.setConnectionState(socketKey, 'connecting');
                this.messageQueues.set(socketKey, []);
                this.reconnectAttempts.set(socketKey, 0);

                const timeoutId = setTimeout(() => {
                    if (this.getConnectionState(socketKey) === 'connecting') {
                        socket.close();
                        reject(new Error('Connection timeout'));
                    }
                }, this.connectionTimeout);

                socket.onopen = () => {
                    clearTimeout(timeoutId);
                    this.sockets.set(socketKey, socket);
                    this.setConnectionState(socketKey, 'connected');
                    this.pendingConnections.delete(socketKey);
                    this.flushMessageQueue(socketKey);
                    console.log(`Connected to ${type}${id ? ` ${id}` : ''}`);
                    resolve(socket);
                };

                socket.onerror = (error) => {
                    clearTimeout(timeoutId);
                    this.setConnectionState(socketKey, 'error');
                    this.pendingConnections.delete(socketKey);
                    console.error(`WebSocket Error for ${type}:`, error);
                    reject(error);
                };

            } catch (error) {
                this.pendingConnections.delete(socketKey);
                this.setConnectionState(socketKey, 'error');
                console.error('Connection error:', error);
                reject(error);
            }
        });

        this.pendingConnections.set(socketKey, {
            promise: connectionPromise,
            timestamp: Date.now()
        });

        return connectionPromise;
    }

    setupSocket(socket, type, id) {
        const socketKey = this.getSocketKey(type, id);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (this.isAuthError(event)) {
                    this.handleAuthError();
                    socket.close();
                    return;
                }
                
                this.handleMessage(type, id, data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        socket.onclose = (event) => {
            const currentState = this.getConnectionState(socketKey);
            
            if (this.isAuthError(event)) {
                this.handleAuthError();
                this.cleanup(socketKey);
                return;
            }
            
            if (currentState === 'disconnecting') {
                this.setConnectionState(socketKey, 'disconnected');
                this.cleanup(socketKey);
            } else {
                this.setConnectionState(socketKey, 'disconnected');
                console.log(`Socket closed for ${type}${id ? ` ${id}` : ''}`);
                this.handleDisconnect(socketKey, type, id);
            }
        };
    }

    handleDisconnect(socketKey, type, id) {
        const attempts = this.reconnectAttempts.get(socketKey) || 0;
        
        if (!api.accessToken) {
            this.handleAuthError();
            return;
        }
        
        if (attempts < this.maxReconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(2, attempts);
            console.log(`Reconnecting in ${delay}ms...`);
            
            setTimeout(() => {
                this.reconnect(type, id);
                this.reconnectAttempts.set(socketKey, attempts + 1);
            }, delay);
        } else {
            console.log('Max reconnection attempts reached');
            this.cleanup(socketKey);
            
            this.handleMessage(type, id, {
                type: 'system',
                message: 'Connection permanently lost'
            });
        }
    }

    async disconnect(type, id = null) {
        const socketKey = this.getSocketKey(type, id);
        const socket = this.sockets.get(socketKey);
        
        if (socket) {
            this.setConnectionState(socketKey, 'disconnecting');
            socket.close(1000, 'Client disconnected');
        }
    }

    async reconnect(type, id) {
        try {
            await this.connect(type, id);
            const socketKey = this.getSocketKey(type, id);
            this.reconnectAttempts.set(socketKey, 0);
        } catch (error) {
            console.error('Reconnection failed:', error);
        }
    }

    // Message Handling
    send(type, id = null, message) {
        const socketKey = this.getSocketKey(type, id);
        const socket = this.sockets.get(socketKey);
        const messageString = JSON.stringify(message);

        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(messageString);
            return true;
        } else {
            const queue = this.messageQueues.get(socketKey);
            if (queue) {
                queue.push({
                    message: messageString,
                    timestamp: Date.now()
                });
            }
            return false;
        }
    }

    flushMessageQueue(socketKey) {
        const queue = this.messageQueues.get(socketKey) || [];
        const socket = this.sockets.get(socketKey);
        const maxMessageAge = 5 * 60 * 1000; // 5 minutes

        while (queue.length > 0 && socket?.readyState === WebSocket.OPEN) {
            const messageData = queue[0];
            const messageAge = Date.now() - messageData.timestamp;
            
            if (messageAge > maxMessageAge) {
                queue.shift();
                continue;
            }
            
            socket.send(messageData.message);
            queue.shift();
        }
    }

    // Event Handlers
    onMessage(type, callback) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type).add(callback);
        return () => this.offMessage(type, callback);
    }

    offMessage(type, callback) {
        this.messageHandlers.get(type)?.delete(callback);
    }

    handleMessage(type, id, data) {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            handlers.forEach(handler => handler(data, id));
        }
    }

    // Cleanup Methods
    cleanup(socketKey = null) {
        if (socketKey) {
            // Cleanup specific socket
            const socket = this.sockets.get(socketKey);
            if (socket?.readyState === WebSocket.OPEN) {
                socket.close(1000, 'Cleanup requested');
            }
            this.sockets.delete(socketKey);
            this.messageQueues.delete(socketKey);
            this.reconnectAttempts.delete(socketKey);
            this.connectionStates.delete(socketKey);
            this.pendingConnections.delete(socketKey);
        } else {
            // Cleanup all sockets
            this.handleAppExit();
        }
    }

    // Utility Methods
    getSocketKey(type, id) {
        return `${type}${id ? `-${id}` : ''}`;
    }

    isConnected(type, id = null) {
        const socketKey = this.getSocketKey(type, id);
        const socket = this.sockets.get(socketKey);
        return socket?.readyState === WebSocket.OPEN;
    }

    getConnectionInfo(type, id = null) {
        const socketKey = this.getSocketKey(type, id);
        return {
            state: this.getConnectionState(socketKey),
            queuedMessages: this.messageQueues.get(socketKey)?.length || 0,
            reconnectAttempts: this.reconnectAttempts.get(socketKey) || 0,
            isPending: this.isPendingConnection(socketKey)
        };
    }

    destroy() {
        this.removeExitHandlers();
        this.cleanup();
    }
}

class ChatAPI {
    constructor() {
        this.ws = new WebSocketService();
        
        // Setup message handlers
        this.ws.onMessage('chat', this.handleChatMessage.bind(this));
        this.ws.onMessage('group', this.handleGroupMessage.bind(this));
        this.ws.onMessage('management', this.handleManagementMessage.bind(this));
        this.ws.onMessage('notifications', this.handleNotification.bind(this));
        this.ws.onMessage('ai', this.handleAIChatMessage.bind(this));
        
        // Setup auth error handler
        this.ws.onAuthError(() => {
            this.cleanup();
        });
        
        // Setup app exit handler
        this.ws.onExit(() => {
            this.cleanup();
        });
        
        // Bind methods
        this.cleanup = this.cleanup.bind(this);
    }

    // Management Methods
    async createChat(participantIds) {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'create_chat',
            participant_ids: participantIds
        });
    }

    async createGroup(name, memberIds, description = "") {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'create_group',
            name,
            description,
            member_ids: memberIds
        });
    }

    async listAllChats() {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'get_all_chats'
        });
    }

    // Chat Methods
    async joinChat(chatId) {
        await this.ws.connect('chat', chatId);
    }

    async deleteChat(chatId) {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'delete_chat',
            chat_id: chatId
        });

    }

    async deleteGroup(groupId) {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'delete_group',
            group_id: groupId
        });
    }


    async leaveChat(chatId) {
        await this.ws.disconnect('chat', chatId);
    }

    async sendChatMessage(chatId, text, messageType = 'TEXT', content =null) {
        return this.ws.send('chat', chatId, {
            text,
            message_type: messageType,
            file: content

        });
    }

    // Group Methods
    async joinGroup(groupId) {
        await this.ws.connect('group', groupId);
    }

    async leaveGroup(groupId) {
        await this.ws.disconnect('group', groupId);
    }

    async sendGroupMessage(groupId, text, messageType = 'TEXT',content =null) {
        return this.ws.send('group', groupId, {
            text,
            message_type: messageType,
            file: content
        });
    }

    async addGroupMembers(groupId, memberIds) {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'add_members',
            group_id: groupId,
            member_ids: memberIds
        });
    }

    async removeGroupMembers(groupId, memberIds) {
        await this.ws.connect('management');
        return this.ws.send('management', null, {
            command: 'remove_members',
            group_id: groupId,
            member_ids: memberIds
        });
    }

    // Notification Methods
    async connectNotifications() {
        await this.ws.connect('notifications');
    }

    async disconnectNotifications() {
        await this.ws.disconnect('notifications');
    }

    // AI Chat Methods
    async connectAIChat() {
        await this.ws.connect('ai');
    }

    async sendAIChatMessage(text, messageType = 'text') {
        return this.ws.send('ai', null, {
            text,
            message_type: messageType,
            content: {}
        });
    }

    async disconnectAIChat() {
        await this.ws.disconnect('ai');
    }

    // Message Handlers
    handleChatMessage(data, chatId) {
        console.log(`Chat ${chatId} message:`, data);
        // Implement your chat message handling logic here
    }

    handleGroupMessage(data, groupId) {
        console.log(`Group ${groupId} message:`, data);
        // Implement your group message handling logic here
    }

    handleManagementMessage(data) {
        console.log('Management message:', data);
        // Implement your management message handling logic here
    }

    handleNotification(data) {
        console.log('Notification:', data);
        // Implement your notification handling logic here
    }

    handleAIChatMessage(data) {
        if (data.type === 'message') {
            const message = data.message;
            switch (message.message_type) {
                case 'text':
                    console.log('User message:', message);
                    break;
                case 'ai':
                    console.log('AI response:', message);
                    break;
                case 'system':
                    console.log('System message:', message);
                    break;
                default:
                    console.log('Unknown message type:', message);
            }
        } else if (data.type === 'error') {
            console.error('AI Chat error:', data.message);
        }
    }

    // Cleanup method
    cleanup() {
        // Disconnect from all services
        this.ws.disconnect('management');
        this.ws.disconnect('notifications');
        this.ws.disconnect('ai');
        
        // Clean up any active chat or group connections
        for (const [socketKey, socket] of this.ws.sockets.entries()) {
            if (socket.readyState === WebSocket.OPEN) {
                const [type, id] = socketKey.split('-');
                if (type === 'chat' || type === 'group') {
                    this.ws.disconnect(type, id);
                }
            }
        }
    }

    // Destroy instance
    destroy() {
        this.cleanup();
        this.ws.destroy();
    }
}

// Create singleton instances
const chatapi = new ChatAPI();
const webSocket = chatapi.ws;

// Export the service
export { webSocket, chatapi };