# 🏢 HRMS – Human Resource Management System

A full‑featured, self‑contained **Human Resource Management System** built with **PHP** (backend), **MySQL** (database), and a responsive **Bootstrap 5** frontend. It enables **Admins** to manage employees, attendance, leave approvals, payroll, and announcements, while **Employees** can view their profile, attendance, apply for leave, and check salary.

---

## ✨ Key Features

### 🔐 Authentication
- **Sign Up** – Employee ID, Email, Password (min 6 chars, uppercase/lowercase/digit), Role (Employee/Admin)
- **Email Verification** – OTP sent via email (SMTP or `mail()`), 10‑minute expiry
- **Login** – Secure session‑based authentication
- **Logout** – Destroys session

### 👨‍💼 Admin Dashboard
- **Dashboard** – Overview cards (total employees, present today, on leave, pending approvals, monthly payroll, attendance rate, departments) + recent leave requests
- **Employee Management** – Full CRUD (add, edit, delete, search)
- **Attendance Management** – View all employees’ attendance (monthly), add/edit/delete records
- **Leave Approvals** – View pending requests, approve/reject with comments; see all leaves with status
- **Payroll Management** – Generate payroll for a selected month, edit individual salary components (basic, allowance, deduction), view net pay, **Verify Accuracy** – cross‑checks against attendance and flags mismatches (net calculation, missing attendance, paid status without pay date)
- **Announcements** – Create, edit, delete announcements (with updated timestamp)

### 👤 Employee Dashboard
- **Dashboard** – Personal stats (days present, leave balance, pending requests, monthly salary, attendance rate, upcoming holidays, new announcements) + recent activity
- **My Profile** – View full profile, edit phone, address, profile picture
- **My Attendance** – View monthly attendance with colour‑coded status (Present, Absent, Half‑day, Leave); **Check‑In / Check‑Out** with real‑time current time (must check in first)
- **My Leaves** – Apply for leave (type, date range, reason); view leave history with status and admin comment; **only one pending application** at a time
- **Salary** – View monthly payroll breakdown (basic, allowance, deduction, net pay, status, pay date) with month selector
- **Live Announcements** – Auto‑refreshes every 25 seconds; shows "NEW" badge for latest post (within 1 minute)

---

## 🛠️ Tech Stack

| Layer       | Technology |
|-------------|------------|
| Backend     | PHP 7.4+ (PDO, sessions) |
| Database    | MySQL 5.7+ |
| Frontend    | HTML5, CSS3, Bootstrap 5.3, Font Awesome 6, Google Fonts (Poppins) |
| JavaScript  | Vanilla ES6 (Fetch API) |
| Email       | PHPMailer (or `mail()`) with SMTP / Gmail App Password |

---

## 📁 Project Structure

```
hrms/
├── index.php                         # Redirects to frontend/login.html
├── backend/
│   ├── config.php                    # DB credentials & email API key
│   ├── db.php                        # PDO database connection (singleton)
│   ├── auth.php                      # Authentication functions (login, register, session)
│   ├── api.php                       # Main REST API router (all endpoints)
│   └── seed.php                      # (optional) Dummy data generator
├── frontend/
│   ├── login.html                    # Login + Register (with OTP modal)
│   ├── dashboard.html                # Role‑based dashboard (Admin/Employee)
│   ├── profile.html                  # Employee profile (view + edit)
│   ├── attendance.html               # Employee attendance (check‑in/out, monthly table)
│   ├── leaves.html                   # Employee leave application + history + calendar
│   ├── salary.html                   # Employee salary view (month selector)
│   ├── announcements.html            # Live announcements feed (auto‑refresh)
│   ├── admin/
│   │   ├── employees.html            # Admin CRUD for employees
│   │   ├── attendance.html           # Admin attendance management
│   │   ├── leaves.html               # Admin leave approvals
│   │   ├── payroll.html              # Admin payroll management + accuracy check
│   │   └── announcements.html        # Admin announcement CRUD
│   ├── css/
│   │   └── style.css                 # (optional) custom styles
│   └── js/
│       └── api.js                    # Universal API caller (with query params)
└── sql/
    └── schema.sql                    # Database creation script
```

---

## 🚀 Installation Guide

### 1. Prerequisites
- PHP 7.4+ (with PDO, mysqli, curl, openssl)
- MySQL 5.7+
- Web server (Apache / Nginx)
- (Optional) Composer for PHPMailer

