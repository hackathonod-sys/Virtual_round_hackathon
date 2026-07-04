<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../helpers/Response.php';

session_start();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// ---------- EMPLOYEE VIEW OWN PAYROLL (GET without action) ----------
if ($method === 'GET' && !$action) {
    requireLogin();
    $userId = getUserId();
    $month = isset($_GET['month']) ? (int)$_GET['month'] : date('n');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');

    $stmt = $pdo->prepare("
        SELECT basic, allowance, deduction, net_salary, month, year
        FROM payroll
        WHERE employee_id = ? AND month = ? AND year = ?
    ");
    $stmt->execute([$userId, $month, $year]);
    $payroll = $stmt->fetch();
    if (!$payroll) {
        sendResponse(false, 'Payroll not found for this month', null, 404);
    }
    sendResponse(true, 'Payroll data', $payroll);
}

// ---------- ADMIN: LIST ALL PAYROLLS ----------
if ($method === 'GET' && $action === 'list') {
    requireAdmin();
    $month = isset($_GET['month']) ? (int)$_GET['month'] : date('n');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');

    $stmt = $pdo->prepare("
        SELECT p.*, u.name as employee_name, u.employee_id
        FROM payroll p
        JOIN users u ON p.employee_id = u.id
        WHERE p.month = ? AND p.year = ?
        ORDER BY u.name ASC
    ");
    $stmt->execute([$month, $year]);
    $payrolls = $stmt->fetchAll();
    sendResponse(true, 'Payroll list', $payrolls);
}

// ---------- ADMIN: EDIT SALARY COMPONENTS ----------
if ($method === 'PUT' && $action === 'edit' && $id) {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $basic = $input['basic'] ?? null;
    $allowance = $input['allowance'] ?? null;
    $deduction = $input['deduction'] ?? null;

    if ($basic === null && $allowance === null && $deduction === null) {
        sendResponse(false, 'At least one field to update required', null, 400);
    }

    $updates = [];
    $params = [];
    if ($basic !== null) {
        $updates[] = "basic = ?";
        $params[] = $basic;
    }
    if ($allowance !== null) {
        $updates[] = "allowance = ?";
        $params[] = $allowance;
    }
    if ($deduction !== null) {
        $updates[] = "deduction = ?";
        $params[] = $deduction;
    }
    // net_salary is generated, no need to update manually
    $params[] = $id;
    $sql = "UPDATE payroll SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    sendResponse(true, 'Payroll updated');
}

// ---------- ADMIN: GENERATE PAYROLL ----------
if ($method === 'POST' && $action === 'generate') {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $month = isset($input['month']) ? (int)$input['month'] : date('n');
    $year = isset($input['year']) ? (int)$input['year'] : date('Y');

    // Get all active employees with role 'employee'
    $stmt = $pdo->query("SELECT id FROM users WHERE role = 'employee' AND status = 'active'");
    $employees = $stmt->fetchAll();

    $count = 0;
    foreach ($employees as $emp) {
        $empId = $emp['id'];
        // Check if payroll already exists for this month
        $stmt = $pdo->prepare("SELECT id FROM payroll WHERE employee_id = ? AND month = ? AND year = ?");
        $stmt->execute([$empId, $month, $year]);
        if ($stmt->fetch()) {
            continue; // skip if already exists
        }

        // You can set default values or fetch from employee's salary settings (we'll use defaults)
        $basic = 5000; // default, you could store this per employee in users table
        $allowance = 500;
        $deduction = 200;
        $net = $basic + $allowance - $deduction;

        $stmt = $pdo->prepare("
            INSERT INTO payroll (employee_id, basic, allowance, deduction, net_salary, month, year)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$empId, $basic, $allowance, $deduction, $net, $month, $year]);
        $count++;
    }

    sendResponse(true, "Payroll generated for $count employees");
}

// If no valid route
sendResponse(false, 'Invalid action or method', null, 400);
?>