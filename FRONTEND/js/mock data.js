/**
 * HRMS Mock Data Generator
 * Provides realistic test data for development and testing
 * Version: 1.0.0
 */

// ============================================================
//  MOCK DATA CONFIGURATION
// ============================================================
const MOCK_CONFIG = {
    numberOfEmployees: 50,
    departments: ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Legal', 'R&D'],
    designations: ['Manager', 'Senior', 'Junior', 'Intern', 'Lead', 'Executive', 'Analyst', 'Specialist'],
    leaveTypes: ['annual', 'sick', 'casual', 'unpaid', 'other'],
    attendanceStatus: ['present', 'absent', 'half_day', 'leave'],
    leaveStatus: ['pending', 'approved', 'rejected', 'cancelled'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

// ============================================================
//  NAME GENERATORS
// ============================================================
const FIRST_NAMES = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
    'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
    'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
    'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell'
];

// ============================================================
//  EMAIL DOMAINS
// ============================================================
const EMAIL_DOMAINS = ['company.com', 'hrms.com', 'demo.com', 'example.com', 'test.com'];

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function randomDateTime(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

function randomTime() {
    const hours = String(random(8, 18)).padStart(2, '0');
    const minutes = String(random(0, 59)).padStart(2, '0');
    const seconds = String(random(0, 59)).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function randomEmployeeId() {
    const prefix = randomItem(['EMP', 'HR', 'IT', 'FIN', 'MKT', 'SAL']);
    const number = String(random(1, 9999)).padStart(4, '0');
    return `${prefix}${number}`;
}

function randomName() {
    return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}

function randomEmail(name) {
    const parts = name.toLowerCase().split(' ');
    const email = parts.length === 2 
        ? `${parts[0]}.${parts[1]}@${randomItem(EMAIL_DOMAINS)}`
        : `${parts[0]}@${randomItem(EMAIL_DOMAINS)}`;
    return email;
}

function randomPhone() {
    const area = random(100, 999);
    const prefix = random(100, 999);
    const suffix = random(1000, 9999);
    return `+1 ${area}-${prefix}-${suffix}`;
}

function randomAddress() {
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Elm St'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA'];
    const number = random(100, 9999);
    return `${number} ${randomItem(streets)}, ${randomItem(cities)}, ${randomItem(states)} ${random(10000, 99999)}`;
}

function randomStatus() {
    const statuses = ['active', 'active', 'active', 'active', 'inactive'];
    return randomItem(statuses);
}

function randomDepartment() {
    return randomItem(MOCK_CONFIG.departments);
}

function randomDesignation(dept) {
    const designations = {
        'IT': ['Software Engineer', 'DevOps Engineer', 'System Admin', 'Network Engineer', 'IT Manager'],
        'HR': ['HR Specialist', 'Recruiter', 'HR Manager', 'Training Coordinator', 'Payroll Specialist'],
        'Finance': ['Accountant', 'Financial Analyst', 'Finance Manager', 'Auditor', 'Tax Specialist'],
        'Marketing': ['Marketing Specialist', 'SEO Expert', 'Content Writer', 'Marketing Manager', 'Social Media Manager'],
        'Sales': ['Sales Representative', 'Account Manager', 'Sales Manager', 'Business Development', 'Sales Executive'],
        'Operations': ['Operations Manager', 'Project Manager', 'Process Analyst', 'Supply Chain Manager'],
        'Legal': ['Legal Counsel', 'Paralegal', 'Compliance Officer', 'Contract Manager'],
        'R&D': ['Research Scientist', 'Product Developer', 'R&D Manager', 'Innovation Lead']
    };
    const deptDesignations = designations[dept] || ['Specialist', 'Manager', 'Analyst'];
    return randomItem(deptDesignations);
}

// ============================================================
//  MOCK DATA GENERATORS
// ============================================================

/**
 * Generate mock employee data
 */
function generateMockEmployees(count = MOCK_CONFIG.numberOfEmployees) {
    const employees = [];
    const usedEmails = new Set();
    const usedEmployeeIds = new Set();

    // Add admin user
    employees.push({
        id: 1,
        employee_id: 'ADMIN',
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password', // Will be hashed in backend
        role: 'admin',
        phone: '+1 555-000-0001',
        address: '123 Admin St, New York, NY 10001',
        department: 'IT',
        designation: 'System Administrator',
        salary: 75000,
        status: 'active',
        profile_image: null,
        created_at: new Date('2024-01-01').toISOString()
    });

    usedEmails.add('admin@example.com');
    usedEmployeeIds.add('ADMIN');

    // Generate employee users
    for (let i = 0; i < count; i++) {
        let name, email, employeeId;
        let attempts = 0;
        
        // Generate unique name and email
        do {
            name = randomName();
            email = randomEmail(name);
            employeeId = randomEmployeeId();
            attempts++;
        } while ((usedEmails.has(email) || usedEmployeeIds.has(employeeId)) && attempts < 50);

        if (attempts >= 50) continue;

        usedEmails.add(email);
        usedEmployeeIds.add(employeeId);

        const dept = randomDepartment();
        const isActive = randomStatus() === 'active';
        const salary = randomFloat(35000, 120000, 0);
        const joinDate = randomDate(new Date('2023-01-01'), new Date('2026-07-01'));

        employees.push({
            id: i + 2,
            employee_id: employeeId,
            name: name,
            email: email,
            password: 'password', // Will be hashed in backend
            role: 'employee',
            phone: randomPhone(),
            address: randomAddress(),
            department: dept,
            designation: randomDesignation(dept),
            salary: salary,
            status: isActive ? 'active' : 'inactive',
            profile_image: null,
            created_at: joinDate
        });
    }

    return employees;
}

/**
 * Generate mock attendance data
 */
function generateMockAttendance(employees, month = 7, year = 2026) {
    const attendance = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Only generate for employee users (skip admin)
    const employeeUsers = employees.filter(emp => emp.role === 'employee');

    employeeUsers.forEach(emp => {
        // Generate attendance for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            // Skip future dates
            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                break;
            }
            if (year === currentYear && month === currentMonth && day > today.getDate()) {
                continue;
            }

            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Randomly decide if attendance is recorded (85% chance)
            if (Math.random() > 0.85) continue;

            const status = randomItem(MOCK_CONFIG.attendanceStatus);
            const checkIn = status !== 'absent' && status !== 'leave' ? randomTime() : null;
            const checkOut = checkIn && status !== 'half_day' ? randomTime() : null;

            attendance.push({
                id: attendance.length + 1,
                employee_id: emp.id,
                employee_name: emp.name,
                employee_employee_id: emp.employee_id,
                date: date,
                check_in: checkIn,
                check_out: checkOut,
                status: status,
                created_at: `${date} 09:00:00`
            });
        }
    });

    return attendance;
}

