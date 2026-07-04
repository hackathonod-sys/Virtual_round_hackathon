/**
 * HRMS Authentication Module
 * Handles login, registration, session management, and role-based access
 * Version: 1.0.0
 */

// ============================================================
//  CONFIGURATION
// ============================================================
const AUTH_CONFIG = {
    // Storage keys
    storageKeys: {
        user: 'hrms_user',
        token: 'hrms_token',
        session: 'hrms_session'
    },
    
    // Redirect URLs
    redirects: {
        admin: 'admin/dashboard.html',
        hr: 'admin/dashboard.html',
        employee: 'employee/dashboard.html'
    },
    
    // Login page URL
    loginPage: 'login.html',
    
    // Session timeout in minutes (null = no timeout)
    sessionTimeout: null
};

// ============================================================
//  AUTH CLASS
// ============================================================
class Auth {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionTimer = null;
        this.listeners = [];
        this.api = null; // Will be set by setAPI method
    }

    /**
     * Set API instance
     */
    setAPI(api) {
        this.api = api;
    }

    // ============================================================
    //  AUTHENTICATION METHODS
    // ============================================================

    /**
     * Login user
     */
    async login(email, password) {
        if (!this.api) {
            throw new Error('API not initialized. Call setAPI() first.');
        }

        try {
            const response = await this.api.post('auth.php?action=login', { email, password });
            
            if (response.success && response.data) {
                const user = response.data;
                this.setCurrentUser(user);
                this.startSessionTimeout();
                this.emit('login', user);
                return user;
            }
            throw new Error(response.message || 'Login failed');
        } catch (error) {
            this.handleAuthError(error);
            throw error;
        }
    }

    /**
     * Register user
     */
    async register(userData) {
        if (!this.api) {
            throw new Error('API not initialized. Call setAPI() first.');
        }

        try {
            // Register the user
            const response = await this.api.post('auth.php?action=register', userData);
            
            if (response.success) {
                // Auto-login after registration
                return this.login(userData.email, userData.password);
            }
            throw new Error(response.message || 'Registration failed');
        } catch (error) {
            this.handleAuthError(error);
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            if (this.api) {
                await this.api.get('auth.php?action=logout');
            }
        } catch (error) {
            // Ignore logout errors
        } finally {
            this.clearSession();
            this.emit('logout');
            window.location.href = AUTH_CONFIG.loginPage;
        }
    }

    /**
     * Check if user is logged in
     */
    async checkSession() {
        if (!this.api) {
            return false;
        }

        try {
            const response = await this.api.get('auth.php?action=check');
            
            if (response.success && response.data && response.data.user_id) {
                // Get full user profile
                const userResponse = await this.api.get(`employees.php?id=${response.data.user_id}`);
                if (userResponse.success) {
                    const user = userResponse.data;
                    this.setCurrentUser(user);
                    this.startSessionTimeout();
                    return true;
                }
            }
            
            this.clearSession();
            return false;
        } catch (error) {
            this.clearSession();
            return false;
        }
    }

    // ============================================================
    //  SESSION MANAGEMENT
    // ============================================================

    /**
     * Set current user
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Store in localStorage
        try {
            localStorage.setItem(AUTH_CONFIG.storageKeys.user, JSON.stringify(user));
            localStorage.setItem(AUTH_CONFIG.storageKeys.session, 'true');
        } catch (e) {
            // Storage error
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }

        // Try to load from storage
        try {
            const stored = localStorage.getItem(AUTH_CONFIG.storageKeys.user);
            if (stored) {
                this.currentUser = JSON.parse(stored);
                this.isAuthenticated = true;
                return this.currentUser;
            }
        } catch (e) {
            // Invalid JSON
        }
        return null;
    }

    /**
     * Clear session
     */
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.clearSessionTimer();
        
        try {
            localStorage.removeItem(AUTH_CONFIG.storageKeys.user);
            localStorage.removeItem(AUTH_CONFIG.storageKeys.session);
            sessionStorage.clear();
        } catch (e) {
            // Storage error
        }
    }

    /**
     * Start session timeout timer
     */
    startSessionTimeout() {
        this.clearSessionTimer();
        
        if (AUTH_CONFIG.sessionTimeout) {
            const timeoutMs = AUTH_CONFIG.sessionTimeout * 60 * 1000;
            this.sessionTimer = setTimeout(() => {
                this.emit('session_expired');
                this.logout();
            }, timeoutMs);
        }
    }

    /**
     * Clear session timer
     */
    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * Refresh session (reset timer)
     */
    refreshSession() {
        if (this.isAuthenticated) {
            this.startSessionTimeout();
        }
    }

    // ============================================================
    //  ROLE-BASED ACCESS
    // ============================================================

    /**
     * Check if user has a specific role
     */
    hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Check if user is HR
     */
    isHR() {
        return this.hasRole('hr');
    }

    /**
     * Check if user is employee
     */
    isEmployee() {
        return this.hasRole('employee');
    }

    /**
     * Check if user has admin or HR access
     */
    isAdminOrHR() {
        return this.isAdmin() || this.isHR();
    }

    /**
     * Get user role
     */
    getRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }

    /**
     * Get user name
     */
    getUserName() {
        const user = this.getCurrentUser();
        return user ? user.name : null;
    }

    /**
     * Get user ID
     */
    getUserId() {
        const user = this.getCurrentUser();
        return user ? user.id : null;
    }

    /**
     * Get user employee ID
     */
    getEmployeeId() {
        const user = this.getCurrentUser();
        return user ? user.employee_id : null;
    }

    // ============================================================
    //  REDIRECTION
    // ============================================================

    /**
     * Redirect to appropriate dashboard based on role
     */
    redirectToDashboard() {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = AUTH_CONFIG.loginPage;
            return;
        }

        const roleMap = {
            'admin': AUTH_CONFIG.redirects.admin,
            'hr': AUTH_CONFIG.redirects.hr,
            'employee': AUTH_CONFIG.redirects.employee
        };

        const redirectUrl = roleMap[user.role] || AUTH_CONFIG.redirects.employee;
        window.location.href = redirectUrl;
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.href = AUTH_CONFIG.loginPage;
    }

    /**
     * Require authentication for a page
     */
    requireAuth() {
        if (!this.isAuthenticated) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    /**
     * Require specific role for a page
     */
    requireRole(role) {
        if (!this.requireAuth()) return false;
        
        if (!this.hasRole(role)) {
            this.redirectToDashboard();
            return false;
        }
        return true;
    }

    /**
     * Require admin for a page
     */
    requireAdmin() {
        return this.requireRole('admin');
    }

    /**
     * Require admin or HR for a page
     */
    requireAdminOrHR() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdminOrHR()) {
            this.redirectToDashboard();
            return false;
        }
        return true;
    }

    // ============================================================
    //  EVENT SYSTEM
    // ============================================================

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in auth event listener:', error);
            }
        });
    }

    // ============================================================
    //  ERROR HANDLING
    // ============================================================

    /**
     * Handle authentication errors
     */
    handleAuthError(error) {
        if (error.statusCode === 401) {
            this.clearSession();
            this.emit('unauthorized');
            this.redirectToLogin();
        }
        // Re-throw for handling by caller
        throw error;
    }

    // ============================================================
    //  UTILITY METHODS
    // ============================================================

    /**
     * Check if currently logged in (synchronous)
     */
    isLoggedIn() {
        return this.isAuthenticated || !!this.getCurrentUser();
    }

    /**
     * Get auth token (if using token-based auth)
     */
    getToken() {
        try {
            return localStorage.getItem(AUTH_CONFIG.storageKeys.token);
        } catch {
            return null;
        }
    }

    /**
     * Set auth token (if using token-based auth)
     */
    setToken(token) {
        try {
            if (token) {
                localStorage.setItem(AUTH_CONFIG.storageKeys.token, token);
            } else {
                localStorage.removeItem(AUTH_CONFIG.storageKeys.token);
            }
        } catch (e) {
            // Storage error
        }
    }

    /**
     * Check if session is valid (synchronous)
     */
    hasValidSession() {
        try {
            return localStorage.getItem(AUTH_CONFIG.storageKeys.session) === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Update user data
     */
    async updateUser(userData) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        try {
            // Merge with existing user data
            const updatedUser = { ...this.currentUser, ...userData };
            this.setCurrentUser(updatedUser);
            this.emit('user_updated', updatedUser);
            return updatedUser;
        } catch (error) {
            throw error;
        }
    }
}

