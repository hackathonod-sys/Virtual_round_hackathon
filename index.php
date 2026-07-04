<?php
// index.php – smart redirect based on session role

// Start session to check login status
session_start();

// If user is logged in and we have a role, redirect accordingly
if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
    $role = $_SESSION['role'];
    
    // Admin or HR go to admin dashboard
    if ($role === 'admin' || $role === 'hr') {
        header('Location: frontend/admin/dashboard.html');
    } else {
        // Everyone else (employee) goes to employee dashboard
        header('Location: frontend/employee/dashboard.html');
    }
    exit;
}

// Not logged in or role missing – go to login page
header('Location: frontend/login.html');
exit;
?>