/**
 * Generate mock leave data
 */
function generateMockLeaves(employees, count = 100) {
    const leaves = [];
    const employeeUsers = employees.filter(emp => emp.role === 'employee');

    for (let i = 0; i < count; i++) {
        const emp = randomItem(employeeUsers);
        const status = randomItem(MOCK_CONFIG.leaveStatus);
        const leaveType = randomItem(MOCK_CONFIG.leaveTypes);
        
        // Generate random date range (1-7 days)
        const startDate = randomDate(new Date('2025-01-01'), new Date('2026-12-31'));
        const start = new Date(startDate);
        const duration = random(1, 7);
        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + duration);
        
        const reason = randomItem([
            'Vacation', 'Family event', 'Medical appointment', 'Personal errands',
            'Doctor visit', 'Travel', 'Childcare', 'Home maintenance',
            'Education', 'Relocation', 'Wedding', 'Holiday'
        ]);

        leaves.push({
            id: i + 1,
            employee_id: emp.id,
            employee_name: emp.name,
            employee_employee_id: emp.employee_id,
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate.toISOString().split('T')[0],
            reason: `${reason} - ${randomItem(['Approved', 'Pending', 'Need more info', 'Urgent'])}`,
            status: status,
            remarks: status === 'approved' ? randomItem(['Approved', 'Enjoy your time off', 'Approved with request']) : 
                     status === 'rejected' ? randomItem(['Need more notice', 'Insufficient balance', 'Not approved']) : null,
            created_at: randomDateTime(new Date('2025-01-01'), new Date('2026-07-04'))
        });
    }

    return leaves;
}

/**
 * Generate mock payroll data
 */