### 2. Clone / Download
Place the project in your web server root (e.g., `htdocs/hrms/`).

### 3. Create Database
Import the SQL schema:
```sql
CREATE DATABASE human_resource;
USE human_resource;
SOURCE sql/schema.sql;
```
Or run the provided `schema.sql` file via phpMyAdmin or command line.

### 4. Configure Backend
Edit `backend/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'human_resource');
define('DB_USER', 'root');
define('DB_PASS', '');
define('EMAIL_API_KEY', 'your-api-key-here'); // For email OTP (Gmail App Password or service key)
```
If using Gmail SMTP, set `EMAIL_API_KEY` as your App Password and update the `register` and `resend-otp` cases in `api.php` with PHPMailer credentials.

### 5. Set API Base URL
In `frontend/js/api.js`, adjust `API_BASE` if your project folder differs:
```js
const API_BASE = 'http://localhost/hrms/backend/api.php';
```

### 6. Seed Dummy Data (Optional)
Run `backend/seed.php` in browser or CLI to populate employees, attendance, leaves, and announcements.

### 7. Access the Application
Visit `http://localhost/hrms/` – you will be redirected to the login page.

---

## 🔑 Default Credentials

### Admin
- **Email:** `admin@hrms.com`  
- **Password:** `admin123`  

### Employees (if seed data used)
| Employee ID | Email                     | Password    |
|-------------|---------------------------|-------------|
| EMP001      | john.doe@company.com      | password123 |
| EMP002      | jane.smith@company.com    | password123 |
| EMP003      | bob.johnson@company.com   | password123 |

> If you do not use the seed script, you must register manually (OTP verification). The first registered user can be made Admin by setting role to `admin`.

---

## 📡 API Endpoints

All endpoints are served via `api.php?path=...` with the appropriate HTTP method. Example:  
`POST http://localhost/hrms/backend/api.php?path=login`

| Endpoint | Method | Description | Request Body (JSON) | Response |
|----------|--------|-------------|---------------------|----------|
| **Authentication** | | | | |
| `login` | POST | Authenticate user | `{ "email": "...", "password": "..." }` | `{ "success": true, "role": "admin/employee" }` |
| `register` | POST | Create new user (pending) | `{ "employee_id": "...", "email": "...", "password": "...", "role": "employee/admin" }` | `{ "success": true, "message": "...", "email": "..." }` |
| `verify-otp` | POST | Activate user with OTP | `{ "email": "...", "otp": "123456" }` | `{ "success": true, "message": "..." }` |
| `resend-otp` | POST | Resend OTP | `{ "email": "..." }` | `{ "success": true, "message": "..." }` |
| `logout` | POST | Destroy session | – | `{ "success": true }` |
| **Employee Profile** | | | | |
| `profile` | GET | View own profile | – | `{ id, employee_id, email, role, first_name, last_name, phone, address, job_title, department, salary, hire_date, profile_pic }` |
| `profile` | PUT | Update own profile | `{ "phone": "...", "address": "...", "profile_pic": "..." }` (all optional) | `{ "success": true }` |
| **Attendance** | | | | |
| `attendance` | GET | View attendance (with filters) | Query params: `start=YYYY-MM-DD`, `end=YYYY-MM-DD`, `user_id=ID` (admin only) | Array of attendance records |
| `attendance` | POST | Check‑in/out or add record | `{ "user_id": ID, "date": "YYYY-MM-DD", "status": "present/absent/half-day/leave", "check_in": "HH:MM", "check_out": "HH:MM" }` (user_id optional for employee) | `{ "success": true }` |
| `attendance/{id}` | DELETE | Delete record (admin only) | – | `{ "success": true }` |
| **Leaves** | | | | |
| `leaves` | GET | View leaves (admin gets all, employee gets own) | Query: `user_id=ID` (admin only) | Array of leave records |
| `leaves` | POST | Apply for leave | `{ "type": "paid/sick/unpaid", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "reason": "..." }` | `{ "success": true }` |
| `leaves/{id}` | PUT | Approve/reject (admin only) | `{ "status": "approved/rejected", "admin_comment": "..." }` | `{ "success": true }` |
| **Payroll** | | | | |
| `payroll` | GET | View payroll (admin list or employee own) | Query: `action=list` (admin) + `month=MM&year=YYYY` or `month=MM&year=YYYY` (employee view) | Array or single object |
| `payroll` | POST | Generate payroll (admin only) | `{ "month": "MM", "year": "YYYY" }` | `{ "success": true, "message": "..." }` |
| `payroll/{id}` | PUT | Update payroll record (admin only) | `{ "basic": 0, "allowance": 0, "deduction": 0, "status": "draft/generated/paid", "pay_date": "YYYY-MM-DD" }` | `{ "success": true }` |
| **Employees (Admin)** | | | | |
| `employees` | GET | List all employees | – | Array of employee objects |
| `employees` | POST | Create employee | `{ "employee_id": "...", "email": "...", "password": "...", "role": "...", "first_name": "...", "last_name": "...", "phone": "...", "address": "...", "job_title": "...", "department": "...", "salary": 0, "hire_date": "YYYY-MM-DD" }` | `{ "success": true, "user_id": ID }` |
| `employees/{id}` | PUT | Update employee | Fields same as POST (password optional) | `{ "success": true }` |
| `employees/{id}` | DELETE | Delete employee | – | `{ "success": true }` |
| **Announcements** | | | | |
| `announcements` | GET | List all (public) | – | Array of announcements |
| `announcements` | POST | Create (admin only) | `{ "title": "...", "content": "..." }` | `{ "success": true }` |
| `announcements/{id}` | PUT | Update (admin only) | `{ "title": "...", "content": "..." }` | `{ "success": true }` |
| `announcements/{id}` | DELETE | Delete (admin only) | – | `{ "success": true }` |
| **Dashboard** | | | | |
| `dashboard` | GET | Aggregated stats (role‑based) | – | Admin or employee dashboard object |

