const navLinks = document.querySelectorAll(".nav");
const pages = document.querySelectorAll(".page");
const API_BASE = 'http://127.0.0.1:5000/api';

// Display welcome message
document.addEventListener('DOMContentLoaded', () => {
    const internName = localStorage.getItem('name');
    const welcomeMessageElement = document.getElementById('welcome-message');
    if (internName && welcomeMessageElement) {
        welcomeMessageElement.textContent = `Welcome ${internName} 👋`;
    }
    loadDashboardData();
});

navLinks.forEach(link => {
    link.onclick = () => {
        navLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        pages.forEach(p => p.classList.remove("show"));
        document.getElementById(link.dataset.target).classList.add("show");

        if (link.dataset.target === 'internships') {
            loadInternships();
        }
        if (link.dataset.target === 'tasks') {
            loadTasks();
        }
        if (link.dataset.target === 'mentor') {
            loadMentors();
        }
    };
});

async function loadMentors() {
    const list = document.getElementById('mentor-list');
    list.innerHTML = 'Loading...';

    try {
        const response = await fetch(API_BASE + '/enrollments', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const enrollments = response.ok ? await response.json() : [];

        list.innerHTML = '';
        if (enrollments.length === 0) {
            list.innerHTML = '<p>No mentors assigned yet.</p>';
        } else {
            enrollments.forEach(e => {
                const card = `
                    <div class="mentor-card pastel-peach">
                        <h3>${e.mentor_name}</h3>
                        <p><strong>Internship:</strong> ${e.intern_name}</p>
                        <p><strong>Duration:</strong> ${e.duration}</p>
                        <p><em>Contact Admin for details</em></p>
                    </div>
                    <br>
                `;
                list.innerHTML += card;
            });
        }
    } catch (error) {
        console.error('Error loading mentors:', error);
        list.innerHTML = '<p>Failed to load mentors.</p>';
    }
}

// Logout functionality
const logoutLink = document.getElementById('logout-link');
logoutLink.addEventListener('click', logoutUser);

function logoutUser() {
    // Remove token from local storage
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    // Redirect to login page
    window.location.href = 'index.html';
}

// Internship functionality
async function loadInternships() {
    const enrolledList = document.getElementById('enrolled-internships');
    const availableList = document.getElementById('available-internships');
    enrolledList.innerHTML = 'Loading...';
    availableList.innerHTML = 'Loading...';

    try {
        // Load enrolled internships
        const enrolledResponse = await fetch(API_BASE + '/enrollments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const enrolledInternships = enrolledResponse.ok ? await enrolledResponse.json() : [];

        enrolledList.innerHTML = '';
        if (enrolledInternships.length === 0) {
            enrolledList.innerHTML = '<p>No enrolled internships yet.</p>';
        } else {
            enrolledInternships.forEach(internship => {
                const internshipCard = `
                    <div class="card pastel-blue">
                        <h3>${internship.intern_name}</h3>
                        <p>Mentor: ${internship.mentor_name}</p>
                        <p>Duration: ${internship.duration}</p>
                        <p>Enrolled: ${new Date(internship.enrolled_at).toLocaleDateString()}</p>
                    </div>
                `;
                enrolledList.innerHTML += internshipCard;
            });
        }

        // Load all internships for available
        const allResponse = await fetch(API_BASE + '/internships', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const allInternships = allResponse.ok ? await allResponse.json() : [];

        availableList.innerHTML = '';
        const enrolledIds = enrolledInternships.map(i => i.id);
        const available = allInternships.filter(i => !enrolledIds.includes(i.id));

        if (available.length === 0) {
            availableList.innerHTML = '<p>No available internships.</p>';
        } else {
            available.forEach(internship => {
                const internshipCard = `
                    <div class="card pastel-green">
                        <h3>${internship.intern_name}</h3>
                        <p>Mentor: ${internship.mentor_name}</p>
                        <p>Duration: ${internship.duration}</p>
                        <button onclick="enrollInInternship(${internship.id})">Enroll</button>
                    </div>
                `;
                availableList.innerHTML += internshipCard;
            });
        }

    } catch (error) {
        console.error('Error fetching internships:', error);
        enrolledList.innerHTML = '<p>Failed to load internships.</p>';
        availableList.innerHTML = '<p>Failed to load internships.</p>';
    }
}

// Enroll in internship
async function enrollInInternship(internshipId) {
    try {
        const response = await fetch(API_BASE + '/enrollments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ internship_id: internshipId })
        });
        if (response.ok) {
            alert('Enrolled successfully!');
            loadInternships();
        } else {
            const error = await response.json();
            alert('Enrollment failed: ' + error.error);
        }
    } catch (error) {
        console.error('Error enrolling:', error);
        alert('Failed to enroll.');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch(API_BASE + '/tasks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tasks = await response.json();

        const completed = tasks.filter(t => t.status === 'Completed').length;
        const pending = tasks.filter(t => t.status === 'Pending').length;
        const total = tasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update cards
        document.querySelector('.card:nth-child(1) h2').textContent = completed;
        document.querySelector('.card:nth-child(2) h2').textContent = pending;
        document.querySelector('.card:nth-child(3) h2').textContent = `${progress}%`;

        // Load enrolled internships count
        const enrollResponse = await fetch(API_BASE + '/enrollments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (enrollResponse.ok) {
            const enrollments = await enrollResponse.json();
            document.getElementById('internships-enrolled').textContent = enrollments.length;
        }

        // Update today's focus
        const taskGrid = document.querySelector('#dashboard .task-grid');
        taskGrid.innerHTML = '';
        tasks.slice(0, 3).forEach(task => {
            const priorityClass = task.priority.toLowerCase();
            const taskDiv = `<div class="task soft big">${task.title} <span class="tag ${priorityClass}">${task.priority}</span></div>`;
            taskGrid.innerHTML += taskDiv;
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

// Load tasks
async function loadTasks() {
    const todayTasks = document.querySelector('#tasks .task-grid:nth-of-type(1)');
    const weekTasks = document.querySelector('#tasks .task-grid:nth-of-type(2)');
    todayTasks.innerHTML = 'Loading...';
    weekTasks.innerHTML = 'Loading...';

    try {
        const response = await fetch(API_BASE + '/tasks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tasks = await response.json();

        todayTasks.innerHTML = '';
        weekTasks.innerHTML = '';

        tasks.forEach(task => {
            const priorityClass = `priority-${task.priority.toLowerCase()}`;
            const statusClass = task.status === 'Completed' ? 'completed' : '';
            const taskDiv = `
                <div class="task soft big ${priorityClass} ${statusClass}">
                    <div class="task-head"><span>${task.title}</span><span class="tag ${task.priority.toLowerCase()}">${task.priority}</span></div>
                    <p>${task.description || ''}</p>
                    ${task.status !== 'Completed' ? `<button onclick="submitTask(${task.id})">Submit</button>` : '<span>Submitted</span>'}
                </div>
            `;
            if (task.due_date && new Date(task.due_date) <= new Date()) {
                todayTasks.innerHTML += taskDiv;
            } else {
                weekTasks.innerHTML += taskDiv;
            }
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);
        todayTasks.innerHTML = '<p>Failed to load tasks.</p>';
        weekTasks.innerHTML = '<p>Failed to load tasks.</p>';
    }
}

// Submit task
async function submitTask(taskId) {
    const content = prompt('Enter submission content:');
    if (!content) return;

    try {
        const response = await fetch(API_BASE + `/tasks/${taskId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ content })
        });
        if (response.ok) {
            alert('Task submitted!');
            loadTasks();
            loadDashboardData();
        } else {
            alert('Failed to submit task.');
        }
    } catch (error) {
        console.error('Error submitting task:', error);
    }
}

new Chart(dash1, { type: "line", data: { labels: [1, 2, 3, 4], datasets: [{ data: [2, 3, 5, 6], borderColor: "#6366f1", tension: .4 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } } });
new Chart(dash2, { type: "bar", data: { labels: ["M", "T", "W", "T", "F"], datasets: [{ data: [5, 4, 4, 3, 4], backgroundColor: "#8b5cf6" }] }, options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } } });
new Chart(dash3, { type: "doughnut", data: { datasets: [{ data: [72, 28], backgroundColor: ["#22c55e", "#e5e7eb"], cutout: "70%" }] }, options: { plugins: { legend: { display: false } } } });
new Chart(weeklyChart, { type: "line", data: { labels: ["Week 1", "Week 2", "Week 3", "Week 4"], datasets: [{ data: [60, 72, 85, 90], fill: true, backgroundColor: "rgba(99,102,241,.2)", borderColor: "#6366f1", tension: .4 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } } });