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

    formatResponse(success, data = null, message = '', error = null) {
        return {
            success,
            data,
            message,
            error,
            timestamp: new Date().toISOString()
        };
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
                return this.formatResponse(response.ok, null, 
                    response.ok ? 'Operation successful' : 'Operation failed');
            }

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                if (!response.ok) {
                    return this.formatResponse(false, null, 'Request failed', 'Invalid response format');
                }
                return this.formatResponse(true, null, 'Operation successful');
            }

            // Handle different response statuses
            if (response.status === 401) {
                if (this.refreshToken) {
                    try {
                        await this.refreshAccessToken();
                        // Retry the original request with new token
                        return this.request(endpoint, options);
                    } catch (refreshError) {
                        this.clearTokens();
                        return this.formatResponse(false, null, 'Authentication failed', 
                            refreshError.message);
                    }
                } else {
                    this.clearTokens();
                    return this.formatResponse(false, null, 'Authentication required', 
                        'No refresh token available');
                }
            }

            if (!response.ok) {
                return this.formatResponse(false, null, 
                    responseData?.message || 'Request failed',
                    responseData?.error || 'Unknown error');
            }

            return this.formatResponse(true, responseData, 
                responseData?.message || 'Operation successful');

        } catch (error) {
            return this.formatResponse(false, null,
                error.message || 'Request failed',
                error.message === 'Failed to fetch' ? 'Network error' : error.message);
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
                this.baseService.setTokens(
                    response.data.tokens.access,
                    response.data.tokens.refresh
                );
                
                return this.baseService.formatResponse(
                    true,
                    response.data.user,
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

    async logout() {
        try {
            const response = await this.baseService.request(`${this.endpoint}/logout/`, {
                method: 'POST',
                body: JSON.stringify({ refresh_token: this.baseService.refreshToken })
            }, false);
            
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
}

const api = new BaseService();
export default api;