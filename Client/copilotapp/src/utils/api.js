class BaseService {
    constructor(baseURL = 'http://127.0.0.1:8000') {
        this.baseURL = baseURL;
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.tokenType = 'Bearer';
        this.notificationCallback = null;
    }

    getAuthHeader() {
        return this.accessToken ? { 'Authorization': `${this.tokenType} ${this.accessToken}` } : {};
    }

    formatResponse(success, data = null, message = '', error = null) {
        return {
            success,
            data,
            message,
            error,
            timestamp: new Date().toISOString()
        };
    }

    setNotificationCallback(callback) {
        this.notificationCallback = callback;
    }

    async request(endpoint, options = {}, parseJSON = true) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...options.headers
        };
    
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers
            });
    
            // For requests that don't need JSON parsing (like logout)
            if (!parseJSON) {
                const formattedResponse = this.formatResponse(response.ok, null, 
                    response.ok ? 'Operation successful' : 'Operation failed');
                
                if (!formattedResponse.success && this.notificationCallback) {
                    this.notificationCallback(formattedResponse.message, formattedResponse.error);
                }
                
                return formattedResponse;
            }
    
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                const formattedResponse = response.ok 
                    ? this.formatResponse(true, null, 'Operation successful')
                    : this.formatResponse(false, null, 'Request failed', 'Invalid response format');
                
                if (!formattedResponse.success && this.notificationCallback) {
                    this.notificationCallback(formattedResponse.message, formattedResponse.error);
                }
                
                return formattedResponse;
            }
    
            // First check if there's an error message in the response
            if (!response.ok) {
                const errorMessage = responseData?.error || responseData?.message || 'Request failed';
                const formattedResponse = this.formatResponse(false, null, errorMessage, errorMessage);
                
                // If it's a 401 and we don't have a direct error message, try token refresh
                if (response.status === 401 && !responseData?.error && this.refreshToken) {
                    try {
                        await this.refreshAccessToken();
                        // Retry the original request with new token
                        return this.request(endpoint, options);
                    } catch (refreshError) {
                        this.clearTokens();
                    }
                }
                
                if (this.notificationCallback) {
                    this.notificationCallback(errorMessage, errorMessage);
                }
                
                return formattedResponse;
            }
    
            const formattedResponse = this.formatResponse(true, responseData, 
                responseData?.message || 'Operation successful');
            
            return formattedResponse;
    
        } catch (error) {
            const formattedResponse = this.formatResponse(false, null,
                'Request failed',
                error.message === 'Failed to fetch' ? 'Network error' : error.message);
            
            if (this.notificationCallback) {
                this.notificationCallback(formattedResponse.message, formattedResponse.error);
            }
            
            return formattedResponse;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/accounts/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: this.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            const accessToken = data.tokens?.access || data.access;
            const refreshToken = data.tokens?.refresh || data.refresh;
            
            this.setTokens(accessToken, refreshToken);
            return this.formatResponse(true, data, 'Token refresh successful');
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    setTokens(accessToken, refreshToken = null) {
        if (accessToken) {
            this.accessToken = accessToken;
            localStorage.setItem('accessToken', accessToken);
        }
        
        if (refreshToken) {
            this.refreshToken = refreshToken;
            localStorage.setItem('refreshToken', refreshToken);
        }
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    accounts() {
        return new AccountsService(this);
    }

    scraping() {
        return new ScrapingService(this);
    }


    categories() {
        return new CategoryService(this);
    }

    notifications() {
        return new NotificationService(this);
    }

    privateChat() {
        return new PrivateChatService(this);
    }

    groupChat() {
        return new GroupChatService(this);
    }

    general() {
        return new GeneralService(this);
    }
}

class AccountsService {
    constructor(baseService) {
        this.baseService = baseService;
        this.endpoint = '/accounts';
    }

    async login(email, password) {
        try {
            const response = await this.baseService.request(`${this.endpoint}/login/`, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (response.success && response.data?.tokens) {
                this.baseService.setTokens(
                    response.data.tokens.access,
                    response.data.tokens.refresh
                );
                
                return this.baseService.formatResponse(
                    true,
                     response.data.user,
                    'Login successful'
                );
            }
            
            return response;
        } catch (error) {
            this.baseService.clearTokens();
            return this.baseService.formatResponse(
                false,
                null,
                'Login failed',
                error.message
            );
        }
    }

    async register(email, username, password, password_confirm, first_name, last_name) {
        try {
            const response = await this.baseService.request(`${this.endpoint}/register/`, {
                method: 'POST',
                body: JSON.stringify({ 
                    email, 
                    username, 
                    password,
                    password_confirm,
                    first_name,
                    last_name
                })
            });
            
            if (response.success && response.data?.tokens) {
                // this.baseService.setTokens(
                //     response.data.tokens.access,
                //     response.data.tokens.refresh
                // );
                
                return this.baseService.formatResponse(
                    true,
                    response.data?.user,
                    'Registration successful'
                );
            }
            
            return response;
        } catch (error) {
            this.baseService.clearTokens();
            return this.baseService.formatResponse(
                false,
                null,
                'Registration failed',
                error.message
            );
        }
    }

    async getProfile() {
        return this.baseService.request(`${this.endpoint}/profile/`);
    }
    
    async updateProfile(userData) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/profile/`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(userData)
                }
            );
            
            return response;
        } catch (error) {
            console.error('Update profile request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Profile update failed',
                error.message
            );
        }
    }
    
    async deleteProfile() {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/profile/`,
                {
                    method: 'DELETE'
                }
            );
            
            return response;
        } catch (error) {
            console.error('Delete profile request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Profile deletion failed',
                error.message
            );
        } finally {
            // Since this is account deletion, we should clear tokens like logout
            this.baseService.clearTokens();
        }
    }
    
    async logout() {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/logout/`,
                {
                    method: 'POST',
                    body: JSON.stringify({ refresh_token: this.baseService.refreshToken })
                },
                false
            );
            
            return response;
        } catch (error) {
            console.error('Logout request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Logout failed',
                error.message
            );
        } finally {
            this.baseService.clearTokens();
        }
    }
    async serachUser(search) {
        const endpoint = search ? `${this.endpoint}/search/${search}/` : `${this.endpoint}/search/`;
        return this.baseService.request(endpoint);
    }

    async changePassword(oldPassword, newPassword) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/change-password/`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        old_password: oldPassword,
                        new_password: newPassword
                    })
                }
            );
            
            return response;
        } catch (error) {
            console.error('Password change request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Password change failed',
                error.message
            );
        }
    }
}

