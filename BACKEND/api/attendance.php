<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../helpers/Response.php';

session_start();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ---------- EMPLOYEE CHECK-IN ----------
if ($method === 'POST' && $action === 'checkin') {
    requireLogin();
    $userId = getUserId();
    $today = date('Y-m-d');
    $now = date('H:i:s');

    // Check if already checked in today
    $stmt = $pdo->prepare("SELECT id, check_in FROM attendance WHERE employee_id = ? AND date = ?");
    $stmt->execute([$userId, $today]);
    $record = $stmt->fetch();
    if ($record) {
        if ($record['check_in']) {
            sendResponse(false, 'Already checked in today at ' . $record['check_in'], null, 409);
        } else {
            // Update the record with check-in (shouldn't happen if we insert with check_in)
        }
    }

    // Insert new attendance record
    $stmt = $pdo->prepare("INSERT INTO attendance (employee_id, date, check_in, status) VALUES (?, ?, ?, 'present')");
    $stmt->execute([$userId, $today, $now]);
    sendResponse(true, 'Checked in successfully at ' . $now);
}

// ---------- EMPLOYEE CHECK-OUT ----------
if ($method === 'POST' && $action === 'checkout') {
    requireLogin();
    $userId = getUserId();
    $today = date('Y-m-d');
    $now = date('H:i:s');

    $stmt = $pdo->prepare("SELECT id, check_in FROM attendance WHERE employee_id = ? AND date = ?");
    $stmt->execute([$userId, $today]);
    $record = $stmt->fetch();
    if (!$record) {
        sendResponse(false, 'You have not checked in today', null, 400);
    }
    if ($record['check_in'] === null) {
        sendResponse(false, 'You have not checked in today', null, 400);
    }

    // Update check-out
    $stmt = $pdo->prepare("UPDATE attendance SET check_out = ? WHERE id = ?");
    $stmt->execute([$now, $record['id']]);
    sendResponse(true, 'Checked out successfully at ' . $now);
}

// ---------- EMPLOYEE VIEW OWN ATTENDANCE (GET without action) ----------
if ($method === 'GET' && !$action) {
    requireLogin();
    $userId = getUserId();
    $month = isset($_GET['month']) ? (int)$_GET['month'] : date('n');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');

    // Today's record
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("SELECT date, check_in, check_out, status FROM attendance WHERE employee_id = ? AND date = ?");
    $stmt->execute([$userId, $today]);
    $todayRecord = $stmt->fetch() ?: ['date' => $today, 'check_in' => null, 'check_out' => null, 'status' => 'absent'];

    // History for given month
    $stmt = $pdo->prepare("SELECT date, check_in, check_out, status FROM attendance WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ? ORDER BY date DESC");
    $stmt->execute([$userId, $month, $year]);
    $history = $stmt->fetchAll();

    sendResponse(true, 'Attendance data', [
        'today' => $todayRecord,
        'history' => $history
    ]);
}

// ---------- ADMIN: LIST ALL ATTENDANCE ----------
if ($method === 'GET' && $action === 'admin') {
    requireAdmin();
    $employee_id = isset($_GET['employee_id']) ? (int)$_GET['employee_id'] : null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;

    $sql = "SELECT a.*, u.name as employee_name, u.employee_id 
            FROM attendance a
            JOIN users u ON a.employee_id = u.id
            WHERE 1=1";
    $params = [];
    if ($employee_id) {
        $sql .= " AND a.employee_id = ?";
        $params[] = $employee_id;
    }
    if ($date_from) {
        $sql .= " AND a.date >= ?";
        $params[] = $date_from;
    }
    if ($date_to) {
        $sql .= " AND a.date <= ?";
        $params[] = $date_to;
    }
    $sql .= " ORDER BY a.date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $attendance = $stmt->fetchAll();
    sendResponse(true, 'Attendance records', $attendance);
}

// ---------- ADMIN: MARK ATTENDANCE ----------
if ($method === 'POST' && $action === 'mark') {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $employee_id = $input['employee_id'] ?? null;
    $date = $input['date'] ?? null;
    $check_in = $input['check_in'] ?? null;
    $check_out = $input['check_out'] ?? null;
    $status = $input['status'] ?? 'present';

    if (!$employee_id || !$date) {
        sendResponse(false, 'Employee ID and date are required', null, 400);
    }

    // Validate employee exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$employee_id]);
    if (!$stmt->fetch()) {
        sendResponse(false, 'Employee not found', null, 404);
    }

    // Upsert attendance
    $stmt = $pdo->prepare("
        INSERT INTO attendance (employee_id, date, check_in, check_out, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), check_out = VALUES(check_out), status = VALUES(status)
    ");
    $stmt->execute([$employee_id, $date, $check_in, $check_out, $status]);
    sendResponse(true, 'Attendance marked successfully');
}

// If no valid route
sendResponse(false, 'Invalid action or method', null, 400);
?>