function generateMockPayroll(employees, month = 7, year = 2026) {
    const payroll = [];
    const employeeUsers = employees.filter(emp => emp.role === 'employee');

    employeeUsers.forEach((emp, index) => {
        const basic = emp.salary || randomFloat(35000, 120000, 0);
        const allowance = basic * randomFloat(0.1, 0.3, 2);
        const deduction = basic * randomFloat(0.05, 0.15, 2);
        const netSalary = basic + allowance - deduction;

        payroll.push({
            id: index + 1,
            employee_id: emp.id,
            employee_name: emp.name,
            employee_employee_id: emp.employee_id,
            basic: basic,
            allowance: allowance,
            deduction: deduction,
            net_salary: netSalary,
            month: month,
            year: year,
            pay_date: `${year}-${String(month).padStart(2, '0')}-${random(20, 28)}`,
            status: randomItem(['Paid', 'Pending', 'Processing']),
            created_at: `${year}-${String(month).padStart(2, '0')}-${random(1, 5)} 10:00:00`
        });
    });

    return payroll;
}

/**
 * Generate complete mock dataset
 */
function generateMockData(options = {}) {
    const {
        employeeCount = 50,
        leaveCount = 100,
        month = new Date().getMonth() + 1,
        year = new Date().getFullYear()
    } = options;

    console.log('🔄 Generating mock data...');
    console.log(`📊 Employees: ${employeeCount}, Leaves: ${leaveCount}, Month: ${month}/${year}`);

    const employees = generateMockEmployees(employeeCount);
    const attendance = generateMockAttendance(employees, month, year);
    const leaves = generateMockLeaves(employees, leaveCount);
    const payroll = generateMockPayroll(employees, month, year);

    const data = {
        employees,
        attendance,
        leaves,
        payroll,
        meta: {
            generated_at: new Date().toISOString(),
            employee_count: employees.length,
            attendance_count: attendance.length,
            leave_count: leaves.length,
            payroll_count: payroll.length,
            month,
            year
        }
    };

    console.log('✅ Mock data generated successfully!');
    return data;
}

// ============================================================
//  MOCK API SIMULATOR
// ============================================================

/**
 * Mock API Simulator - Intercepts fetch requests and returns mock data
 */
class MockAPISimulator {
    constructor() {
        this.data = null;
        this.enabled = false;
        this.delay = 300; // Simulated network delay
    }

    /**
     * Initialize with mock data
     */
    init(options = {}) {
        this.data = generateMockData(options);
        this.enabled = true;
        this.setupInterceptors();
        console.log('🎯 Mock API Simulator enabled');
        return this.data;
    }

    /**
     * Setup fetch interceptor
     */
    setupInterceptors() {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = function(url, options = {}) {
            // Only intercept API calls
            if (self.enabled && typeof url === 'string' && url.includes('../../backend/api/')) {
                return self.handleRequest(url, options);
            }
            // Pass through for non-API requests
            return originalFetch.call(this, url, options);
        };

        console.log('🔌 Fetch interceptor installed');
    }

    /**
     * Handle mock API request
     */
    handleRequest(url, options = {}) {
        const method = options.method || 'GET';
        const endpoint = url.replace('../../backend/api/', '').split('?')[0];
        const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
        const body = options.body ? JSON.parse(options.body) : {};

        return new Promise((resolve) => {
            setTimeout(() => {
                const response = this.routeRequest(endpoint, method, params, body);
                resolve(response);
            }, this.delay);
        });
    }

