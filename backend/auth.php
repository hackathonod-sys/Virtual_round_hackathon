<?php
require_once 'db.php';

function login($email, $password) {
    $conn = Database::getConnection();
    $stmt = $conn->prepare("SELECT id, employee_id, email, password_hash, role FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['employee_id'] = $user['employee_id'];
        return $user;
    }
    return false;
}

function register($employee_id, $email, $password, $role = 'employee') {
    $conn = Database::getConnection();
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (employee_id, email, password_hash, role) VALUES (?, ?, ?, ?)");
    return $stmt->execute([$employee_id, $email, $hashed, $role]);
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function requireLogin() {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

function requireAdmin() {
    requireLogin();
    if (!isAdmin()) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}
?>