class ScrapingService{
    constructor(baseService){
        this.baseService = baseService;
        this.endpoint = '/scraping';
    }

    
}

class CategoryService extends ScrapingService {

    async getCategories() {
        return this.baseService.request(`${this.endpoint}/categoriesonly/`);
    }

    async getCategory(categoryId) {
        return this.baseService.request(`${this.endpoint}/categoriesonly/${categoryId}/`);
    }

    async createCategory(categoryData) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/categoriesonly/`,
                {
                    method: 'POST',
                    body: JSON.stringify(categoryData)
                }
            );
            
            return response;
        } catch (error) {
            console.error('Category creation request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Category creation failed',
                error.message
            );
        }
    }

    async updateCategory(categoryId, categoryData) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/categoriesonly/${categoryId}/`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(categoryData)
                }
            );
            
            return response;
        } catch (error) {
            console.error('Category update request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Category update failed',
                error.message
            );
        }
    }


    async deleteCategory(categoryId) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/categoriesonly/${categoryId}/`,
                {
                    method: 'DELETE'
                }
            );
            
            return response;
        } catch (error) {
            console.error('Category deletion request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Category deletion failed',
                error.message
            );
        }
    }

    async category_like_list(){
        return this.baseService.request(`${this.endpoint}/categories_like_list/`);
    }

    async updateCategoryLikeList(categoryIds) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/categories_like_list/`,
                {
                    method: 'POST',
                    body: JSON.stringify({ category_ids: categoryIds })
                }
            );

            return response;

        }

        catch (error) {
            console.error('Category like list update request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Category like list update failed',
                error.message
            );
        }


    }



    



   
}


class NotificationService extends AccountsService {

    async getNotifications() {
        return this.baseService.request(`${this.endpoint}/notifications/`);
    }

