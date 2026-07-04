<?php
require_once __DIR__ . '/../helpers/Response.php';

function requireLogin() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!isset($_SESSION['user_id'])) {
        sendResponse(false, 'Unauthorized - please log in', null, 401);
    }
}

function requireAdmin() {
    requireLogin();
    if ($_SESSION['role'] !== 'admin') {
        sendResponse(false, 'Forbidden - admin only', null, 403);
    }
}

// Optional: get current user ID
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

function getRole() {
    return $_SESSION['role'] ?? null;
}
?>