// ============================================================
//  AUTH GUARD (Middleware)
// ============================================================
class AuthGuard {
    /**
     * Check authentication before page load
     */
    static async check(requiredRole = null, redirectPage = null) {
        const auth = window.HRMS?.Auth || new Auth();
        const api = window.HRMS?.api;
        
        if (api) {
            auth.setAPI(api);
        }

        // Check session
        const loggedIn = await auth.checkSession();

        if (!loggedIn) {
            // Not authenticated
            if (redirectPage) {
                window.location.href = redirectPage;
            } else {
                auth.redirectToLogin();
            }
            return false;
        }

        // Check role if required
        if (requiredRole) {
            const hasAccess = auth.hasRole(requiredRole);
            if (!hasAccess) {
                if (redirectPage) {
                    window.location.href = redirectPage;
                } else {
                    auth.redirectToDashboard();
                }
                return false;
            }
        }

        return true;
    }

    /**
     * Check and redirect if not authenticated (for pages that should be accessible only when logged in)
     */
    static async requireAuth(redirectPage = null) {
        return this.check(null, redirectPage);
    }

    /**
     * Check and redirect if not admin
     */
    static async requireAdmin(redirectPage = null) {
        return this.check('admin', redirectPage);
    }

    /**
     * Check and redirect if not admin or HR
     */
    static async requireAdminOrHR(redirectPage = null) {
        const auth = window.HRMS?.Auth || new Auth();
        const api = window.HRMS?.api;
        
        if (api) {
            auth.setAPI(api);
        }

        const loggedIn = await auth.checkSession();
        if (!loggedIn) {
            if (redirectPage) {
                window.location.href = redirectPage;
            } else {
                auth.redirectToLogin();
            }
            return false;
        }

        const hasAccess = auth.isAdminOrHR();
        if (!hasAccess) {
            if (redirectPage) {
                window.location.href = redirectPage;
            } else {
                auth.redirectToDashboard();
            }
            return false;
        }

        return true;
    }
}

