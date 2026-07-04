document.addEventListener('DOMContentLoaded', async () => {
    const role = localStorage.getItem('role');
    if (!role) {
        window.location.href = 'login.html';
        return;
    }

    // Build nav
    const navLinks = document.getElementById('navLinks');
    let links = [];
    if (role === 'admin') {
        links = [
            { href: 'admin/employees.html', label: 'Employees' },
            { href: 'admin/attendance.html', label: 'Attendance' },
            { href: 'admin/leaves.html', label: 'Leave Approvals' },
            { href: 'admin/payroll.html', label: 'Payroll' },
            { href: 'admin/announcements.html', label: 'Announcements' },
        ];
    } else {
        links = [
            { href: 'profile.html', label: 'My Profile' },
            { href: 'attendance.html', label: 'My Attendance' },
            { href: 'leaves.html', label: 'My Leaves' },
            { href: 'salary.html', label: 'Salary' },
        ];
    }
    links.forEach(link => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.href = link.href;
        a.textContent = link.label;
        li.appendChild(a);
        navLinks.appendChild(li);
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await apiCall('logout', 'POST');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
    });

    // Display welcome
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `<h2>Welcome, ${role === 'admin' ? 'Admin' : 'Employee'}!</h2>
        <p>Use the navigation to manage your HR tasks.</p>`;
});