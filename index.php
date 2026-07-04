x   <?php
// index.php – smart redirect: if logged in, go to dashboard; otherwise login

// Start session to check login status
session_start();

// If user is logged in, redirect to dashboard (which will handle role-based views)
if (isset($_SESSION['user_id'])) {
    header('Location: frontend/dashboard.html');
    exit;
}

// Otherwise go to login
header('Location: frontend/login.html');
exit;
?>