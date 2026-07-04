<?php
require_once 'config.php';
require_once 'db.php';

$conn = Database::getConnection();

// Check if data already exists (avoid duplicates)
$stmt = $conn->query("SELECT COUNT(*) FROM users");
if ($stmt->fetchColumn() > 0) {
    die("Database already has data. Delete manually or truncate tables first if you want fresh data.");
}

// Helper to hash passwords
function hashPass($plain) {
    return password_hash($plain, PASSWORD_DEFAULT);
}

// Start transaction
$conn->beginTransaction();

try {
    // ---------- USERS ----------
    $users = [
        [
            'employee_id' => 'ADMIN001',
            'email'       => 'admin@hrms.com',
            'password'    => 'admin123',
            'role'        => 'admin'
        ],
        [
            'employee_id' => 'EMP001',
            'email'       => 'john.doe@company.com',
            'password'    => 'password123',
            'role'        => 'employee'
        ],
        [
            'employee_id' => 'EMP002',
            'email'       => 'jane.smith@company.com',
            'password'    => 'password123',
            'role'        => 'employee'
        ],
        [
            'employee_id' => 'EMP003',
            'email'       => 'bob.johnson@company.com',
            'password'    => 'password123',
            'role'        => 'employee'
        ]
    ];

    $userIds = [];
    $insertUser = $conn->prepare("INSERT INTO users (employee_id, email, password_hash, role) VALUES (?, ?, ?, ?)");
    foreach ($users as $u) {
        $insertUser->execute([$u['employee_id'], $u['email'], hashPass($u['password']), $u['role']]);
        $userIds[$u['employee_id']] = $conn->lastInsertId();
    }

    // ---------- EMPLOYEE PROFILES ----------
    $profiles = [
        [
            'user_id'     => $userIds['ADMIN001'],
            'first_name'  => 'Admin',
            'last_name'   => 'User',
            'phone'       => '123-456-7890',
            'address'     => '1 HR Street, City',
            'job_title'   => 'HR Manager',
            'department'  => 'Human Resources',
            'salary'      => 75000.00,
            'hire_date'   => '2020-01-15'
        ],
        [
            'user_id'     => $userIds['EMP001'],
            'first_name'  => 'John',
            'last_name'   => 'Doe',
            'phone'       => '234-567-8901',
            'address'     => '2 Employee Ave, City',
            'job_title'   => 'Software Engineer',
            'department'  => 'IT',
            'salary'      => 65000.00,
            'hire_date'   => '2021-03-10'
        ],
        [
            'user_id'     => $userIds['EMP002'],
            'first_name'  => 'Jane',
            'last_name'   => 'Smith',
            'phone'       => '345-678-9012',
            'address'     => '3 Developer Lane, City',
            'job_title'   => 'Product Manager',
            'department'  => 'Product',
            'salary'      => 72000.00,
            'hire_date'   => '2021-06-20'
        ],
        [
            'user_id'     => $userIds['EMP003'],
            'first_name'  => 'Bob',
            'last_name'   => 'Johnson',
            'phone'       => '456-789-0123',
            'address'     => '4 Tester Road, City',
            'job_title'   => 'QA Engineer',
            'department'  => 'IT',
            'salary'      => 58000.00,
            'hire_date'   => '2022-01-05'
        ]
    ];

    $insertProfile = $conn->prepare("INSERT INTO employee_profiles (user_id, first_name, last_name, phone, address, job_title, department, salary, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($profiles as $p) {
        $insertProfile->execute([$p['user_id'], $p['first_name'], $p['last_name'], $p['phone'], $p['address'], $p['job_title'], $p['department'], $p['salary'], $p['hire_date']]);
    }

    // ---------- ATTENDANCE (last 2 weeks) ----------
    $today = new DateTime();
    $start = (clone $today)->modify('-14 days');
    $statuses = ['present', 'present', 'present', 'absent', 'half-day', 'present', 'leave'];
    $employeeIds = [$userIds['EMP001'], $userIds['EMP002'], $userIds['EMP003']];

    $insertAttendance = $conn->prepare("INSERT INTO attendance (user_id, date, status, check_in, check_out) VALUES (?, ?, ?, ?, ?)");
    for ($d = clone $start; $d <= $today; $d->modify('+1 day')) {
        $date = $d->format('Y-m-d');
        // Skip weekends (optional)
        if (in_array($d->format('N'), [6,7])) continue; // skip sat/sun
        foreach ($employeeIds as $uid) {
            $status = $statuses[array_rand($statuses)];
            $check_in = null;
            $check_out = null;
            if ($status == 'present' || $status == 'half-day') {
                $check_in = '09:00:00';
                $check_out = ($status == 'present') ? '18:00:00' : '13:00:00';
            }
            $insertAttendance->execute([$uid, $date, $status, $check_in, $check_out]);
        }
    }

    // ---------- LEAVE REQUESTS ----------
    $leaves = [
        [
            'user_id'     => $userIds['EMP001'],
            'type'        => 'paid',
            'start_date'  => (new DateTime('+1 week'))->format('Y-m-d'),
            'end_date'    => (new DateTime('+1 week +2 days'))->format('Y-m-d'),
            'reason'      => 'Family vacation',
            'status'      => 'pending',
            'admin_comment' => null,
            'resolved_at' => null
        ],
        [
            'user_id'     => $userIds['EMP002'],
            'type'        => 'sick',
            'start_date'  => (new DateTime('-1 week'))->format('Y-m-d'),
            'end_date'    => (new DateTime('-1 week +1 day'))->format('Y-m-d'),
            'reason'      => 'Flu',
            'status'      => 'approved',
            'admin_comment' => 'Approved, rest well',
            'resolved_at' => (new DateTime('-5 days'))->format('Y-m-d H:i:s')
        ],
        [
            'user_id'     => $userIds['EMP003'],
            'type'        => 'unpaid',
            'start_date'  => (new DateTime('-2 weeks'))->format('Y-m-d'),
            'end_date'    => (new DateTime('-2 weeks +3 days'))->format('Y-m-d'),
            'reason'      => 'Personal errands',
            'status'      => 'rejected',
            'admin_comment' => 'No coverage available',
            'resolved_at' => (new DateTime('-1 week'))->format('Y-m-d H:i:s')
        ]
    ];

    $insertLeave = $conn->prepare("INSERT INTO leaves (user_id, type, start_date, end_date, reason, status, admin_comment, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($leaves as $l) {
        $insertLeave->execute([$l['user_id'], $l['type'], $l['start_date'], $l['end_date'], $l['reason'], $l['status'], $l['admin_comment'], $l['resolved_at']]);
    }

    // ---------- ANNOUNCEMENTS ----------
    $announcements = [
        [
            'admin_id' => $userIds['ADMIN001'],
            'title'    => 'Welcome to the new HRMS!',
            'content'  => 'We have launched a new system to manage HR operations. Please explore the features.'
        ],
        [
            'admin_id' => $userIds['ADMIN001'],
            'title'    => 'Company Picnic 2026',
            'content'  => 'Mark your calendars for July 20th. Details to follow.'
        ]
    ];

    $insertAnnounce = $conn->prepare("INSERT INTO announcements (admin_id, title, content) VALUES (?, ?, ?)");
    foreach ($announcements as $a) {
        $insertAnnounce->execute([$a['admin_id'], $a['title'], $a['content']]);
    }

    $conn->commit();
    echo "✅ Dummy data inserted successfully!\n";
    echo "Admin login: admin@hrms.com / admin123\n";
    echo "Employee login: any employee email / password123\n";

} catch (Exception $e) {
    $conn->rollBack();
    echo "❌ Error: " . $e->getMessage() . "\n";
}