// ============================================================
//  AUTH WIDGETS
// ============================================================

/**
 * Auth Widgets - UI components for auth
 */
class AuthWidgets {
    /**
     * Create login form
     */
    static createLoginForm(containerId, options = {}) {
        const {
            onSuccess = null,
            onError = null,
            redirect = true,
            showRegister = true
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <form id="loginForm" class="space-y-4">
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="loginEmail" class="form-control w-full" placeholder="admin@example.com" required />
                </div>
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="loginPassword" class="form-control w-full" placeholder="Enter your password" required />
                </div>
                <button type="submit" id="loginBtn" class="btn btn-primary btn-block">Sign In</button>
                ${showRegister ? `
                    <p class="text-center text-sm text-gray-600 mt-4">
                        Don't have an account? <a href="#" id="registerLink" class="text-blue-600 hover:underline">Sign Up</a>
                    </p>
                ` : ''}
                <div id="loginError" class="hidden text-red-500 text-sm text-center"></div>
            </form>
        `;

        container.innerHTML = html;

        // Handle login
        const form = container.querySelector('#loginForm');
        const emailInput = container.querySelector('#loginEmail');
        const passwordInput = container.querySelector('#loginPassword');
        const errorDiv = container.querySelector('#loginError');
        const loginBtn = container.querySelector('#loginBtn');
        const registerLink = container.querySelector('#registerLink');

        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Show register form
                const event = new CustomEvent('showRegister');
                document.dispatchEvent(event);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('hidden');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                errorDiv.textContent = 'Please fill in all fields.';
                errorDiv.classList.remove('hidden');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
                return;
            }

            try {
                const auth = window.HRMS?.Auth || new Auth();
                const api = window.HRMS?.api;
                if (api) auth.setAPI(api);

                const user = await auth.login(email, password);
                
                if (onSuccess) {
                    onSuccess(user);
                }

                if (redirect) {
                    auth.redirectToDashboard();
                }

            } catch (error) {
                errorDiv.textContent = error.message || 'Login failed';
                errorDiv.classList.remove('hidden');
                if (onError) onError(error);
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });
    }

    /**
     * Create register form
     */
    static createRegisterForm(containerId, options = {}) {
        const {
            onSuccess = null,
            onError = null,
            redirect = true
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <form id="registerForm" class="space-y-4">
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Employee ID</label>
                    <input type="text" id="regEmployeeId" class="form-control w-full" placeholder="EMP001" required />
                </div>
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="regName" class="form-control w-full" placeholder="John Doe" required />
                </div>
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="regEmail" class="form-control w-full" placeholder="john@example.com" required />
                </div>
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="regPassword" class="form-control w-full" placeholder="Min 6 characters" required minlength="6" />
                </div>
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700">Role</label>
                    <select id="regRole" class="form-control w-full">
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                        <option value="hr">HR</option>
                    </select>
                </div>
                <button type="submit" id="registerBtn" class="btn btn-success btn-block">Create Account</button>
                <p class="text-center text-sm text-gray-600 mt-4">
                    Already have an account? <a href="#" id="loginLink" class="text-blue-600 hover:underline">Sign In</a>
                </p>
                <div id="registerError" class="hidden text-red-500 text-sm text-center"></div>
            </form>
        `;

        container.innerHTML = html;

        // Handle registration
        const form = container.querySelector('#registerForm');
        const errorDiv = container.querySelector('#registerError');
        const registerBtn = container.querySelector('#registerBtn');
        const loginLink = container.querySelector('#loginLink');

        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                const event = new CustomEvent('showLogin');
                document.dispatchEvent(event);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('hidden');
            registerBtn.disabled = true;
            registerBtn.textContent = 'Creating...';

            const employee_id = container.querySelector('#regEmployeeId').value.trim();
            const name = container.querySelector('#regName').value.trim();
            const email = container.querySelector('#regEmail').value.trim();
            const password = container.querySelector('#regPassword').value;
            const role = container.querySelector('#regRole').value;

            if (!employee_id || !name || !email || !password) {
                errorDiv.textContent = 'All fields are required.';
                errorDiv.classList.remove('hidden');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
                return;
            }

            if (password.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters.';
                errorDiv.classList.remove('hidden');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
                return;
            }

            try {
                const auth = window.HRMS?.Auth || new Auth();
                const api = window.HRMS?.api;
                if (api) auth.setAPI(api);

                const user = await auth.register({ employee_id, name, email, password, role });
                
                if (onSuccess) {
                    onSuccess(user);
                }

                if (redirect) {
                    auth.redirectToDashboard();
                }

            } catch (error) {
                errorDiv.textContent = error.message || 'Registration failed';
                errorDiv.classList.remove('hidden');
                if (onError) onError(error);
            } finally {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
        });
    }

