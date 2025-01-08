class AuthService {
    constructor() {
        this.baseURL = 'http://127.0.0.1:8000/api';
        this.accessToken = localStorage.getItem('accessToken');
    }

    setAccessToken(token) {
        this.accessToken = token;
        localStorage.setItem('accessToken', token);
    }

    clearAccessToken() {
        this.accessToken = null;
        localStorage.removeItem('accessToken');
    }

    getAuthHeader() {
        return this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {};
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            this.setAccessToken(data.access_token);
            return data;
        } catch (error) {
            this.clearAccessToken();
            throw error;
        }
    }

    async verifyToken() {
        if (!this.accessToken) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseURL}/token/verify/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: this.accessToken })
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const headers = {
            ...options.headers,
            ...this.getAuthHeader(),
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            this.clearAccessToken();
            throw new Error('Authentication failed');
        }

        return response;
    }

    logout() {
        this.clearAccessToken();
    }
}

// Usage example
const api = new AuthService();
export default api;