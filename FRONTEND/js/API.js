/**
 * HRMS API Integration Module
 * Handles all API calls, authentication, and error handling
 * Version: 1.0.0
 */

// ============================================================
//  CONFIGURATION
// ============================================================
const API_CONFIG = {
    // Base URL for all API calls - adjust based on your environment
    baseURL: window.location.hostname === 'localhost' 
        ? '../../backend/api/' 
        : '/backend/api/',
    
    // Default headers
    headers: {
        'Content-Type': 'application/json',
    },
    
    // Timeout in milliseconds
    timeout: 30000,
    
    // Whether to include credentials (cookies)
    credentials: 'include'
};

// ============================================================
//  API ERROR CLASS
// ============================================================
class APIError extends Error {
    constructor(message, statusCode, data = null) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.data = data;
    }
}

// ============================================================
//  API CLIENT
// ============================================================
class APIClient {
    constructor(config = {}) {
        this.config = { ...API_CONFIG, ...config };
        this.interceptors = {
            request: [],
            response: [],
            error: []
        };
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(fn) {
        this.interceptors.request.push(fn);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fn) {
        this.interceptors.response.push(fn);
    }

    /**
     * Add error interceptor
     */
    addErrorInterceptor(fn) {
        this.interceptors.error.push(fn);
    }

    /**
     * Main request method
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : this.config.baseURL + endpoint;
        
        // Apply request interceptors
        let requestOptions = {
            method: options.method || 'GET',
            credentials: this.config.credentials,
            headers: { ...this.config.headers, ...options.headers },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.signal || AbortSignal.timeout(this.config.timeout)
        };

        // Clean up undefined body
        if (requestOptions.body === undefined) {
            delete requestOptions.body;
        }

        // Apply request interceptors
        for (const interceptor of this.interceptors.request) {
            const result = await interceptor(url, requestOptions);
            if (result) {
                Object.assign(requestOptions, result);
            }
        }

        try {
            const response = await fetch(url, requestOptions);
            let data;
            
            // Parse response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // Check if response is successful
            if (!response.ok) {
                throw new APIError(
                    data.message || data.error || `HTTP Error ${response.status}`,
                    response.status,
                    data
                );
            }

            // Check for API success flag
            if (data && data.success === false) {
                throw new APIError(
                    data.message || 'API request failed',
                    response.status || 400,
                    data
                );
            }

            // Apply response interceptors
            let responseData = { data, response };
            for (const interceptor of this.interceptors.response) {
                responseData = await interceptor(responseData) || responseData;
            }

            return responseData.data;

        } catch (error) {
            // Handle timeout
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                const timeoutError = new APIError('Request timeout', 408);
                return this.handleError(timeoutError);
            }

            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = new APIError('Network error - please check your connection', 0);
                return this.handleError(networkError);
            }

            // Handle API errors
            return this.handleError(error);
        }
    }

    /**
     * Handle errors with interceptors
     */
    handleError(error) {
        let processedError = error;
        for (const interceptor of this.interceptors.error) {
            const result = interceptor(processedError);
            if (result) {
                processedError = result;
            }
        }
        throw processedError;
    }

    // ============================================================
    //  HTTP METHODS
    // ============================================================

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    patch(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Upload file with FormData
     */
    upload(endpoint, formData, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            headers: {
                ...options.headers,
                'Content-Type': undefined // Let browser set multipart boundary
            },
            body: formData
        });
    }
}

// ============================================================
//  API SERVICES
// ============================================================

/**
 * Authentication Service
 */
