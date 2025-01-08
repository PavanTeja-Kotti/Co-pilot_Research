class BaseService {
    constructor(baseURL = 'http://127.0.0.1:8000') {
        this.baseURL = baseURL;
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.tokenType = 'Bearer';
    }

    getAuthHeader() {
        return this.accessToken ? { 'Authorization': `${this.tokenType} ${this.accessToken}` } : {};
    }

    async request(endpoint, options = {}) {
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

            const responseData = await response.json();

            // Handle different response statuses
            if (response.status === 401) {
                // Token expired or invalid
                if (this.refreshToken) {
                    try {
                        await this.refreshAccessToken();
                        // Retry the original request with new token
                        return this.request(endpoint, options);
                    } catch (refreshError) {
                        this.clearTokens();
                        throw new Error(refreshError.message || 'Authentication failed');
                    }
                } else {
                    this.clearTokens();
                    throw new Error('Authentication required');
                }
            }

            if (!response.ok) {
                throw new Error(responseData.message || 'Request failed');
            }

            return responseData;
        } catch (error) {
            // Network errors or other issues
            if (error.message === 'Failed to fetch') {
                throw new Error('Network error');
            }
            throw error;
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
            // Handle nested tokens object if present
            const accessToken = data.tokens?.access || data.access;
            const refreshToken = data.tokens?.refresh || data.refresh;
            
            this.setTokens(accessToken, refreshToken);
            return data;
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
            
            // Handle the nested tokens structure
            if (response.tokens?.access && response.tokens?.refresh) {
                this.baseService.setTokens(
                    response.tokens.access,
                    response.tokens.refresh
                );
            } else {
                throw new Error('Invalid token response');
            }
            
            return {
                message: response.message,
                user: response.user
            };
        } catch (error) {
            this.baseService.clearTokens();
            throw error;
        }
    }

    async register(email, username, password, password_confirm) {
        try {
            const response = await this.baseService.request(`${this.endpoint}/register/`, {
                method: 'POST',
                body: JSON.stringify({ 
                    email, 
                    username, 
                    password,
                    password_confirm 
                })
            });
            
            // Handle the nested tokens structure
            if (response.tokens?.access && response.tokens?.refresh) {
                this.baseService.setTokens(
                    response.tokens.access,
                    response.tokens.refresh
                );
            } else {
                throw new Error('Invalid token response');
            }
            
            return {
                message: response.message,
                user: response.user
            };
        } catch (error) {
            this.baseService.clearTokens();
            throw error;
        }
    }

    async getProfile() {
        return this.baseService.request(`${this.endpoint}/profile/`);
    }

    async logout() {
        try {
            await this.baseService.request(`${this.endpoint}/logout/`, {
                method: 'POST'
            });
        } finally {
            this.baseService.clearTokens();
        }
    }
}

const api = new BaseService();
export default api;