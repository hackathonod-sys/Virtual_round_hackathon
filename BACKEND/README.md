# HRMS API - Endpoints

**Base URL:** `http://localhost/backend/api/` (adjust to your server)

All requests must include `credentials: 'include'` in fetch (to send session cookies).

## Authentication
| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| POST | `/auth.php?action=login` | Login | `{ email, password }` |
| POST | `/auth.php?action=register` | Register | `{ employee_id, name, email, password, role }` |
| GET | `/auth.php?action=logout` | Logout | - |
| GET | `/auth.php?action=check` | Check session | - |

## Employees
| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| GET | `/employees.php` | List all employees (admin only) | Query: `page, limit, search` |
| GET | `/employees.php?id={id}` | Get single employee (admin or self) | - |
| POST | `/employees.php` | Add employee (admin) | Full employee data |
| PUT | `/employees.php?id={id}` | Update employee (admin or self) | Fields to update |
| DELETE | `/employees.php?id={id}` | Delete employee (admin) | - |

## Attendance
| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| POST | `/attendance.php?action=checkin` | Check-in (employee) | - |
| POST | `/attendance.php?action=checkout` | Check-out (employee) | - |
| GET | `/attendance.php` | View own attendance | Query: `month, year` |
| GET | `/attendance.php?action=admin` | Admin view all | Query: `employee_id, date_from, date_to` |
| POST | `/attendance.php?action=mark` | Admin mark attendance | `{ employee_id, date, check_in, check_out, status }` |

## Leave
| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| POST | `/leave.php` | Apply leave (employee) | `{ leave_type, start_date, end_date, reason }` |
| GET | `/leave.php` | View own leaves | Query: `status` |
| GET | `/leave.php?action=pending` | Admin pending leaves | - |
| PUT | `/leave.php?action=approve&id={id}` | Approve leave (admin) | `{ remarks }` |
| PUT | `/leave.php?action=reject&id={id}` | Reject leave (admin) | `{ remarks }` |

## Payroll
| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| GET | `/payroll.php` | View own payroll | Query: `month, year` |
| GET | `/payroll.php?action=list` | Admin list payrolls | Query: `month, year` |
| PUT | `/payroll.php?action=edit&id={id}` | Edit salary (admin) | `{ basic, allowance, deduction }` |
| POST | `/payroll.php?action=generate` | Generate payroll (admin) | `{ month, year }` |

## Sample cURL (login)
```bash
curl -X POST http://localhost/backend/api/auth.php?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret"}' \
  -c cookies.txt