    /**
     * Route request to appropriate handler
     */
    routeRequest(endpoint, method, params, body) {
        const handlers = {
            'auth.php': this.handleAuth,
            'employees.php': this.handleEmployees,
            'attendance.php': this.handleAttendance,
            'leave.php': this.handleLeave,
            'payroll.php': this.handlePayroll
        };

        const handler = handlers[endpoint];
        if (handler) {
            return handler.call(this, method, params, body);
        }

        // Default response
        return new Response(
            JSON.stringify({ success: false, message: 'Endpoint not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Handle auth requests
     */
    handleAuth(method, params, body) {
        const action = params.get('action') || '';
        const employees = this.data.employees;

        // Login
        if (method === 'POST' && action === 'login') {
            const user = employees.find(e => e.email === body.email);
            if (user && body.password === 'password') {
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Login successful',
                        data: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            employee_id: user.employee_id
                        }
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Invalid credentials' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Register
        if (method === 'POST' && action === 'register') {
            const newUser = {
                id: employees.length + 1,
                employee_id: body.employee_id,
                name: body.name,
                email: body.email,
                password: body.password,
                role: body.role || 'employee',
                status: 'active'
            };
            this.data.employees.push(newUser);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Registration successful',
                    data: {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role,
                        employee_id: newUser.employee_id
                    }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check session
        if (method === 'GET' && action === 'check') {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Authenticated',
                    data: { user_id: 1, role: 'admin' }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Logout
        if (method === 'GET' && action === 'logout') {
            return new Response(
                JSON.stringify({ success: true, message: 'Logged out' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: false, message: 'Invalid auth action' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Handle employee requests
     */
    handleEmployees(method, params, body) {
        const id = params.get('id');
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const search = params.get('search') || '';

        // GET single employee
        if (method === 'GET' && id) {
            const employee = this.data.employees.find(e => e.id == id);
            if (employee) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Employee found',
                        data: employee
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Employee not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // GET list
        if (method === 'GET') {
            let filtered = this.data.employees.filter(e => e.role !== 'admin');
            if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter(e => 
                    e.name.toLowerCase().includes(s) ||
                    e.email.toLowerCase().includes(s) ||
                    e.employee_id.toLowerCase().includes(s)
                );
            }
            const total = filtered.length;
            const start = (page - 1) * limit;
            const data = filtered.slice(start, start + limit);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Employees list',
                    data: {
                        data: data,
                        total: total,
                        page: page,
                        limit: limit
                    }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // POST - Add employee
        if (method === 'POST') {
            const newEmployee = {
                id: this.data.employees.length + 1,
                ...body,
                status: 'active'
            };
            this.data.employees.push(newEmployee);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Employee added',
                    data: newEmployee
                }),
                { status: 201, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // PUT - Update employee
        if (method === 'PUT' && id) {
            const index = this.data.employees.findIndex(e => e.id == id);
            if (index !== -1) {
                this.data.employees[index] = { ...this.data.employees[index], ...body };
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Employee updated',
                        data: this.data.employees[index]
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Employee not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // DELETE
        if (method === 'DELETE' && id) {
            const index = this.data.employees.findIndex(e => e.id == id);
            if (index !== -1) {
                const deleted = this.data.employees.splice(index, 1);
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Employee deleted',
                        data: deleted[0]
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Employee not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: false, message: 'Invalid request' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Handle attendance requests
     */
    handleAttendance(method, params, body) {
        const action = params.get('action') || '';
        const employee_id = params.get('employee_id');
        const date_from = params.get('date_from');
        const date_to = params.get('date_to');

        // Check-in
        if (method === 'POST' && action === 'checkin') {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Checked in successfully',
                    data: { time: new Date().toTimeString().slice(0, 8) }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check-out
        if (method === 'POST' && action === 'checkout') {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Checked out successfully',
                    data: { time: new Date().toTimeString().slice(0, 8) }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get employee attendance
        if (method === 'GET' && !action) {
            const month = params.get('month') || new Date().getMonth() + 1;
            const year = params.get('year') || new Date().getFullYear();
            const today = new Date().toISOString().split('T')[0];
            
            const history = this.data.attendance.filter(a => {
                const date = new Date(a.date);
                return date.getMonth() + 1 == month && date.getFullYear() == year;
            });

            const todayRecord = history.find(a => a.date === today) || {
                date: today,
                status: 'absent',
                check_in: null,
                check_out: null
            };

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Attendance data',
                    data: {
                        today: todayRecord,
                        history: history
                    }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Admin view
        if (method === 'GET' && action === 'admin') {
            let filtered = [...this.data.attendance];
            if (employee_id) {
                filtered = filtered.filter(a => a.employee_id == employee_id);
            }
            if (date_from) {
                filtered = filtered.filter(a => a.date >= date_from);
            }
            if (date_to) {
                filtered = filtered.filter(a => a.date <= date_to);
            }
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Attendance records',
                    data: filtered
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Mark attendance (admin)
        if (method === 'POST' && action === 'mark') {
            const newRecord = {
                id: this.data.attendance.length + 1,
                ...body
            };
            this.data.attendance.push(newRecord);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Attendance marked',
                    data: newRecord
                }),
                { status: 201, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: false, message: 'Invalid attendance request' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Handle leave requests
     */
    handleLeave(method, params, body) {
        const action = params.get('action') || '';
        const id = params.get('id');

        // Apply leave
        if (method === 'POST' && !action) {
            const newLeave = {
                id: this.data.leaves.length + 1,
                ...body,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            this.data.leaves.push(newLeave);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Leave applied successfully',
                    data: newLeave
                }),
                { status: 201, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get employee leaves
        if (method === 'GET' && !action) {
            const status = params.get('status');
            let filtered = [...this.data.leaves];
            if (status) {
                filtered = filtered.filter(l => l.status === status);
            }
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Leave requests',
                    data: filtered
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Admin: Get pending leaves
        if (method === 'GET' && action === 'pending') {
            const pending = this.data.leaves.filter(l => l.status === 'pending');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Pending leave requests',
                    data: pending
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Approve leave
        if (method === 'PUT' && action === 'approve' && id) {
            const index = this.data.leaves.findIndex(l => l.id == id);
            if (index !== -1) {
                this.data.leaves[index].status = 'approved';
                this.data.leaves[index].remarks = body.remarks || 'Approved';
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Leave approved',
                        data: this.data.leaves[index]
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Leave not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Reject leave
        if (method === 'PUT' && action === 'reject' && id) {
            const index = this.data.leaves.findIndex(l => l.id == id);
            if (index !== -1) {
                this.data.leaves[index].status = 'rejected';
                this.data.leaves[index].remarks = body.remarks || 'Rejected';
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Leave rejected',
                        data: this.data.leaves[index]
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Leave not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: false, message: 'Invalid leave request' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Handle payroll requests
     */
    handlePayroll(method, params, body) {
        const action = params.get('action') || '';
        const id = params.get('id');

        // Get employee payroll
        if (method === 'GET' && !action) {
            const month = params.get('month') || new Date().getMonth() + 1;
            const year = params.get('year') || new Date().getFullYear();
            const payroll = this.data.payroll.find(p => p.month == month && p.year == year);
            if (payroll) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Payroll data',
                        data: payroll
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Payroll not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Admin: List all payrolls
        if (method === 'GET' && action === 'list') {
            const month = params.get('month') || new Date().getMonth() + 1;
            const year = params.get('year') || new Date().getFullYear();
            const payrolls = this.data.payroll.filter(p => p.month == month && p.year == year);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Payroll list',
                    data: payrolls
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Admin: Edit payroll
        if (method === 'PUT' && action === 'edit' && id) {
            const index = this.data.payroll.findIndex(p => p.id == id);
            if (index !== -1) {
                const payroll = this.data.payroll[index];
                payroll.basic = body.basic || payroll.basic;
                payroll.allowance = body.allowance || payroll.allowance;
                payroll.deduction = body.deduction || payroll.deduction;
                payroll.net_salary = payroll.basic + payroll.allowance - payroll.deduction;
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Payroll updated',
                        data: payroll
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ success: false, message: 'Payroll not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Admin: Generate payroll
        if (method === 'POST' && action === 'generate') {
            const month = body.month || new Date().getMonth() + 1;
            const year = body.year || new Date().getFullYear();
            // Generate payroll for all employees
            const newPayrolls = generateMockPayroll(this.data.employees, month, year);
            this.data.payroll = this.data.payroll.concat(newPayrolls);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Payroll generated for ${newPayrolls.length} employees`
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: false, message: 'Invalid payroll request' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    /**
     * Disable mock API
     */
    disable() {
        this.enabled = false;
        console.log('🔴 Mock API Simulator disabled');
    }

    /**
     * Export data as JSON
     */
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }
}

// ============================================================
//  EXPORT
// ============================================================

// Create mock data instance
const mockData = generateMockData();
const mockSimulator = new MockAPISimulator();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateMockData,
        MockAPISimulator,
        mockData,
        mockSimulator
    };
}

// Global access
window.MockData = {
    generate: generateMockData,
    Simulator: MockAPISimulator,
    data: mockData,
    simulator: mockSimulator
};

console.log('🎭 HRMS Mock Data Module loaded successfully!');
console.log(`📊 Generated ${mockData.employees.length} employees, ${mockData.attendance.length} attendance records`);