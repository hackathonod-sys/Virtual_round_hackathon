<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../helpers/Response.php';

session_start();

$action = $_GET['action'] ?? '';

// ---------- LOGIN ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        sendResponse(false, 'Email and password are required', null, 400);
    }

    $stmt = $pdo->prepare("SELECT id, name, email, password, role, employee_id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        sendResponse(true, 'Login successful', [
            'id' => $user['id'],
            'name' => $user['name'],
            'role' => $user['role'],
            'employee_id' => $user['employee_id'],
        ]);
    } else {
        sendResponse(false, 'Invalid credentials', null, 401);
    }
}

// ---------- REGISTER ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $input = json_decode(file_get_contents('php://input'), true);
    $employee_id = $input['employee_id'] ?? '';
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $role = $input['role'] ?? 'employee';

    if (empty($employee_id) || empty($name) || empty($email) || empty($password)) {
        sendResponse(false, 'All fields are required', null, 400);
    }

    // Check if email or employee_id already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR employee_id = ?");
    $stmt->execute([$email, $employee_id]);
    if ($stmt->fetch()) {
        sendResponse(false, 'Email or Employee ID already exists', null, 409);
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (employee_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$employee_id, $name, $email, $hashed, $role]);

    sendResponse(true, 'User registered successfully');
}

// ---------- LOGOUT ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'logout') {
    session_destroy();
    sendResponse(true, 'Logged out');
}

// ---------- CHECK SESSION ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check') {
    if (isset($_SESSION['user_id'])) {
        sendResponse(true, 'Authenticated', [
            'user_id' => $_SESSION['user_id'],
            'role' => $_SESSION['role']
        ]);
    } else {
        sendResponse(false, 'Not logged in', null, 401);
    }
}

// If no action matched
sendResponse(false, 'Invalid action', null, 400);
?>