    /**
     * Create auth toggle (switch between login and register)
     */
    static createAuthToggle(loginContainerId, registerContainerId) {
        const loginContainer = document.getElementById(loginContainerId);
        const registerContainer = document.getElementById(registerContainerId);

        // Listen for custom events
        document.addEventListener('showLogin', () => {
            if (loginContainer) loginContainer.style.display = 'block';
            if (registerContainer) registerContainer.style.display = 'none';
        });

        document.addEventListener('showRegister', () => {
            if (loginContainer) loginContainer.style.display = 'none';
            if (registerContainer) registerContainer.style.display = 'block';
        });

        // Initially show login
        document.dispatchEvent(new CustomEvent('showLogin'));
    }
}

// ============================================================
//  AUTH HEADER INTERCEPTOR
// ============================================================

/**
 * Auth Header Interceptor - Add auth header to API requests
 */
function authHeaderInterceptor() {
    return function(url, options) {
        const auth = window.HRMS?.Auth;
        if (auth) {
            const token = auth.getToken();
            if (token) {
                options.headers = options.headers || {};
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return options;
    };
}

// ============================================================
//  EXPORT
// ============================================================

// Create auth instance
const auth = new Auth();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Auth,
        AuthGuard,
        AuthWidgets,
        auth,
        authHeaderInterceptor,
        AUTH_CONFIG
    };
}

// Global access
window.HRMS = window.HRMS || {};
window.HRMS.Auth = auth;
window.HRMS.AuthGuard = AuthGuard;
window.HRMS.AuthWidgets = AuthWidgets;

console.log('🔐 HRMS Auth Module loaded successfully!');

// Auto-initialize if API is already loaded
if (window.HRMS && window.HRMS.api) {
    auth.setAPI(window.HRMS.api);
}