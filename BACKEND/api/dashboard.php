<?php
/**
 * Dashboard API - Provides statistics for employee and admin dashboards
 * Endpoints:
 *   GET /api/dashboard.php?type=employee   - Employee dashboard stats
 *   GET /api/dashboard.php?type=admin      - Admin dashboard stats
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../helpers/Response.php';

session_start();
$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? '';

// Only GET requests allowed
if ($method !== 'GET') {
    sendResponse(false, 'Method not allowed', null, 405);
}

// ---------- EMPLOYEE DASHBOARD STATS ----------
if ($type === 'employee') {
    requireLogin();
    $userId = getUserId();
    
    try {
        // 1. Today's attendance status
        $today = date('Y-m-d');
        $stmt = $pdo->prepare("SELECT status, check_in, check_out FROM attendance WHERE employee_id = ? AND date = ?");
        $stmt->execute([$userId, $today]);
        $todayAttendance = $stmt->fetch();
        
        $attendanceStatus = $todayAttendance ? $todayAttendance['status'] : 'absent';
        $checkIn = $todayAttendance ? $todayAttendance['check_in'] : null;
        $checkOut = $todayAttendance ? $todayAttendance['check_out'] : null;
        
        // 2. Leave balance (count of approved leaves this year)
        $year = date('Y');
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as used_leaves 
            FROM leave_requests 
            WHERE employee_id = ? 
            AND status = 'approved' 
            AND YEAR(start_date) = ?
        ");
        $stmt->execute([$userId, $year]);
        $usedLeaves = $stmt->fetch()['used_leaves'] ?? 0;
        $totalLeaveEntitlement = 15; // Annual leave entitlement (configurable)
        $leaveBalance = max(0, $totalLeaveEntitlement - $usedLeaves);
        
        // 3. Current month payroll
        $month = date('n');
        $year = date('Y');
        $stmt = $pdo->prepare("
            SELECT basic, allowance, deduction, net_salary 
            FROM payroll 
            WHERE employee_id = ? AND month = ? AND year = ?
        ");
        $stmt->execute([$userId, $month, $year]);
        $payroll = $stmt->fetch();
        
        // 4. Pending leave requests count
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as pending 
            FROM leave_requests 
            WHERE employee_id = ? AND status = 'pending'
        ");
        $stmt->execute([$userId]);
        $pendingLeaves = $stmt->fetch()['pending'] ?? 0;
        
        // 5. Attendance this month (for chart)
        $stmt = $pdo->prepare("
            SELECT status, COUNT(*) as count 
            FROM attendance 
            WHERE employee_id = ? 
            AND MONTH(date) = ? 
            AND YEAR(date) = ?
            GROUP BY status
        ");
        $stmt->execute([$userId, $month, $year]);
        $attendanceStats = $stmt->fetchAll();
        
        // Format attendance stats
        $attendanceChart = [
            'present' => 0,
            'absent' => 0,
            'half_day' => 0,
            'leave' => 0
        ];
        foreach ($attendanceStats as $stat) {
            $attendanceChart[$stat['status']] = (int)$stat['count'];
        }
        
        // 6. Recent activity (last 5 leave requests)
        $stmt = $pdo->prepare("
            SELECT leave_type, start_date, end_date, status, created_at 
            FROM leave_requests 
            WHERE employee_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        ");
        $stmt->execute([$userId]);
        $recentActivity = $stmt->fetchAll();
        
        $data = [
            'today_attendance' => [
                'status' => $attendanceStatus,
                'check_in' => $checkIn,
                'check_out' => $checkOut
            ],
            'leave_balance' => $leaveBalance,
            'total_leave_entitlement' => $totalLeaveEntitlement,
            'used_leaves' => $usedLeaves,
            'pending_leaves' => $pendingLeaves,
            'current_payroll' => $payroll ? [
                'basic' => $payroll['basic'],
                'allowance' => $payroll['allowance'],
                'deduction' => $payroll['deduction'],
                'net_salary' => $payroll['net_salary']
            ] : null,
            'attendance_chart' => $attendanceChart,
            'recent_activity' => $recentActivity
        ];
        
        sendResponse(true, 'Employee dashboard data fetched', $data);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

// ---------- ADMIN DASHBOARD STATS ----------
if ($type === 'admin') {
    requireAdmin();
    
    try {
        // 1. Total employees (active)
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE role = 'employee' AND status = 'active'");
        $totalEmployees = $stmt->fetch()['total'];
        
        // 2. Present today
        $today = date('Y-m-d');
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT employee_id) as present 
            FROM attendance 
            WHERE date = ? AND status = 'present'
        ");
        $stmt->execute([$today]);
        $presentToday = $stmt->fetch()['present'] ?? 0;
        
        // 3. Pending leave requests
        $stmt = $pdo->query("SELECT COUNT(*) as pending FROM leave_requests WHERE status = 'pending'");
        $pendingLeaves = $stmt->fetch()['pending'] ?? 0;
        
        // 4. Payroll records this month
        $month = date('n');
        $year = date('Y');
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count, SUM(net_salary) as total_payroll 
            FROM payroll 
            WHERE month = ? AND year = ?
        ");
        $stmt->execute([$month, $year]);
        $payrollStats = $stmt->fetch();
        
        // 5. Attendance summary for chart (last 7 days)
        $stmt = $pdo->prepare("
            SELECT 
                DATE(date) as day,
                COUNT(DISTINCT employee_id) as total_employees,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count
            FROM attendance 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(date)
            ORDER BY day ASC
        ");
        $stmt->execute();
        $attendanceTrend = $stmt->fetchAll();
        
        // 6. Recent employee registrations (last 5)
        $stmt = $pdo->query("
            SELECT employee_id, name, email, created_at 
            FROM users 
            WHERE role = 'employee' 
            ORDER BY created_at DESC 
            LIMIT 5
        ");
        $recentEmployees = $stmt->fetchAll();
        
        // 7. Department wise employee count
        $stmt = $pdo->query("
            SELECT d.name as department, COUNT(u.id) as count 
            FROM departments d
            LEFT JOIN users u ON u.department_id = d.id AND u.role = 'employee'
            GROUP BY d.id
            ORDER BY count DESC
        ");
        $departmentStats = $stmt->fetchAll();
        
        $data = [
            'total_employees' => (int)$totalEmployees,
            'present_today' => (int)$presentToday,
            'pending_leaves' => (int)$pendingLeaves,
            'payroll_stats' => [
                'total_employees' => (int)($payrollStats['count'] ?? 0),
                'total_payroll' => $payrollStats['total_payroll'] ?? 0
            ],
            'attendance_trend' => $attendanceTrend,
            'recent_employees' => $recentEmployees,
            'department_stats' => $departmentStats
        ];
        
        sendResponse(true, 'Admin dashboard data fetched', $data);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

// Invalid type
sendResponse(false, 'Invalid dashboard type. Use ?type=employee or ?type=admin', null, 400);
?>
