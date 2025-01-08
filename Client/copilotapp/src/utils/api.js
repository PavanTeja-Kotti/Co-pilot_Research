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
                        throw new Error('Authentication failed');
                    }
                } else {
                    this.clearTokens();
                    throw new Error('Authentication required');
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Request failed');
            }

            return response.json();
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
            this.setTokens(data.access, data.refresh);
            return data;
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    setTokens(accessToken, refreshToken = null) {
        this.accessToken = accessToken;
        localStorage.setItem('accessToken', accessToken);
        
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
            const data = await this.baseService.request(`${this.endpoint}/login/`, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            // Expect both access and refresh tokens from the backend
            if (data.access && data.refresh) {
                this.baseService.setTokens(data.access, data.refresh);
            } else {
                throw new Error('Invalid token response');
            }
            
            return data.user;
        } catch (error) {
            this.baseService.clearTokens();
            throw error;
        }
    }

    async register(email, username, password, password_confirm) {
        try {
            const data = await this.baseService.request(`${this.endpoint}/register/`, {
                method: 'POST',
                body: JSON.stringify({ 
                    email, 
                    username, 
                    password,
                    password_confirm 
                })
            });
            
            if (data.access && data.refresh) {
                this.baseService.setTokens(data.access, data.refresh);
            } else {
                throw new Error('Invalid token response');
            }
            
            return data.user;
        } catch (error) {
            this.baseService.clearTokens();
            throw error;
        }
    }

    async getProfile() {
        return this.baseService.request(`${this.endpoint}/profile/`);
    }

    logout() {
        // Optionally send logout request to backend to invalidate token
        try {
            this.baseService.request(`${this.endpoint}/logout/`, {
                method: 'POST'
            });
        } finally {
            this.baseService.clearTokens();
        }
    }
}

const api = new BaseService();
export default api;