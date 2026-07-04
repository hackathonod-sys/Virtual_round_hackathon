<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../helpers/Response.php';

session_start();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// ---------- GET: list all employees (admin) or single profile (self) ----------
if ($method === 'GET') {
    // If id is provided, get single employee
    if ($id) {
        // Allow if admin or the employee themselves
        requireLogin();
        $currentUserId = getUserId();
        $role = getRole();
        if ($role !== 'admin' && $currentUserId != $id) {
            sendResponse(false, 'Forbidden', null, 403);
        }
        $stmt = $pdo->prepare("
            SELECT u.*, d.name as department_name, des.name as designation_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN designations des ON u.designation_id = des.id
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            sendResponse(false, 'Employee not found', null, 404);
        }
        // Remove password from output
        unset($user['password']);
        sendResponse(true, 'Employee fetched', $user);
    }

    // List all employees (admin only)
    requireAdmin();
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? '%' . $_GET['search'] . '%' : null;

    $countQuery = "SELECT COUNT(*) as total FROM users WHERE role = 'employee'";
    $query = "
        SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.status,
               d.name as department, des.name as designation
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN designations des ON u.designation_id = des.id
        WHERE u.role = 'employee'
    ";
    $params = [];
    if ($search) {
        $countQuery .= " AND (name LIKE ? OR employee_id LIKE ? OR email LIKE ?)";
        $query .= " AND (u.name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ?)";
        $params = [$search, $search, $search];
    }
    // Count total
    $stmt = $pdo->prepare($countQuery);
    $stmt->execute($params);
    $total = $stmt->fetch()['total'];

    // Fetch paginated
    $query .= " ORDER BY u.id DESC LIMIT $offset, $limit";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $employees = $stmt->fetchAll();

    sendResponse(true, 'Employees list', [
        'data' => $employees,
        'total' => (int)$total,
        'page' => $page,
        'limit' => $limit
    ]);
}

// ---------- POST: Add new employee (admin only) ----------
if ($method === 'POST') {
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $employee_id = $input['employee_id'] ?? '';
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $role = $input['role'] ?? 'employee';
    $phone = $input['phone'] ?? null;
    $address = $input['address'] ?? null;
    $department_id = isset($input['department_id']) ? (int)$input['department_id'] : null;
    $designation_id = isset($input['designation_id']) ? (int)$input['designation_id'] : null;
    $status = $input['status'] ?? 'active';

    if (empty($employee_id) || empty($name) || empty($email) || empty($password)) {
        sendResponse(false, 'Employee ID, Name, Email, and Password are required', null, 400);
    }

    // Check uniqueness
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR employee_id = ?");
    $stmt->execute([$email, $employee_id]);
    if ($stmt->fetch()) {
        sendResponse(false, 'Email or Employee ID already exists', null, 409);
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("
        INSERT INTO users 
        (employee_id, name, email, password, role, phone, address, department_id, designation_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$employee_id, $name, $email, $hashed, $role, $phone, $address, $department_id, $designation_id, $status]);
    $newId = $pdo->lastInsertId();

    sendResponse(true, 'Employee added successfully', ['id' => $newId]);
}

// ---------- PUT: Update employee (admin or self) ----------
if ($method === 'PUT') {
    requireLogin();
    if (!$id) sendResponse(false, 'ID required', null, 400);

    $currentUserId = getUserId();
    $role = getRole();
    if ($role !== 'admin' && $currentUserId != $id) {
        sendResponse(false, 'Forbidden', null, 403);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $fields = [];
    $params = [];

    // Allowed fields to update
    $allowed = ['name', 'email', 'phone', 'address', 'profile_image', 'department_id', 'designation_id', 'status'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $input)) {
            $fields[] = "$field = ?";
            $params[] = $input[$field];
        }
    }
    // Password update (if provided)
    if (!empty($input['password'])) {
        $fields[] = "password = ?";
        $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
    }

    if (empty($fields)) {
        sendResponse(false, 'No fields to update', null, 400);
    }

    $params[] = $id;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    sendResponse(true, 'Employee updated successfully');
}

// ---------- DELETE: Remove employee (admin only) ----------
if ($method === 'DELETE') {
    requireAdmin();
    if (!$id) sendResponse(false, 'ID required', null, 400);

    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        sendResponse(false, 'Employee not found', null, 404);
    }

    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    sendResponse(true, 'Employee deleted');
}

// If method not allowed
sendResponse(false, 'Method not allowed', null, 405);
?>