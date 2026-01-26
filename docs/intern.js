const navLinks = document.querySelectorAll(".nav");
const pages = document.querySelectorAll(".page");
const API_BASE = 'http://127.0.0.1:5005/api';
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "INTERN") {
    window.location.href = "index.html";
}

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
        if (link.dataset.target === 'progress') {
            loadProgressPage();
        }
    };
});

async function loadProgressPage() {
    const container = document.getElementById('progress-container');
    if (!container) return;

    container.innerHTML = '<p>Loading progress...</p>';

    try {
        // 1. Fetch Global Stats (for overall progress calculation)
        const statsRes = await fetch(API_BASE + '/intern/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = statsRes.ok ? await statsRes.json() : { overall_progress: 0, tasks_completed: 0, tasks_pending: 0 };

        // 2. Fetch Enrollments (for details)
        const enrollRes = await fetch(API_BASE + '/enrollments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const enrollments = enrollRes.ok ? await enrollRes.json() : [];

        container.innerHTML = '';

        if (enrollments.length === 0) {
            container.innerHTML = '<p>No internships enrolled.</p>';
            return;
        }

        // Render a card for each internship (Student Style)
        enrollments.forEach(e => {
            // For now, using global stats for the specific internship progress since we only have 1 active usually.
            const progress = stats.overall_progress;
            const completed = stats.tasks_completed;
            const pending = stats.tasks_pending;
            const total = completed + pending;

            // Status Logic
            let status = "In Progress";
            let statusColor = "#4f46e5"; // Indigo
            let bgColor = "#e0ecff";

            if (progress >= 100) {
                status = "Completed";
                statusColor = "#166534"; // Green
                bgColor = "#dcfce7";
            }

            const card = `
            <div class="card" style="margin-bottom:20px; padding:25px; border-left: 5px solid ${statusColor}; box-shadow: 0 4px 6px rgba(0,0,0,0.05); background: white; border-radius: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                    <h3 style="margin:0; font-size:1.2em; color: #1e293b;">${e.intern_name}</h3>
                    <span class="tag" style="background:${bgColor}; color:${statusColor}; padding: 5px 10px; border-radius: 20px; font-size: 0.85em; font-weight: 600;">${status}</span>
                </div>
                
                <div class="progress-bar" style="height:10px; background:#e2e8f0; border-radius:5px; overflow:hidden; margin-bottom:10px">
                    <div class="fill" style="width:${progress}%; background: ${statusColor}; height:100%; transition: width 0.5s ease;"></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px; font-size:0.9em; color:#64748b">
                    <div style="display:flex; justify-content:space-between">
                        <span><b>${progress}%</b> Overall Progress</span>
                    </div>
                    <div style="display:flex; justify-content:space-between">
                        <span>Tasks: ${completed} / ${total}</span>
                        <span>Duration: ${e.duration}</span>
                    </div>
                </div>
                
                   <div style="display:flex; gap: 15px; font-size:0.85em; color: #475569;">
                        <span><i class="fa-regular fa-calendar"></i> Enrolled: ${new Date(e.enrolled_at).toLocaleDateString()}</span>
                   </div>
                </div>
            </div>
            `;
            container.innerHTML += card;
        });

    } catch (e) {
        console.error("Error loading progress page", e);
        container.innerHTML = '<p style="color:red">Failed to load progress details.</p>';
    }
}

async function downloadCertificate(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generating... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + '/intern/certificate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        if (res.ok) {
            const fullUrl = API_BASE + data.url;
            window.open(fullUrl, '_blank');
            btn.innerHTML = 'Downloaded <i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 3000);
        } else {
            alert(data.error || "Failed to generate.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Error requesting certificate.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

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
                        <!-- <button onclick="enrollInInternship(${internship.id})">Enroll</button> -->
                        <span class="tag">Available</span>
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
        const response = await fetch(API_BASE + '/intern/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.status === 401) {
            alert("Session expired. Please login again.");
            logoutUser();
            return;
        }

        if (!response.ok) {
            console.error("Failed to fetch dashboard stats");
            return;
        }

        const stats = await response.json();

        // We also need the actual tasks list for the "Today's Focus" grid
        const tasksResponse = await fetch(API_BASE + '/tasks', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const tasks = tasksResponse.ok ? await tasksResponse.json() : [];

        // Update cards
        document.querySelector('.card:nth-child(1) h2').textContent = stats.tasks_completed;
        document.querySelector('.card:nth-child(2) h2').textContent = stats.tasks_pending;
        document.querySelector('.card:nth-child(3) h2').textContent = `${stats.overall_progress}%`;
        document.querySelector('.card:nth-child(4) h2').textContent = stats.internships_enrolled; // Now specific card

        // Update secondary cards
        document.querySelector('.cards:nth-of-type(2) .card:nth-child(1) h2').textContent =
            stats.overall_progress >= 100 ? "Completed" : `${stats.tasks_done_today} Tasks Done`;
        document.querySelector('.cards:nth-of-type(2) .card:nth-child(3) h2').textContent = `${stats.current_streak} Days`;

        // Update Weekly Goal (Progress Bar) - 2nd card in 2nd row
        const weeklyGoalCard = document.querySelector('.cards:nth-of-type(2) .card:nth-child(2)');
        if (weeklyGoalCard) {
            weeklyGoalCard.querySelector('h2').textContent = `${stats.overall_progress}%`;
            weeklyGoalCard.querySelector('.progress-fill').style.width = `${stats.overall_progress}%`;
        }

        // Update Mentor Card
        const mentorNameEl = document.getElementById("mentor-name");
        const mentorEmailEl = document.getElementById("mentor-email");
        if (mentorNameEl) {
            mentorNameEl.textContent = stats.mentor_name || "Assigned Soon";
        }
        if (mentorEmailEl) {
            // Since we don't have email in DB yet, show generic text or hide
            mentorEmailEl.textContent = "support@analogica.com";
        }

        // Update charts
        updateCharts(stats);

        // Update Dashboard Certificate Section
        checkCertificateEligibilityForDashboard(stats);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

function checkCertificateEligibilityForDashboard(stats) {
    const certSection = document.getElementById('dashboard-certificate-section');
    const certBtn = document.getElementById('dashboard-download-cert-btn');
    const certMsg = document.getElementById('dashboard-cert-message');

    if (certSection && certBtn) {
        certSection.style.display = 'block';
        if (stats.tasks_pending === 0 && stats.tasks_completed > 0) {
            certBtn.disabled = false;
            certBtn.style.background = '#4f46e5';
            certBtn.style.cursor = 'pointer';
            certBtn.innerHTML = 'Download Certificate <i class="fa-solid fa-certificate"></i>';
            certBtn.onclick = generateCertificate;
            certMsg.innerText = "Congratulations! You have completed your internship program.";
            certMsg.style.color = "#166534";
            certMsg.style.fontWeight = "bold";
        } else {
            certBtn.disabled = true;
            certBtn.style.background = '#94a3b8';
            certBtn.innerHTML = 'Certificate Locked 🔒';
            certMsg.innerText = `Complete all tasks to unlock. (${stats.tasks_pending} remaining)`;
            certMsg.style.color = "#64748b";
        }
    }
}

async function generateCertificateForDashboard(btn, msgDiv) {
    btn.innerHTML = 'Generating... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + '/intern/certificate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        if (res.ok) {
            msgDiv.innerHTML = `<a href="${API_BASE.replace('/api', '') + data.url}" target="_blank" class="btn-primary" style="background: #22c55e; color:white; padding: 10px 20px; display: inline-block; margin-top: 10px; text-decoration: none; border-radius: 8px;">Download PDF <i class="fa-solid fa-download"></i></a>`;
            btn.innerHTML = "Certificate Ready ✅";
            btn.style.display = 'none';
        } else {
            msgDiv.innerText = data.error || "Failed to generate.";
            btn.innerHTML = "Retry Generation";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        msgDiv.innerText = "Error generating certificate.";
        btn.innerText = "Download Certificate";
        btn.disabled = false;
    }
}

function updateCharts(stats) {
    // Update Doughnut Chart (Progress)
    const dash3Canvas = document.getElementById('dash3');
    if (dash3Canvas) {
        // Destroy existing chart if stored (add logic to store chart instance if needed, or just redraw)
        // For simplicity, we are redrawing. Ideally, track chart instances to destroy them.
        const chartStatus = Chart.getChart("dash3"); // Chart.js 3+
        if (chartStatus) chartStatus.destroy();

        new Chart(dash3Canvas, {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [stats.overall_progress, 100 - stats.overall_progress],
                    backgroundColor: ["#22c55e", "#e5e7eb"],
                    cutout: "70%"
                }]
            },
            options: { plugins: { legend: { display: false } } }
        });
    }
}

// Load tasks with Weekly Logic
async function loadTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = 'Loading...';

    try {
        const response = await fetch(API_BASE + '/tasks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const tasks = response.ok ? await response.json() : [];

        container.innerHTML = '';

        if (tasks.length === 0) {
            container.innerHTML = '<p>No tasks assigned yet.</p>';
            return;
        }

        tasks.forEach((task, index) => {
            const weekNum = task.week_number || (index + 1);
            const isUnlocked = task.is_unlocked;
            const isSubmitted = task.status === 'Completed';

            const isRejected = task.status === 'Rejected';

            const statusColor = isSubmitted ? '#22c55e' : (isRejected ? '#ef4444' : (isUnlocked ? '#4f46e5' : '#94a3b8'));
            const opacity = isUnlocked ? 1 : 0.7;

            let actionBtn = '';

            if (isRejected) {
                actionBtn = `<button onclick="openSubmissionModal(${task.id})" class="btn-primary" style="background: #ef4444; padding: 8px 16px; font-size: 0.9em; border-radius: 8px;">Re-Submit Task</button>`;
            } else if (isUnlocked && !isSubmitted) {
                actionBtn = `<button onclick="openSubmissionModal(${task.id})" class="btn-primary" style="padding: 8px 16px; font-size: 0.9em; border-radius: 8px;">Mark Complete</button>`;
            } else {
                if (task.grade) {
                    actionBtn = `<span class="tag" style="background: #dcfce7; color: #166534; font-size: 0.9em;">Graded: ${task.grade} <i class="fa-solid fa-star"></i></span>`;
                } else if (isSubmitted) {
                    actionBtn = `<span class="tag" style="background: #dcfce7; color: #166534; font-size: 0.9em;">Completed <i class="fa-solid fa-check"></i></span>`;
                } else {
                    // Check Deadline
                    let isDeadlinePassed = false;
                    if (task.due_date) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const due = new Date(task.due_date);
                        // If due date is strictly before today (yesterday or earlier), it's passed.
                        // Assuming due date is "end of day", then if today > due, it's passed.
                        // Actually JS Date parsed from YYYY-MM-DD is UTC 00:00.
                        // Better safe logic: if today > due date (string comparison might be easier if format matches, otherwise Date obj)
                        // Let's use simple string comparison if format is YYYY-MM-DD
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (todayStr > task.due_date) isDeadlinePassed = true;
                    }

                    if (isDeadlinePassed) {
                        actionBtn = `<span class="tag" style="background: #fee2e2; color: #b91c1c; font-size: 0.9em;"><i class="fa-solid fa-ban"></i> Deadline Missed</span>`;
                    } else {
                        actionBtn = `<span class="tag" style="background: #f1f5f9; color: #64748b; font-size: 0.9em;"><i class="fa-solid fa-lock"></i> Locked</span>`;
                    }
                }
            }

            const taskCard = `
                <div class="card" style="border-left: 5px solid ${statusColor}; opacity: ${opacity}; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span class="tag" style="background: ${statusColor}; color: white; font-weight: bold;">Week ${weekNum}</span>
                             <h3 style="margin: 0; font-size: 1.1em; color: #1e293b;">${task.title}</h3>
                        </div>
                        <p style="font-size: 0.95em; color: #64748b; margin: 0 0 5px 0;">${task.description || 'Complete the assigned work for this week.'}</p>
                         ${task.due_date ? `<small style="color: #94a3b8; font-weight: 500;"><i class="fa-regular fa-calendar"></i> Due: ${task.due_date}</small>` : ''}
                    </div>
                    ${task.feedback ? `<div style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;"><strong style="color: #334155;">Feedback:</strong> <span style="color: #475569;">${task.feedback}</span></div>` : ''}
                    <div style="margin-left: 20px; white-space: nowrap;">
                        ${actionBtn}
                    </div>
                </div>
            `;
            container.innerHTML += taskCard;
        });

    } catch (error) {
        console.error('Error loading tasks:', error);
        document.getElementById('tasks-container').innerHTML = '<p>Failed to load tasks.</p>';
    }
}

// Global variable for current submitting task
let currentTaskId = null;

function openSubmissionModal(taskId) {
    currentTaskId = taskId;
    document.getElementById('submission-modal').style.display = 'flex';
}

function closeSubmissionModal() {
    currentTaskId = null;
    document.getElementById('submission-modal').style.display = 'none';
    document.getElementById('submission-file').value = ''; // Reset input
}

async function submitTaskFile() {
    if (!currentTaskId) return;
    const fileInput = document.getElementById('submission-file');

    if (!fileInput.files[0]) {
        alert("Please select a file to upload.");
        return;
    }

    const file = fileInput.files[0];
    const allowedExtensions = ['pdf', 'zip', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt) || fileExt === 'png') {
        alert("Invalid file type. Only PDF, ZIP, and Documents are allowed. PNGs are not allowed.");
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch(API_BASE + `/intern/task/${currentTaskId}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, // No Content-Type for FormData!
            body: formData
        });

        if (res.ok) {
            alert("Task Submitted Successfully!");
            closeSubmissionModal();
            loadTasks();
            loadProgressPage();
            loadDashboardData();
        } else {
            const err = await res.json();
            alert("Failed: " + (err.error || "Unknown error"));
        }
    } catch (e) { console.error(e); alert("Transmission error"); }
}

// Consolidated Generate Certificate Function
async function generateCertificate() {
    // Use Dashboard Elements
    const btn = document.getElementById("dashboard-download-cert-btn") || document.getElementById("download-cert-btn");
    const msg = document.getElementById("dashboard-cert-result") || document.getElementById("cert-result");

    if (!btn || !msg) {
        console.error("Certificate elements not found");
        return;
    }

    btn.innerHTML = 'Generating... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + '/intern/certificate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        if (res.ok) {
            // Student Style: Open directly
            const fullUrl = API_BASE + data.url;
            window.open(fullUrl, '_blank');

            btn.innerHTML = 'Download Certificate <i class="fa-solid fa-download"></i>';
            btn.disabled = false;
        } else {
            msg.innerText = data.error || "Failed to generate.";
            msg.style.color = "red";
            btn.innerHTML = "Retry Generation";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        msg.innerText = "Error requesting certificate.";
        btn.innerText = "Download Certificate";
        btn.disabled = false;
    }
}

function checkCertificateEligibility(stats) {
    const certSection = document.getElementById('certificate-section');
    const certBtn = document.getElementById('download-cert-btn');
    const certMsg = document.getElementById('cert-message');

    if (certSection) {
        certSection.style.display = 'block';
        if (stats.tasks_pending === 0 && stats.tasks_completed > 0) {
            certBtn.disabled = false;
            certBtn.style.background = '#4f46e5';
            certBtn.style.cursor = 'pointer';
            certBtn.innerHTML = 'Download Certificate <i class="fa-solid fa-certificate"></i>';
            certBtn.onclick = generateCertificate;
            certMsg.innerText = "Congratulations! You have completed your internship program.";
            certMsg.style.color = "#166534";
            certMsg.style.fontWeight = "bold";
        } else {
            certBtn.disabled = true;
            certBtn.style.background = '#94a3b8';
            certBtn.innerHTML = 'Certificate Locked 🔒';
            certMsg.innerText = `Complete all tasks to unlock. (${stats.tasks_pending} remaining)`;
            certMsg.style.color = "#64748b";
        }
    }
}