class AuthService {
    constructor(api) {
        this.api = api;
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await this.api.post('auth.php?action=login', { email, password });
            if (response.success && response.data) {
                // Store user data
                this.setCurrentUser(response.data);
                return response.data;
            }
            throw new APIError(response.message || 'Login failed');
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Register user
     */
    async register(userData) {
        try {
            const response = await this.api.post('auth.php?action=register', userData);
            if (response.success) {
                // Auto-login after registration
                return this.login(userData.email, userData.password);
            }
            throw new APIError(response.message || 'Registration failed');
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.api.get('auth.php?action=logout');
            this.clearCurrentUser();
            return true;
        } catch (error) {
            this.clearCurrentUser();
            throw error;
        }
    }

    /**
     * Check if user is logged in
     */
    async checkSession() {
        try {
            const response = await this.api.get('auth.php?action=check');
            if (response.success && response.data) {
                // Get full user profile
                const user = await this.getCurrentUser(response.data.user_id);
                this.setCurrentUser(user);
                return user;
            }
            return null;
        } catch (error) {
            this.clearCurrentUser();
            return null;
        }
    }

    /**
     * Get current user profile
     */
    async getCurrentUser(userId) {
        try {
            const response = await this.api.get(`employees.php?id=${userId}`);
            if (response.success && response.data) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get current user from storage
     */
    getStoredUser() {
        try {
            const data = localStorage.getItem('hrms_user');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    /**
     * Set current user in storage
     */
    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('hrms_user', JSON.stringify(user));
        }
    }

    /**
     * Clear current user from storage
     */
    clearCurrentUser() {
        localStorage.removeItem('hrms_user');
        sessionStorage.clear();
    }

    /**
     * Handle authentication errors
     */
    handleAuthError(error) {
        if (error.statusCode === 401) {
            this.clearCurrentUser();
        }
        return error;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        const user = this.getStoredUser();
        return user && (user.role === 'admin' || user.role === 'hr');
    }

    /**
     * Check if user is employee
     */
    isEmployee() {
        const user = this.getStoredUser();
        return user && user.role === 'employee';
    }

    /**
     * Get user role
     */
    getUserRole() {
        const user = this.getStoredUser();
        return user ? user.role : null;
    }

    /**
     * Get user name
     */
    getUserName() {
        const user = this.getStoredUser();
        return user ? user.name : null;
    }

    /**
     * Get user ID
     */
    getUserId() {
        const user = this.getStoredUser();
        return user ? user.id : null;
    }
}

/**
 * Employee Service
 */
class EmployeeService {
    constructor(api) {
        this.api = api;
    }

    /**
     * Get all employees (admin only)
     */
    async getAll(page = 1, limit = 10, filters = {}) {
        let url = `employees.php?page=${page}&limit=${limit}`;
        if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
        if (filters.status) url += `&status=${filters.status}`;
        if (filters.department) url += `&department=${filters.department}`;
        
        const response = await this.api.get(url);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to fetch employees');
    }

    /**
     * Get single employee
     */
    async getById(id) {
        const response = await this.api.get(`employees.php?id=${id}`);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Employee not found');
    }

    /**
     * Create employee (admin only)
     */
    async create(employeeData) {
        const response = await this.api.post('employees.php', employeeData);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to create employee');
    }

    /**
     * Update employee (admin or self)
     */
    async update(id, employeeData) {
        const response = await this.api.put(`employees.php?id=${id}`, employeeData);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to update employee');
    }

    /**
     * Delete employee (admin only)
     */
    async delete(id) {
        const response = await this.api.delete(`employees.php?id=${id}`);
        if (response.success) {
            return true;
        }
        throw new APIError(response.message || 'Failed to delete employee');
    }

    /**
     * Update profile (employee self)
     */
    async updateProfile(id, profileData) {
        return this.update(id, {
            phone: profileData.phone,
            address: profileData.address,
            profile_image: profileData.profile_image
        });
    }
}

/**
 * Attendance Service
 */
class AttendanceService {
    constructor(api) {
        this.api = api;
    }

    /**
     * Check in
     */
    async checkIn() {
        const response = await this.api.post('attendance.php?action=checkin');
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Check-in failed');
    }

    /**
     * Check out
     */
    async checkOut() {
        const response = await this.api.post('attendance.php?action=checkout');
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Check-out failed');
    }

    /**
     * Get employee attendance
     */
    async getMyAttendance(month = null, year = null) {
        const now = new Date();
        const m = month || now.getMonth() + 1;
        const y = year || now.getFullYear();
        const response = await this.api.get(`attendance.php?month=${m}&year=${y}`);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to fetch attendance');
    }

    /**
     * Get all attendance (admin only)
     */
    async getAllAttendance(filters = {}) {
        let url = 'attendance.php?action=admin';
        if (filters.employee_id) url += `&employee_id=${filters.employee_id}`;
        if (filters.date_from) url += `&date_from=${filters.date_from}`;
        if (filters.date_to) url += `&date_to=${filters.date_to}`;
        
        const response = await this.api.get(url);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to fetch attendance');
    }

    /**
     * Mark attendance (admin only)
     */
    async markAttendance(data) {
        const response = await this.api.post('attendance.php?action=mark', data);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to mark attendance');
    }

    /**
     * Get today's status
     */
    async getTodayStatus() {
        try {
            const data = await this.getMyAttendance();
            return data.today || { status: 'absent' };
        } catch {
            return { status: 'absent' };
        }
    }
}

/**
 * Leave Service
 */
class LeaveService {
    constructor(api) {
        this.api = api;
    }

    /**
     * Apply for leave
     */
    async apply(leaveData) {
        const response = await this.api.post('leave.php', leaveData);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to apply for leave');
    }

    /**
     * Get my leave requests
     */
    async getMyLeaves(status = null) {
        let url = 'leave.php';
        if (status) url += `?status=${status}`;
        const response = await this.api.get(url);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to fetch leaves');
    }

    /**
     * Get pending leaves (admin only)
     */
    async getPendingLeaves() {
        const response = await this.api.get('leave.php?action=pending');
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to fetch pending leaves');
    }

    /**
     * Approve leave (admin only)
     */
    async approve(id, remarks = '') {
        const response = await this.api.put(`leave.php?action=approve&id=${id}`, { remarks });
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to approve leave');
    }

    /**
     * Reject leave (admin only)
     */
    async reject(id, remarks = '') {
        const response = await this.api.put(`leave.php?action=reject&id=${id}`, { remarks });
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to reject leave');
    }

    /**
     * Cancel leave (employee)
     */
    async cancel(id) {
        // Using reject endpoint with cancellation remark
        return this.reject(id, 'Cancelled by employee');
    }

    /**
     * Get leave balance (calculated)
     */
    async getBalance() {
        const leaves = await this.getMyLeaves();
        const approved = leaves.filter(l => l.status.toLowerCase() === 'approved');
        
        // Default allowances
        const total = {
            annual: 20,
            sick: 10,
            casual: 5
        };

        // Calculate used
        const used = {
            annual: approved.filter(l => l.leave_type === 'annual')
                .reduce((sum, l) => sum + this.calculateDays(l.start_date, l.end_date), 0),
            sick: approved.filter(l => l.leave_type === 'sick')
                .reduce((sum, l) => sum + this.calculateDays(l.start_date, l.end_date), 0),
            casual: approved.filter(l => l.leave_type === 'casual')
                .reduce((sum, l) => sum + this.calculateDays(l.start_date, l.end_date), 0)
        };

        return {
            total,
            used,
            remaining: {
                annual: Math.max(0, total.annual - used.annual),
                sick: Math.max(0, total.sick - used.sick),
                casual: Math.max(0, total.casual - used.casual)
            },
            pending: leaves.filter(l => l.status.toLowerCase() === 'pending').length
        };
    }

    /**
     * Calculate days between dates
     */
    calculateDays(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
}

/**
 * Payroll Service
 */
class PayrollService {
    constructor(api) {
        this.api = api;
    }

    /**
     * Get my payroll
     */
    async getMyPayroll(month = null, year = null) {
        const now = new Date();
        const m = month || now.getMonth() + 1;
        const y = year || now.getFullYear();
        const response = await this.api.get(`payroll.php?month=${m}&year=${y}`);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Payroll not found');
    }

    /**
     * Get all payrolls (admin only)
     */
    async getAllPayrolls(month = null, year = null) {
        const now = new Date();
        const m = month || now.getMonth() + 1;
        const y = year || now.getFullYear();
        const response = await this.api.get(`payroll.php?action=list&month=${m}&year=${y}`);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to fetch payrolls');
    }

    /**
     * Update payroll (admin only)
     */
    async update(id, data) {
        const response = await this.api.put(`payroll.php?action=edit&id=${id}`, data);
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to update payroll');
    }

    /**
     * Generate payroll (admin only)
     */
    async generate(month = null, year = null) {
        const now = new Date();
        const m = month || now.getMonth() + 1;
        const y = year || now.getFullYear();
        const response = await this.api.post('payroll.php?action=generate', { month: m, year: y });
        if (response.success) {
            return response.data;
        }
        throw new APIError(response.message || 'Failed to generate payroll');
    }
}

/**
 * Dashboard Service
 */
class DashboardService {
    constructor(api) {
        this.api = api;
        this.attendanceService = new AttendanceService(api);
        this.leaveService = new LeaveService(api);
        this.employeeService = new EmployeeService(api);
        this.payrollService = new PayrollService(api);
    }

    /**
     * Get employee dashboard stats
     */
    async getEmployeeStats() {
        try {
            const [attendance, leaveBalance, payroll] = await Promise.all([
                this.attendanceService.getTodayStatus(),
                this.leaveService.getBalance(),
                this.payrollService.getMyPayroll()
            ]);

            return {
                attendance,
                leaveBalance,
                payroll,
                recentActivity: await this.getRecentActivity()
            };
        } catch (error) {
            return {
                attendance: { status: 'absent' },
                leaveBalance: { remaining: { annual: 0, sick: 0, casual: 0 } },
                payroll: null,
                recentActivity: []
            };
        }
    }

    /**
     * Get admin dashboard stats
     */
    async getAdminStats() {
        try {
            const [employees, attendance, pendingLeaves, payrolls] = await Promise.all([
                this.employeeService.getAll(1, 1),
                this.attendanceService.getAllAttendance(),
                this.leaveService.getPendingLeaves(),
                this.payrollService.getAllPayrolls()
            ]);

            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const presentToday = attendance ? attendance.filter(a => a.date === today && a.status === 'present').length : 0;

            return {
                totalEmployees: employees ? employees.total : 0,
                presentToday,
                pendingLeaves: pendingLeaves ? pendingLeaves.length : 0,
                payrollCount: payrolls ? payrolls.length : 0,
                recentActivity: await this.getRecentActivity()
            };
        } catch (error) {
            return {
                totalEmployees: 0,
                presentToday: 0,
                pendingLeaves: 0,
                payrollCount: 0,
                recentActivity: []
            };
        }
    }

    /**
     * Get recent activity for dashboard
     */
    async getRecentActivity() {
        try {
            const leaves = await this.leaveService.getMyLeaves();
            return leaves.slice(-3).reverse().map(l => ({
                type: 'leave',
                message: `Leave request (${l.leave_type}) - ${l.status}`,
                date: l.created_at
            }));
        } catch {
            return [];
        }
    }
}

// ============================================================
//  INITIALIZE AND EXPORT
// ============================================================

// Create API client instance
const api = new APIClient();

// Initialize services
const authService = new AuthService(api);
const employeeService = new EmployeeService(api);
const attendanceService = new AttendanceService(api);
const leaveService = new LeaveService(api);
const payrollService = new PayrollService(api);
const dashboardService = new DashboardService(api);

// Global error handler for unauthorized requests
api.addErrorInterceptor((error) => {
    if (error.statusCode === 401) {
        // Clear user data and redirect to login
        authService.clearCurrentUser();
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
    return error;
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        api,
        authService,
        employeeService,
        attendanceService,
        leaveService,
        payrollService,
        dashboardService,
        APIError
    };
}

// Global access (for non-module scripts)
window.HRMS = {
    api,
    auth: authService,
    employees: employeeService,
    attendance: attendanceService,
    leave: leaveService,
    payroll: payrollService,
    dashboard: dashboardService,
    APIError
};

console.log('✅ HRMS API Module loaded successfully!');