---

## 🧪 Testing & Usage

### Admin Flow
1. **Login** with admin credentials.
2. **Dashboard** – view key metrics and recent leaves.
3. **Employees** – add/edit/delete employee records.
4. **Attendance** – view all records, add/edit/delete per employee.
5. **Leave Approvals** – approve/reject pending requests with comments.
6. **Payroll** – select month → Generate payroll → Edit individual records → **Verify Accuracy** to check for mismatches.
7. **Announcements** – create/edit/delete posts.

### Employee Flow
1. **Login** with employee credentials.
2. **Dashboard** – personal stats and recent activity.
3. **Profile** – view and edit phone/address/profile picture.
4. **Attendance** – check‑in/out (current time) and view monthly history.
5. **Leaves** – apply for leave (only one pending at a time), view history.
6. **Salary** – select month to view breakdown.
7. **Announcements** – live feed auto‑refreshes.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Unauthorised" on registration** | Ensure `register`, `verify-otp`, `resend-otp` cases in `api.php` have NO `requireLogin()` or `requireAdmin()`. |
| **OTP email not sent** | Check SMTP settings in `api.php`; or use `mail()` with proper `From:` header. Set `EMAIL_API_KEY` correctly. |
| **Payroll "Verify Accuracy" fails** | Ensure `net` is a stored generated column or calculated; parse all numbers with `parseFloat()`. |
| **Attendance check‑in/out not working** | The API uses `ON DUPLICATE KEY UPDATE`; ensure the `attendance` table has a unique key on `(user_id, date)`. |
| **Session not persisting** | Verify `session_start()` is called in `config.php` and `credentials: 'include'` is set in `api.js` fetch options. |
| **CORS errors** | Add `header('Access-Control-Allow-Origin: *');` in `api.php` (or restrict to your domain). |

---

## 📝 Additional Notes

- **Password Policy** – minimum 6 chars, at least one uppercase, one lowercase, one digit.
- **OTP** – 6‑digit numeric, expires after 10 minutes, single‑use.
- **Payroll** – net pay is calculated as `basic + allowance - deduction` (stored as generated column).
- **Attendance Statuses** – `present`, `absent`, `half-day`, `leave`.
- **Leave** – employee can have only **one pending** leave request at a time (enforced in API).

---

## 🤝 Contributing

This is a complete, ready‑to‑use system. For enhancements, feel free to fork and submit PRs. Areas for improvement:
- Add PDF export for payroll
- Multi‑language support
- Advanced reporting (charts)

---

## 📄 License

MIT License – free to use, modify, and distribute.

---

**Happy HR‑ing!** 🚀