    async markNotificationAsRead(notificationId) {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/notifications/${notificationId}/mark/`,
                {
                    method: 'POST',
                    body: JSON.stringify({ 'action':'read' })
                }


            );
            
            return response;
        } catch (error) {
            console.error('Mark notification as read request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Mark notification as read failed',
                error.message
            );
        }
    }

    async markAllNotificationsAsRead() {
        try {
            const response = await this.baseService.request(
                `${this.endpoint}/notifications/mark-all/`,
                {
                    method: 'POST',
                    body: JSON.stringify({ 'action':'read' })
                }
            );
            
            return response;
        } catch (error) {
            console.error('Mark all notifications as read request failed:', error);
            return this.baseService.formatResponse(
                false,
                null,
                'Mark all notifications as read failed',
                error.message
            );
        }
    }

    

   

}


class PrivateChatService {
    
    constructor(baseService) {
        this.baseService = baseService;
        this.endpoint = '/chat/chats';
    }

    async getChatList() {
        return this.baseService.request(`${this.endpoint}/`);
    }

    async createChat(participantId) {
        return this.baseService.request(`${this.endpoint}/create/`, {
            method: 'POST',
            body: JSON.stringify({ participant_id: participantId })
        });
    }

    async getChatDetail(chatId) {
        return this.baseService.request(`${this.endpoint}/${chatId}/`);
    }
    

}

class GroupChatService{
    constructor(baseService){
        this.baseService = baseService;
        this.endpoint = '/chat/groups';
    }

    async getGroupList() {
        return this.baseService.request(`${this.endpoint}/`);
    }

    async createGroup(groupData) {
        return this.baseService.request(`${this.endpoint}/create/`, {
            method: 'POST',
            body: JSON.stringify({
                name: groupData.name,
                description: groupData.description || '',
                member_ids: groupData.memberIds || []
            })
        });
    }

    async getGroupDetail(groupId) {
        return this.baseService.request(`${this.endpoint}/${groupId}/`);
    }

    async addMember(groupId, userId) {
        return this.baseService.request(`${this.endpoint}/${groupId}/members/add/`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
    }

    async removeMember(groupId, userId) {
        return this.baseService.request(`${this.endpoint}/${groupId}/members/remove/`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
    }

}



class GeneralService {
    constructor(baseService) {
        this.baseService = baseService;
        this.endpoint = '/generic';
    }

    async getFileWithProgress(filePath, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
    
            // Track download progress
            xhr.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            });
    
            xhr.addEventListener('load', async () => {
                if (xhr.status === 200) {
                    const blob = xhr.response;
                    let fileName = filePath.split('/').pop() || 'download';
                    
                    // Try to get additional metadata from server
                    try {
                        const metadataResponse = await fetch(`${this.baseService.baseURL}${this.endpoint}/files/metadata/${filePath}`, {
                            headers: this.baseService.getAuthHeader()
                        });
                        
                        if (metadataResponse.ok) {
                            const metadataJson = await metadataResponse.json();
                            
                            // Use server-provided metadata
                            const metadata = {
                                fileName: metadataJson.fileName || fileName,
                                contentType: metadataJson.contentType || blob.type,
                                fileSize: metadataJson.fileSize || blob.size,
                                createdAt: metadataJson.createdAt || null,
                                modifiedAt: metadataJson.modifiedAt || null,
                            };
    
                            resolve({
                                blob,
                                fileName: metadata.fileName,
                                metadata,
                                download: () => this.downloadBlob(blob, metadata.fileName),
                                getUrl: () => window.URL.createObjectURL(blob)
                            });
                        } else {
                            // Fallback to basic metadata if metadata endpoint fails
                            fallbackResolve(blob, fileName);
                        }
                    } catch (error) {
                        // Fallback to basic metadata if metadata request fails
                        console.warn('Failed to fetch metadata, using fallback:', error);
                        fallbackResolve(blob, fileName);
                    }
    
                } else {
                    let errorMessage = 'Download failed';
                    try {
                        const response = JSON.parse(xhr.response);
                        errorMessage = response.error || response.message || errorMessage;
                    } catch (e) {
                        // If response cannot be parsed, use default error message
                    }
                    reject(this.baseService.formatResponse(false, null, errorMessage, 'Download failed'));
                }
            });
    
            xhr.addEventListener('error', () => {
                reject(this.baseService.formatResponse(false, null, 'Download failed', 'Network error'));
            });
    
            // Helper function for fallback metadata
            const fallbackResolve = (blob, fileName) => {
                const metadata = {
                    fileName: fileName,
                    contentType: blob.type,
                    fileSize: blob.size,
                    createdAt: null,
                    modifiedAt: null,
                };
    
                resolve({
                    blob,
                    fileName,
                    metadata,
                    download: () => this.downloadBlob(blob, fileName),
                    getUrl: () => window.URL.createObjectURL(blob)
                });
            };
    
            // Open and send the request
            xhr.open('GET', `${this.baseService.baseURL}${this.endpoint}/files/${filePath}`);
            
            // Add authorization header
            const authHeader = this.baseService.getAuthHeader();
            if (authHeader.Authorization) {
                xhr.setRequestHeader('Authorization', authHeader.Authorization);
            }
    
            xhr.send();
        });
    }


    async uploadFileWithProgress(file, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            });

            const fileTypeMapping = {
                image: 'IMAGE',
                video: 'VIDEO',
                audio: 'AUDIO',
                application: 'DOCUMENT', // Common MIME type for documents (e.g., PDFs)
            };

            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.response);
                    if (xhr.status === 201) {
                        // Return the response data in the same format as your API
                        resolve({
                            message: response.message || 'File uploaded successfully',
                            path: response.file_path,
                            file_type: response.file_type,
                            type: fileTypeMapping[response.file_type.split('/')[0]] || 'UNKNOWN',
                            name:response.metadata.filename,
                            size:response.metadata.file_size,
                            metadata: response.metadata
                        });
                    } else {
                        reject({
                            error: response.error || 'Upload failed',
                            message: response.message || 'Upload failed',
                            status: xhr.status
                        });
                    }
                } catch (error) {
                    reject({
                        error: 'Failed to parse response',
                        message: 'Upload failed',
                        status: xhr.status
                    });
                }
            });

            xhr.addEventListener('error', () => {
                reject({
                    error: 'Network error',
                    message: 'Upload failed',
                    status: 0
                });
            });

            xhr.addEventListener('abort', () => {
                reject({
                    error: 'Upload cancelled',
                    message: 'Upload was cancelled',
                    status: 0
                });
            });

            // Open and send the request
            xhr.open('POST', `${this.baseService.baseURL}${this.endpoint}/upload/`);
            
            // Add authorization header
            const authHeader = this.baseService.getAuthHeader();
            if (authHeader.Authorization) {
                xhr.setRequestHeader('Authorization', authHeader.Authorization);
            }

            xhr.send(formData);
        });
    }


 
}
    

  
   


const api = new BaseService();
export default api;