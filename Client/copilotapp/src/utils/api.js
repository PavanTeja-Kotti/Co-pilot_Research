class AuthService {
    constructor() {
        this.baseURL = 'http://127.0.0.1:8000/accounts';
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
    }

    setTokens(access, refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    getAuthHeader() {
        return this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {};
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            this.setTokens(data.tokens.access, data.tokens.refresh);
            return data;
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    async register(email, username, password) {
        try {
            const response = await fetch(`${this.baseURL}/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const data = await response.json();
            this.setTokens(data.tokens.access, data.tokens.refresh);
            return data;
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: this.refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            this.setTokens(data.access, data.refresh || this.refreshToken);
            return data.access;
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const headers = {
                ...options.headers,
                ...this.getAuthHeader(),
                'Content-Type': 'application/json',
            };

            let response = await fetch(url, {
                ...options,
                headers,
            });

            // If token expired, try to refresh and retry the request
            if (response.status === 401 && this.refreshToken) {
                try {
                    await this.refreshAccessToken();
                    headers.Authorization = `Bearer ${this.accessToken}`;
                    response = await fetch(url, {
                        ...options,
                        headers,
                    });
                } catch (refreshError) {
                    this.clearTokens();
                    throw new Error('Session expired');
                }
            }

            if (!response.ok) {
                throw new Error('Request failed');
            }

            return response;
        } catch (error) {
            throw error;
        }
    }

    async logout() {
        if (this.refreshToken) {
            try {
                await this.makeAuthenticatedRequest(`${this.baseURL}/logout/`, {
                    method: 'POST',
                    body: JSON.stringify({ refresh_token: this.refreshToken })
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        this.clearTokens();
    }

    async getUserProfile() {
        const response = await this.makeAuthenticatedRequest(`${this.baseURL}/profile/`);
        return response.json();
    }

    async updateProfile(data) {
        const response = await this.makeAuthenticatedRequest(`${this.baseURL}/profile/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async changePassword(oldPassword, newPassword) {
        const response = await this.makeAuthenticatedRequest(`${this.baseURL}/change-password/`, {
            method: 'POST',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        return response.json();
    }

    async checkAuthStatus() {
        const response = await this.makeAuthenticatedRequest(`${this.baseURL}/check-auth/`);
        return response.json();
    }
}

// Usage example
const api = new AuthService();
export default api;

// Example usage:
/*
try {
    // Login
    const loginData = await api.login('user@example.com', 'password123');
    console.log('Logged in user:', loginData.user);

    // Get profile
    const profile = await api.getUserProfile();
    console.log('User profile:', profile);

    // Update profile
    const updatedProfile = await api.updateProfile({
        first_name: 'John',
        last_name: 'Doe'
    });
    console.log('Updated profile:', updatedProfile);

    // Change password
    await api.changePassword('oldPassword', 'newPassword');

    // Logout
    await api.logout();
} catch (error) {
    console.error('Error:', error.message);
}
*/