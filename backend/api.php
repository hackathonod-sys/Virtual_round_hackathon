<?php
// backend/api.php
require_once 'config.php';
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // adjust in production
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['path']) ? $_GET['path'] : '';
$segments = explode('/', trim($path, '/'));
$resource = isset($segments[0]) ? $segments[0] : '';
$id = isset($segments[1]) ? $segments[1] : null;

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

// Routing
try {
    switch ($resource) {
        // ---------- AUTH ----------
        case 'login':
            if ($method === 'POST') {
                $email = $input['email'] ?? '';
                $password = $input['password'] ?? '';
                $user = login($email, $password);
                if ($user) {
                    echo json_encode(['success' => true, 'role' => $user['role']]);
                } else {
                    http_response_code(401);
                    echo json_encode(['error' => 'Invalid credentials']);
                }
            }
            break;

        case 'register':
            if ($method === 'POST') {
                requireAdmin();
                $employee_id = $input['employee_id'] ?? '';
                $email = $input['email'] ?? '';
                $password = $input['password'] ?? '';
                $role = $input['role'] ?? 'employee';
                if (register($employee_id, $email, $password, $role)) {
                    echo json_encode(['success' => true]);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Registration failed']);
                }
            }
            break;

        case 'logout':
            session_destroy();
            echo json_encode(['success' => true]);
            break;

        // ---------- PROFILE ----------
        case 'profile':
            requireLogin();
            $user_id = getCurrentUserId();
            if ($method === 'GET') {
                $conn = Database::getConnection();
                $stmt = $conn->prepare("SELECT u.*, p.* FROM users u LEFT JOIN employee_profiles p ON u.id = p.user_id WHERE u.id = ?");
                $stmt->execute([$user_id]);
                $profile = $stmt->fetch(PDO::FETCH_ASSOC);
                unset($profile['password_hash']);
                echo json_encode($profile);
            } elseif ($method === 'PUT') {
                $fields = ['phone', 'address', 'profile_pic'];
                $updates = [];
                $params = [];
                foreach ($fields as $field) {
                    if (isset($input[$field])) {
                        $updates[] = "$field = ?";
                        $params[] = $input[$field];
                    }
                }
                if (count($updates) > 0) {
                    $params[] = $user_id;
                    $sql = "UPDATE employee_profiles SET " . implode(', ', $updates) . " WHERE user_id = ?";
                    $stmt = $conn->prepare($sql);
                    $stmt->execute($params);
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'No fields to update']);
                }
            }
            break;

        // ---------- ATTENDANCE ----------
        case 'attendance':
            requireLogin();
            $user_id = getCurrentUserId();
            $conn = Database::getConnection();

            if ($method === 'GET') {
                $target_user = isset($_GET['user_id']) ? $_GET['user_id'] : null;
                // Admin can see all if no user_id; otherwise only own or specified
                if ($target_user !== null && !isAdmin() && $target_user != $user_id) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Forbidden']);
                    break;
                }
                $start = isset($_GET['start']) ? $_GET['start'] : date('Y-m-01');
                $end = isset($_GET['end']) ? $_GET['end'] : date('Y-m-t');
                $sql = "SELECT * FROM attendance WHERE date BETWEEN ? AND ?";
                $params = [$start, $end];
                if ($target_user !== null) {
                    $sql .= " AND user_id = ?";
                    $params[] = $target_user;
                } elseif (!isAdmin()) {
                    $sql .= " AND user_id = ?";
                    $params[] = $user_id;
                }
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($records);
            } elseif ($method === 'POST') {
                // Check-in/out or manual add (admin only for others)
                if (!isAdmin() && isset($input['user_id']) && $input['user_id'] != $user_id) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Forbidden']);
                    break;
                }
                $target = isset($input['user_id']) ? $input['user_id'] : $user_id;
                $date = $input['date'] ?? date('Y-m-d');
                $status = $input['status'] ?? 'present';
                $check_in = $input['check_in'] ?? null;
                $check_out = $input['check_out'] ?? null;
                $stmt = $conn->prepare("INSERT INTO attendance (user_id, date, status, check_in, check_out) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, check_in = ?, check_out = ?");
                $stmt->execute([$target, $date, $status, $check_in, $check_out, $status, $check_in, $check_out]);
                echo json_encode(['success' => true]);
            } elseif ($method === 'DELETE') {
                requireAdmin();
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Record ID required']);
                    break;
                }
                $stmt = $conn->prepare("DELETE FROM attendance WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        // ---------- LEAVES ----------
        case 'leaves':
            requireLogin();
            $user_id = getCurrentUserId();
            $conn = Database::getConnection();

            if ($method === 'GET') {
                $target_user = isset($_GET['user_id']) ? $_GET['user_id'] : null;
                $sql = "SELECT l.*, u.employee_id FROM leaves l JOIN users u ON l.user_id = u.id";
                $params = [];
                if ($target_user !== null) {
                    if (!isAdmin() && $target_user != $user_id) {
                        http_response_code(403);
                        echo json_encode(['error' => 'Forbidden']);
                        break;
                    }
                    $sql .= " WHERE l.user_id = ?";
                    $params[] = $target_user;
                } elseif (!isAdmin()) {
                    $sql .= " WHERE l.user_id = ?";
                    $params[] = $user_id;
                }
                $sql .= " ORDER BY l.applied_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($records);
            } elseif ($method === 'POST') {
                // Apply for leave (employee) or admin adding for others
                $target = isset($input['user_id']) ? $input['user_id'] : $user_id;
                if (!isAdmin() && $target != $user_id) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Forbidden']);
                    break;
                }
                // Check if employee has a pending request
                $stmt = $conn->prepare("SELECT id FROM leaves WHERE user_id = ? AND status = 'pending'");
                $stmt->execute([$target]);
                if ($stmt->rowCount() > 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'You already have a pending leave request']);
                    break;
                }
                $type = $input['type'] ?? '';
                $start_date = $input['start_date'] ?? '';
                $end_date = $input['end_date'] ?? '';
                $reason = $input['reason'] ?? '';
                if (!$type || !$start_date || !$end_date) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Missing required fields']);
                    break;
                }
                $stmt = $conn->prepare("INSERT INTO leaves (user_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$target, $type, $start_date, $end_date, $reason]);
                echo json_encode(['success' => true]);
            } elseif ($method === 'PUT') {
                requireAdmin();
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Leave ID required']);
                    break;
                }
                $status = $input['status'] ?? '';
                $admin_comment = $input['admin_comment'] ?? '';
                if (!in_array($status, ['approved', 'rejected'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid status']);
                    break;
                }
                $stmt = $conn->prepare("UPDATE leaves SET status = ?, admin_comment = ?, resolved_at = NOW() WHERE id = ?");
                $stmt->execute([$status, $admin_comment, $id]);
                echo json_encode(['success' => true]);
            }
            break;

        // ---------- PAYROLL ----------
        case 'payroll':
            requireLogin();
            $user_id = getCurrentUserId();
            $conn = Database::getConnection();
        
            // GET – list payroll records
            if ($method === 'GET') {
                $action = isset($_GET['action']) ? $_GET['action'] : 'view';
                $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
                $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
                // Build a date from month/year (first day of month)
                $month_year = date('Y-m-01', strtotime("$year-$month-01"));
            
                if ($action === 'list' && isAdmin()) {
                    // Admin: list all employees with payroll for this month
                    $stmt = $conn->prepare("
                        SELECT u.id, u.employee_id, 
                               CONCAT(p.first_name, ' ', p.last_name) AS full_name,
                               p.salary AS base_salary,
                               pr.id AS payroll_id, pr.basic, pr.allowance, pr.deduction, pr.net, pr.status, pr.pay_date
                        FROM users u
                        JOIN employee_profiles p ON u.id = p.user_id
                        LEFT JOIN payroll pr ON u.id = pr.user_id AND pr.month_year = ?
                        ORDER BY u.id
                    ");
                    $stmt->execute([$month_year]);
                    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    echo json_encode($records);
                } elseif ($action === 'view' || $action === '') {
                    // Employee (or admin viewing own) – return their payroll for given month
                    $target_user = isset($_GET['user_id']) ? $_GET['user_id'] : $user_id;
                    if (!isAdmin() && $target_user != $user_id) {
                        http_response_code(403);
                        echo json_encode(['error' => 'Forbidden']);
                        break;
                    }
                    $stmt = $conn->prepare("
                        SELECT basic, allowance, deduction, net, status, pay_date
                        FROM payroll
                        WHERE user_id = ? AND month_year = ?
                    ");
                    $stmt->execute([$target_user, $month_year]);
                    $record = $stmt->fetch(PDO::FETCH_ASSOC);
                    echo json_encode($record ?: ['error' => 'No payroll found']);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid action']);
                }
            }
        
            // POST – generate payroll for a month (admin only)
            elseif ($method === 'POST') {
                requireAdmin();
                $month = $input['month'] ?? date('m');
                $year = $input['year'] ?? date('Y');
                $month_year = date('Y-m-01', strtotime("$year-$month-01"));
            
                // Check if payroll already exists for any employee – we'll generate only missing ones
                $conn->beginTransaction();
                try {
                    // Get all employees with their base salary
                    $stmt = $conn->prepare("
                        SELECT u.id, p.salary AS base_salary
                        FROM users u
                        JOIN employee_profiles p ON u.id = p.user_id
                        WHERE u.role = 'employee'
                    ");
                    $stmt->execute();
                    $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                    foreach ($employees as $emp) {
                        // Check if already exists
                        $check = $conn->prepare("SELECT id FROM payroll WHERE user_id = ? AND month_year = ?");
                        $check->execute([$emp['id'], $month_year]);
                        if ($check->rowCount() == 0) {
                            // Insert with basic = base_salary, allowance=0, deduction=0
                            $insert = $conn->prepare("
                                INSERT INTO payroll (user_id, month_year, basic, allowance, deduction, status)
                                VALUES (?, ?, ?, 0, 0, 'generated')
                            ");
                            $insert->execute([$emp['id'], $month_year, $emp['base_salary']]);
                        }
                    }
                    $conn->commit();
                    echo json_encode(['success' => true, 'message' => 'Payroll generated']);
                } catch (Exception $e) {
                    $conn->rollBack();
                    http_response_code(500);
                    echo json_encode(['error' => $e->getMessage()]);
                }
            }
        
            // PUT – update a payroll record (admin only)
            elseif ($method === 'PUT') {
                requireAdmin();
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Payroll ID required']);
                    break;
                }
                $basic = $input['basic'] ?? null;
                $allowance = $input['allowance'] ?? null;
                $deduction = $input['deduction'] ?? null;
                $status = $input['status'] ?? null;
                $pay_date = $input['pay_date'] ?? null;
            
                $updates = [];
                $params = [];
                if ($basic !== null) { $updates[] = "basic = ?"; $params[] = $basic; }
                if ($allowance !== null) { $updates[] = "allowance = ?"; $params[] = $allowance; }
                if ($deduction !== null) { $updates[] = "deduction = ?"; $params[] = $deduction; }
                if ($status !== null) { $updates[] = "status = ?"; $params[] = $status; }
                if ($pay_date !== null) { $updates[] = "pay_date = ?"; $params[] = $pay_date; }
            
                if (empty($updates)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No fields to update']);
                    break;
                }
            
                $params[] = $id;
                $sql = "UPDATE payroll SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                if ($stmt->rowCount() > 0) {
                    echo json_encode(['success' => true]);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Record not found or no changes made']);
                }
            }
        
            // DELETE – remove a payroll record (admin only)
            elseif ($method === 'DELETE') {
                requireAdmin();
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Payroll ID required']);
                    break;
                }
                $stmt = $conn->prepare("DELETE FROM payroll WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        // ---------- DASHBOARD ----------
        case 'dashboard':
            requireLogin();
            $role = $_SESSION['role'] ?? 'employee';
            $user_id = getCurrentUserId();
            $conn = Database::getConnection();      

            if ($role === 'admin') {
                // Admin dashboard stats
                $stmt = $conn->query("SELECT COUNT(*) FROM users WHERE role = 'employee'");
                $totalEmployees = $stmt->fetchColumn();     

                $today = date('Y-m-d');
                $stmt = $conn->prepare("SELECT COUNT(*) FROM attendance WHERE date = ? AND status = 'present'");
                $stmt->execute([$today]);
                $presentToday = $stmt->fetchColumn();       

                $stmt = $conn->prepare("SELECT COUNT(*) FROM attendance WHERE date = ? AND status = 'leave'");
                $stmt->execute([$today]);
                $onLeave = $stmt->fetchColumn();        

                $stmt = $conn->query("SELECT COUNT(*) FROM leaves WHERE status = 'pending'");
                $pendingApprovals = $stmt->fetchColumn();       

                $stmt = $conn->query("SELECT SUM(salary) FROM employee_profiles");
                $monthlyPayroll = $stmt->fetchColumn() ?: 0;        

                $totalEmployees = $totalEmployees ?: 1;
                $attendanceRate = round(($presentToday / $totalEmployees) * 100, 1);        

                $stmt = $conn->query("SELECT COUNT(DISTINCT department) FROM employee_profiles");
                $departments = $stmt->fetchColumn();        

                $stmt = $conn->query("
                    SELECT l.*, u.employee_id, CONCAT(p.first_name, ' ', p.last_name) as employee_name,
                           DATEDIFF(l.end_date, l.start_date) + 1 as days
                    FROM leaves l
                    JOIN users u ON l.user_id = u.id
                    JOIN employee_profiles p ON u.id = p.user_id
                    ORDER BY l.applied_at DESC LIMIT 5
                ");
                $recentLeaveRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);       

                $data = [
                    'totalEmployees' => (int)$totalEmployees,
                    'presentToday' => (int)$presentToday,
                    'onLeave' => (int)$onLeave,
                    'pendingApprovals' => (int)$pendingApprovals,
                    'monthlyPayroll' => (float)$monthlyPayroll,
                    'attendanceRate' => (float)$attendanceRate,
                    'departments' => (int)$departments,
                    'recentLeaveRequests' => $recentLeaveRequests
                ];
                echo json_encode($data);
            } else {
                // Employee dashboard
                $monthStart = date('Y-m-01');
                $monthEnd = date('Y-m-t');
                $stmt = $conn->prepare("SELECT COUNT(*) FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'present'");
                $stmt->execute([$user_id, $monthStart, $monthEnd]);
                $daysPresent = $stmt->fetchColumn();        

                $totalDays = date('t');
                $weekends = 0;
                for ($i = 1; $i <= $totalDays; $i++) {
                    $dayOfWeek = date('N', strtotime("$monthStart +".($i-1)." days"));
                    if ($dayOfWeek >= 6) $weekends++;
                }
                $totalWorkingDays = $totalDays - $weekends;
                $attendanceRate = $totalWorkingDays > 0 ? round(($daysPresent / $totalWorkingDays) * 100, 1) : 0;       

                $stmt = $conn->prepare("SELECT SUM(TIMESTAMPDIFF(DAY, start_date, end_date) + 1) FROM leaves WHERE user_id = ? AND status = 'approved'");
                $stmt->execute([$user_id]);
                $usedLeaves = $stmt->fetchColumn() ?: 0;
                $leaveBalance = max(0, 20 - $usedLeaves);       

                $stmt = $conn->prepare("SELECT COUNT(*) FROM leaves WHERE user_id = ? AND status = 'pending'");
                $stmt->execute([$user_id]);
                $pendingRequests = $stmt->fetchColumn();        

                $stmt = $conn->prepare("SELECT salary FROM employee_profiles WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $monthlySalary = $stmt->fetchColumn() ?: 0;     

                $upcomingHolidays = 0; // placeholder       

                $stmt = $conn->query("SELECT COUNT(*) FROM announcements WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
                $newAnnouncements = $stmt->fetchColumn();       

                $stmt = $conn->prepare("SELECT type, start_date, end_date, status FROM leaves WHERE user_id = ? ORDER BY applied_at DESC LIMIT 5");
                $stmt->execute([$user_id]);
                $recentActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $formattedActivity = array_map(function($item) {
                    $desc = ucfirst($item['type']) . ' leave from ' . $item['start_date'] . ' to ' . $item['end_date'];
                    return ['type' => 'Leave', 'description' => $desc, 'status' => $item['status']];
                }, $recentActivity);        

                $data = [
                    'daysPresent' => (int)$daysPresent,
                    'totalWorkingDays' => $totalWorkingDays,
                    'leaveBalance' => (int)$leaveBalance,
                    'pendingRequests' => (int)$pendingRequests,
                    'monthlySalary' => (float)$monthlySalary,
                    'attendanceRate' => (float)$attendanceRate,
                    'upcomingHolidays' => $upcomingHolidays,
                    'newAnnouncements' => (int)$newAnnouncements,
                    'recentActivity' => $formattedActivity
                ];
                echo json_encode($data);
            }
            break;

        // ---------- EMPLOYEES (Admin CRUD) ----------
        case 'employees':
            requireAdmin();
            $conn = Database::getConnection();
            if ($method === 'GET') {
                $stmt = $conn->prepare("SELECT u.id, u.employee_id, u.email, u.role, p.* FROM users u LEFT JOIN employee_profiles p ON u.id = p.user_id ORDER BY u.id");
                $stmt->execute();
                $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($employees as &$emp) unset($emp['password_hash']);
                echo json_encode($employees);
            } elseif ($method === 'POST') {
                // Create new employee
                $employee_id = $input['employee_id'] ?? '';
                $email = $input['email'] ?? '';
                $password = $input['password'] ?? '';
                $role = $input['role'] ?? 'employee';
                $first_name = $input['first_name'] ?? '';
                $last_name = $input['last_name'] ?? '';
                $phone = $input['phone'] ?? '';
                $address = $input['address'] ?? '';
                $job_title = $input['job_title'] ?? '';
                $department = $input['department'] ?? '';
                $salary = $input['salary'] ?? 0;
                $hire_date = $input['hire_date'] ?? date('Y-m-d');
                $conn->beginTransaction();
                try {
                    $hashed = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $conn->prepare("INSERT INTO users (employee_id, email, password_hash, role) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$employee_id, $email, $hashed, $role]);
                    $user_id = $conn->lastInsertId();
                    $stmt = $conn->prepare("INSERT INTO employee_profiles (user_id, first_name, last_name, phone, address, job_title, department, salary, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$user_id, $first_name, $last_name, $phone, $address, $job_title, $department, $salary, $hire_date]);
                    $conn->commit();
                    echo json_encode(['success' => true, 'user_id' => $user_id]);
                } catch (Exception $e) {
                    $conn->rollBack();
                    http_response_code(500);
                    echo json_encode(['error' => $e->getMessage()]);
                }
            } elseif ($method === 'PUT') {
                // Update employee profile (admin)
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'User ID required']);
                    break;
                }
                $fields = ['first_name', 'last_name', 'phone', 'address', 'job_title', 'department', 'salary', 'hire_date'];
                $updates = [];
                $params = [];
                foreach ($fields as $field) {
                    if (isset($input[$field])) {
                        $updates[] = "$field = ?";
                        $params[] = $input[$field];
                    }
                }
                if (count($updates) > 0) {
                    $params[] = $id;
                    $sql = "UPDATE employee_profiles SET " . implode(', ', $updates) . " WHERE user_id = ?";
                    $stmt = $conn->prepare($sql);
                    $stmt->execute($params);
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'No fields to update']);
                }
            } elseif ($method === 'DELETE') {
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'User ID required']);
                    break;
                }
                $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        // ---------- ANNOUNCEMENTS ----------
        // ---------- ANNOUNCEMENTS ----------
        case 'announcements':
            $conn = Database::getConnection();         

            // GET – list all announcements (public, no login required)
            if ($method === 'GET') {
                // Join with users to get the admin's employee_id
                $stmt = $conn->prepare("
                    SELECT a.*, u.employee_id as admin_employee_id 
                    FROM announcements a 
                    JOIN users u ON a.admin_id = u.id 
                    ORDER BY a.created_at DESC
                ");
                $stmt->execute();
                $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($announcements);
            }          

            // POST – create a new announcement (admin only)
            elseif ($method === 'POST') {
                requireAdmin();
                $title = $input['title'] ?? '';
                $content = $input['content'] ?? '';
                if (!$title || !$content) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Title and content are required']);
                    break;
                }
                $stmt = $conn->prepare("INSERT INTO announcements (admin_id, title, content) VALUES (?, ?, ?)");
                $stmt->execute([getCurrentUserId(), $title, $content]);
                echo json_encode(['success' => true]);
            }          

            // PUT – update an existing announcement (admin only, only own announcements)
            elseif ($method === 'PUT') {
                requireAdmin();
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Announcement ID required']);
                    break;
                }
                $title = $input['title'] ?? '';
                $content = $input['content'] ?? '';
                if (!$title || !$content) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Title and content are required']);
                    break;
                }
                // Update only if the logged-in admin is the owner
                $stmt = $conn->prepare("UPDATE announcements SET title = ?, content = ?, updated_at = NOW() WHERE id = ? AND admin_id = ?");
                $stmt->execute([$title, $content, $id, getCurrentUserId()]);
                if ($stmt->rowCount() === 0) {
                    http_response_code(403);
                    echo json_encode(['error' => 'You are not authorized to update this announcement or it does not exist']);
                    break;
                }
                echo json_encode(['success' => true]);
            }          

            // DELETE – remove an announcement (admin only, only own announcements)
            elseif ($method === 'DELETE') {
                requireAdmin();
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Announcement ID required']);
                    break;
                }
                // Delete only if the logged-in admin is the owner
                $stmt = $conn->prepare("DELETE FROM announcements WHERE id = ? AND admin_id = ?");
                $stmt->execute([$id, getCurrentUserId()]);
                if ($stmt->rowCount() === 0) {
                    http_response_code(403);
                    echo json_encode(['error' => 'You are not authorized to delete this announcement or it does not exist']);
                    break;
                }
                echo json_encode(['success' => true]);
            }
            break;

            // ---------- REGISTER (with OTP) ----------
            case 'register':
                if ($method === 'POST') {
                    $employee_id = trim($input['employee_id'] ?? '');
                    $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
                    $password = $input['password'] ?? '';
                    $role = in_array($input['role'] ?? '', ['admin', 'employee']) ? $input['role'] : 'employee';
            
                    // --- Validation ---
                    $errors = [];
                    if (!$employee_id) $errors[] = 'Employee ID is required.';
                    if (!$email) $errors[] = 'Valid email is required.';
                    if (strlen($password) < 6) $errors[] = 'Password must be at least 6 characters.';
                    if (!preg_match('/[A-Z]/', $password)) $errors[] = 'Password must contain an uppercase letter.';
                    if (!preg_match('/[a-z]/', $password)) $errors[] = 'Password must contain a lowercase letter.';
                    if (!preg_match('/[0-9]/', $password)) $errors[] = 'Password must contain a digit.';
            
                    if (!empty($errors)) {
                        http_response_code(400);
                        echo json_encode(['error' => implode(' ', $errors)]);
                        break;
                    }
            
                    $conn = Database::getConnection();
            
                    // Check existing user
                    $stmt = $conn->prepare("SELECT id FROM users WHERE employee_id = ? OR email = ?");
                    $stmt->execute([$employee_id, $email]);
                    if ($stmt->rowCount() > 0) {
                        http_response_code(409);
                        echo json_encode(['error' => 'Employee ID or Email already registered.']);
                        break;
                    }
            
                    // --- Create user (pending) ---
                    $hashed = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $conn->prepare("INSERT INTO users (employee_id, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'pending')");
                    if (!$stmt->execute([$employee_id, $email, $hashed, $role])) {
                        http_response_code(500);
                        echo json_encode(['error' => 'Registration failed.']);
                        break;
                    }
            
                    // --- Generate and store OTP ---
                    $otp = rand(100000, 999999);
                    $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));
                    $stmt = $conn->prepare("INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)");
                    $stmt->execute([$email, $otp, $expires]);
            
                    // --- Send OTP via email (using PHPMailer or mail()) ---
                    $subject = "HRMS - OTP Verification";
                    $message = "Your OTP for HRMS registration is: $otp\nValid for 10 minutes.";
                    // Use the API key from config for SMTP authentication
                    // require_once 'vendor/autoload.php'; // if using PHPMailer
                    // ... SMTP setup with EMAIL_API_KEY ...
                    // For simplicity, we use mail()
                    mail($email, $subject, $message, "From: no-reply@hrms.com\r\n");
            
                    echo json_encode([
                        'success' => true,
                        'message' => 'Registration successful. Please verify your email with the OTP sent.',
                        'email' => $email
                    ]);
                }
                break;

                case 'verify-otp':
                    if ($method === 'POST') {
                        $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
                        $otp = trim($input['otp'] ?? '');
                        if (!$email || !$otp) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Email and OTP required.']);
                            break;
                        }
                        $conn = Database::getConnection();
                        $stmt = $conn->prepare("SELECT id FROM otp_verifications WHERE email = ? AND otp = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
                        $stmt->execute([$email, $otp]);
                        $row = $stmt->fetch(PDO::FETCH_ASSOC);
                        if (!$row) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Invalid or expired OTP.']);
                            break;
                        }
                        // Mark used and activate user
                        $stmt = $conn->prepare("UPDATE otp_verifications SET used = TRUE WHERE id = ?");
                        $stmt->execute([$row['id']]);
                        $stmt = $conn->prepare("UPDATE users SET status = 'active' WHERE email = ?");
                        $stmt->execute([$email]);
                        echo json_encode(['success' => true, 'message' => 'Email verified. You can now log in.']);
                    }
                    break;
                
                case 'resend-otp':
                    if ($method === 'POST') {
                        $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
                        if (!$email) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Valid email required.']);
                            break;
                        }
                        $conn = Database::getConnection();
                        // Check if user exists and is pending
                        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND status = 'pending'");
                        $stmt->execute([$email]);
                        if ($stmt->rowCount() === 0) {
                            http_response_code(404);
                            echo json_encode(['error' => 'No pending registration found.']);
                            break;
                        }
                        // Invalidate old OTPs
                        $stmt = $conn->prepare("UPDATE otp_verifications SET used = TRUE WHERE email = ? AND used = FALSE");
                        $stmt->execute([$email]);
                        // Generate new OTP
                        $otp = rand(100000, 999999);
                        $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));
                        $stmt = $conn->prepare("INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)");
                        $stmt->execute([$email, $otp, $expires]);
                        // Send email
                        mail($email, "HRMS - New OTP", "Your new OTP is: $otp\nValid for 10 minutes.", "From: no-reply@hrms.com\r\n");
                        echo json_encode(['success' => true, 'message' => 'New OTP sent.']);
                    }
                    break;

// ---------- RESEND OTP ----------
case 'resend-otp':
    if ($method === 'POST') {
        $email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        if (!$email) {
            http_response_code(400);
            echo json_encode(['error' => 'Valid email required.']);
            break;
        }

        $conn = Database::getConnection();

        // Check if user exists and is pending
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND status = 'pending'");
        $stmt->execute([$email]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'No pending registration found for this email.']);
            break;
        }

        // Invalidate old OTPs for this email (optional)
        $stmt = $conn->prepare("UPDATE otp_verifications SET used = TRUE WHERE email = ? AND used = FALSE");
        $stmt->execute([$email]);

        // Generate new OTP
        $otp = rand(100000, 999999);
        $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        $stmt = $conn->prepare("INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $otp, $expires]);

        // Send email
        $subject = "HRMS - New OTP";
        $message = "Your new OTP for HRMS registration is: $otp\nThis OTP is valid for 10 minutes.";
        mail($email, $subject, $message, "From: no-reply@hrms.com\r\n");

        echo json_encode(['success' => true, 'message' => 'New OTP sent to your email.']);
    }
    break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>