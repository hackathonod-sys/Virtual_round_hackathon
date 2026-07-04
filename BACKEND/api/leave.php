<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../helpers/Response.php';

session_start();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// ---------- EMPLOYEE APPLY LEAVE (POST) ----------
if ($method === 'POST' && !$action) {
    requireLogin();
    $userId = getUserId();
    $input = json_decode(file_get_contents('php://input'), true);
    $leave_type = $input['leave_type'] ?? '';
    $start_date = $input['start_date'] ?? '';
    $end_date = $input['end_date'] ?? '';
    $reason = $input['reason'] ?? '';

    if (empty($leave_type) || empty($start_date) || empty($end_date)) {
        sendResponse(false, 'Leave type, start date, and end date are required', null, 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([$userId, $leave_type, $start_date, $end_date, $reason]);
    sendResponse(true, 'Leave applied successfully', ['id' => $pdo->lastInsertId()]);
}

// ---------- EMPLOYEE VIEW OWN LEAVES (GET without action) ----------
if ($method === 'GET' && !$action) {
    requireLogin();
    $userId = getUserId();
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $sql = "SELECT * FROM leave_requests WHERE employee_id = ?";
    $params = [$userId];
    if ($status) {
        $sql .= " AND status = ?";
        $params[] = $status;
    }
    $sql .= " ORDER BY created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $leaves = $stmt->fetchAll();
    sendResponse(true, 'Leave requests', $leaves);
}

// ---------- ADMIN: VIEW PENDING LEAVES ----------
if ($method === 'GET' && $action === 'pending') {
    requireAdmin();
    $stmt = $pdo->prepare("
        SELECT l.*, u.name as employee_name, u.employee_id
        FROM leave_requests l
        JOIN users u ON l.employee_id = u.id
        WHERE l.status = 'pending'
        ORDER BY l.created_at ASC
    ");
    $stmt->execute();
    $pending = $stmt->fetchAll();
    sendResponse(true, 'Pending leave requests', $pending);
}

// ---------- ADMIN: APPROVE LEAVE ----------
if ($method === 'PUT' && $action === 'approve' && $id) {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $remarks = $input['remarks'] ?? null;

    $stmt = $pdo->prepare("UPDATE leave_requests SET status = 'approved', remarks = ? WHERE id = ?");
    $stmt->execute([$remarks, $id]);
    sendResponse(true, 'Leave approved');
}

// ---------- ADMIN: REJECT LEAVE ----------
if ($method === 'PUT' && $action === 'reject' && $id) {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $remarks = $input['remarks'] ?? null;

    $stmt = $pdo->prepare("UPDATE leave_requests SET status = 'rejected', remarks = ? WHERE id = ?");
    $stmt->execute([$remarks, $id]);
    sendResponse(true, 'Leave rejected');
}

// If no valid route
sendResponse(false, 'Invalid action or method', null, 400);
?>