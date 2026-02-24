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
        const currentToken = localStorage.getItem("token");
        // 1. Fetch Global Stats
        const statsRes = await fetch(API_BASE + '/intern/stats', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (statsRes.status === 401) {
            handleUnauthorized();
            return;
        }

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
            // Use per-internship stats
            const progress = e.progress !== undefined ? e.progress : 0;
            const completed = e.tasks_completed !== undefined ? e.tasks_completed : 0;
            const total = e.tasks_total !== undefined ? e.tasks_total : 4;
            const pending = total - completed;

            // Status Logic
            let status = "In Progress";
            let statusColor = "#4f46e5"; // Indigo
            let bgColor = "#e0ecff";

            if (progress >= 100) {
                status = "Completed";
                statusColor = "#2563EB"; // Blue
                bgColor = "#dbeafe";
            }

            const card = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all mb-6 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
                
                <div class="relative z-10 flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800 m-0">${e.intern_name}</h3>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-800">${status}</span>
                </div>
                
                <div class="relative z-10 w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div class="h-full rounded-full transition-all duration-500 bg-blue-500" style="width:${progress}%"></div>
                </div>
                
                <div class="relative z-10 flex flex-col gap-2 text-sm text-gray-500">
                    <div class="flex justify-between font-medium">
                        <span class="text-gray-900 font-bold">${progress}% Overall Progress</span>
                    </div>
                    <div class="flex justify-between text-xs uppercase tracking-wide">
                        <span>Tasks: ${completed} / ${total}</span>
                        <span>Duration: ${e.duration}</span>
                    </div>
                </div>
                
                
                   <div class="relative z-10 mt-4 pt-4 border-t border-gray-50 flex gap-4 text-xs text-gray-400 font-medium">
                        <span><i class="fa-regular fa-calendar mr-1"></i> Enrolled: ${new Date(e.enrolled_at).toLocaleDateString()}</span>
                   </div>
                   ${progress >= 100
                    ? `<div class="relative z-10 mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border border-green-200 shadow-sm"><i class="fa-solid fa-unlock"></i> Certificate Unlocked</div>`
                    : `<div class="relative z-10 mt-4 inline-flex items-center gap-2 bg-slate-100 text-slate-500 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border border-slate-200"><i class="fa-solid fa-lock"></i> Certificate Locked</div>`
                }
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (e) {
        console.error("Error loading progress page", e);
        container.innerHTML = '<p style="color:red">Failed to load progress details.</p>';
    }
}

async function downloadCertificateForInternship(internshipId, btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = 'Generating... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + '/intern/certificate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ internship_id: internshipId })
        });
        const data = await res.json();

        if (res.ok) {
            const fullUrl = API_BASE.replace('/api', '') + data.url;
            window.open(fullUrl, '_blank');
            btn.innerHTML = 'Downloaded <i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }, 3000);
        } else {
            alert(data.error || "Failed to generate.");
            btn.innerHTML = 'Retry <i class="fa-solid fa-rotate-right"></i>';
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Error requesting certificate.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
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
            const fullUrl = API_BASE.replace('/api', '') + data.url;
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
            const colors = [
                { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', icon: 'bg-indigo-100' },
                { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: 'bg-rose-100' },
                { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-emerald-100', icon: 'bg-blue-100' },
                { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'bg-amber-100' },
                { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100', icon: 'bg-sky-100' }
            ];

            enrollments.forEach((e, idx) => {
                const style = colors[idx % colors.length];
                const card = `
                    <div class="bg-white p-6 rounded-2xl shadow-sm border ${style.border} text-center hover:shadow-md transition-all group relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-1 ${style.bg.replace('50', '500')}"></div>
                        <div class="w-20 h-20 ${style.icon} rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold ${style.text} group-hover:scale-110 transition-transform shadow-inner">
                             ${e.mentor_name.charAt(0)}
                        </div>
                        <h3 class="font-bold text-gray-800 text-lg mb-1">${e.mentor_name}</h3>
                        <p class="text-sm text-gray-500 mb-4 flex items-center justify-center gap-2"><i class="fa-solid fa-graduation-cap ${style.text}"></i> ${e.intern_name} Mentor</p>
                        
                        <div class="${style.bg} rounded-xl p-3 text-xs ${style.text} font-medium border ${style.border}">
                             <p><i class="fa-regular fa-clock mr-1"></i> <strong>Duration:</strong> ${e.duration}</p>
                        </div>
                    </div>
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
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all border-l-4 border-indigo-500">
                        <h3 class="font-bold text-gray-800 text-lg mb-2">${internship.intern_name}</h3>
                        <div class="text-sm text-gray-500 space-y-1 mb-4">
                            <p><i class="fa-solid fa-user-tie w-5 text-indigo-400"></i> Mentor: <span class="font-medium text-gray-700">${internship.mentor_name}</span></p>
                            <p><i class="fa-regular fa-clock w-5 text-indigo-400"></i> Duration: ${internship.duration}</p>
                            <p><i class="fa-regular fa-calendar-check w-5 text-indigo-400"></i> Enrolled: ${new Date(internship.enrolled_at).toLocaleDateString()}</p>
                        </div>
                        <button disabled class="w-full py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-xs uppercase tracking-wide">Currently Enrolled</button>
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
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                        <div class="flex justify-between items-start mb-4">
                             <h3 class="font-bold text-gray-800 text-lg">${internship.intern_name}</h3>
                             <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase">Available</span>
                        </div>
                        <div class="text-sm text-gray-500 space-y-1 mb-6">
                            <p><i class="fa-solid fa-user-tie w-5 text-gray-400"></i> Mentor: ${internship.mentor_name}</p>
                            <p><i class="fa-regular fa-clock w-5 text-gray-400"></i> Duration: ${internship.duration}</p>
                        </div>
                        <button onclick="enrollInInternship(${internship.id})" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase tracking-wide transition-colors shadow-lg shadow-blue-500/20">
                            Enroll Now <i class="fa-solid fa-arrow-right ml-1"></i>
                        </button>
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
        // Update cards with IDs
        if (document.getElementById('stats-completed')) document.getElementById('stats-completed').textContent = stats.tasks_completed;
        if (document.getElementById('stats-pending')) document.getElementById('stats-pending').textContent = stats.tasks_pending;
        if (document.getElementById('stats-progress')) document.getElementById('stats-progress').textContent = `${stats.overall_progress}%`;
        if (document.getElementById('internships-enrolled')) document.getElementById('internships-enrolled').textContent = stats.internships_enrolled;

        // Update secondary cards
        const todaySummary = document.getElementById('today-summary');
        if (todaySummary) todaySummary.textContent = stats.overall_progress >= 100 ? "Completed" : `${stats.tasks_done_today} Tasks Done`;

        if (document.getElementById('stats-streak')) document.getElementById('stats-streak').textContent = `${stats.current_streak} Days`;

        // Update Weekly Goal (Progress Bar)
        if (document.getElementById('weekly-goal-text')) document.getElementById('weekly-goal-text').textContent = `${stats.overall_progress}%`;
        const progFill = document.querySelector('.progress-fill');
        if (progFill) progFill.style.width = `${stats.overall_progress}%`;

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
        // updateCharts(stats); // Charts removed

        // Fetch Enrollments for Certificate Logic
        const enrollRes = await fetch(API_BASE + '/enrollments', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const enrollments = enrollRes.ok ? await enrollRes.json() : [];

        // Update Dashboard Certificate Section
        checkCertificateEligibilityForDashboard(enrollments);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

function checkCertificateEligibilityForDashboard(enrollments) {
    const certSection = document.getElementById('dashboard-certificate-section');
    const container = document.getElementById('certificateContainer');

    if (certSection && container) {
        // Filter completed internships
        // Completion logic: progress >= 100
        const completedInternships = enrollments.filter(e => {
            const progress = (e.progress !== undefined) ? e.progress : 0;
            return progress >= 100;
        });

        if (completedInternships.length > 0) {
            certSection.classList.remove('hidden');

            // Trigger Celebration if newly unlocked (simple check)
            if (!sessionStorage.getItem("celebrationShown")) {
                triggerCelebration();
            }

            container.innerHTML = `
                <div class="inline-flex items-center justify-center h-16 w-16 bg-blue-100 text-blue-600 rounded-full mb-4 text-2xl">
                    <i class="fa-solid fa-certificate"></i>
                </div>
                <h3 class="text-xl font-bold text-[#172554] mb-2">Internship Certifications</h3>
                <p class="text-slate-500 text-sm mb-6 max-w-md mx-auto">You have earned the following certificates:</p>
                <div class="space-y-3">
            `;

            completedInternships.forEach(internship => {
                container.innerHTML += `
                    <button onclick="downloadCertificateForInternship(${internship.id}, this)" class="w-full text-left p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex justify-between items-center group">
                        <div>
                            <h4 class="font-bold text-emerald-800 text-sm">${internship.intern_name}</h4>
                            <span class="text-xs text-emerald-600">Generate & Download Certificate</span>
                        </div>
                        <i class="fa-solid fa-download text-emerald-500 group-hover:text-emerald-700 text-lg"></i>
                    </button>
                 `;
            });

            container.innerHTML += `</div>`;

        } else {
            // Show locked state if enrolled but not completed
            if (enrollments.length > 0) {
                certSection.classList.remove('hidden');
                container.innerHTML = `
                    <div class="inline-flex items-center justify-center h-16 w-16 bg-slate-100 text-slate-400 rounded-full mb-4 text-2xl">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-600 mb-2">Certificates Locked</h3>
                    <p class="text-slate-500 text-sm mb-4 max-w-md mx-auto">Complete all tasks in an internship to unlock its certificate.</p>
                 `;
            } else {
                certSection.classList.add('hidden');
            }
        }
    }
}

// 🎉 Celebration Logic
function triggerCelebration() {
    console.log("CELEBRATION TRIGGERED!");
    const container = document.createElement("div");
    container.className = "celebration-container";
    document.body.appendChild(container);

    const colors = ["#FFD700", "#FFC107", "#FFEB3B", "#FFA000", "#FF5722", "#4CAF50", "#2196F3"];

    for (let i = 0; i < 60; i++) {
        const star = document.createElement("div");
        star.className = "star";
        star.style.left = Math.random() * 100 + "vw";
        star.style.animationDuration = Math.random() * 2 + 3 + "s";
        star.style.animationDelay = Math.random() * 2 + "s";
        star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const size = Math.random() * 10 + 5 + "px";
        star.style.width = size;
        star.style.height = size;

        // Inline styles for basic star shape/anim since we might not have CSS
        star.style.position = 'absolute';
        star.style.top = '-10px';
        star.style.borderRadius = '50%';
        star.style.opacity = '0';
        star.style.animationName = 'fall';
        star.style.animationTimingFunction = 'linear';

        container.appendChild(star);
    }

    sessionStorage.setItem("celebrationShown", "true");

    setTimeout(() => {
        container.remove();
    }, 6000);
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

// Charts removed for cleaner UI
// function updateCharts(stats) { ... }

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

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const tasks = response.ok ? await response.json() : [];

        container.innerHTML = '';

        if (tasks.length === 0) {
            container.innerHTML = '<p>No tasks assigned yet.</p>';
            return;
        }

        // Group tasks by internship
        const grouped = {};
        tasks.forEach(t => {
            const key = t.internship_name || "General Tasks";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        Object.keys(grouped).forEach(groupName => {
            // Add Section Header
            container.innerHTML += `<div class="mb-4 text-xl font-bold border-b border-gray-200 pb-2 text-blue-800 mt-8 first:mt-0 flex items-center gap-2">
                <i class="fa-solid fa-briefcase"></i> ${groupName}
            </div>`;

            const groupTasks = grouped[groupName];
            groupTasks.forEach((task, index) => {
                const weekNum = task.week_number || (index + 1);
                const isUnlocked = task.is_unlocked;
                const isSubmitted = task.status === 'Completed';

                const isRejected = task.status === 'Rejected';

                const statusColor = isSubmitted ? '#22c55e' : (isRejected ? '#ef4444' : (isUnlocked ? '#4f46e5' : '#94a3b8'));
                const opacity = isUnlocked ? 1 : 0.7;

                let actionBtn = '';

                if (isRejected) {
                    actionBtn = `<button onclick="openSubmissionModal(${task.id})" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-sm transition-colors shadow-sm">Re-Submit Task</button>`;
                } else if (isUnlocked && !isSubmitted) {
                    actionBtn = `<button onclick="openSubmissionModal(${task.id})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-indigo-500/20">Mark Complete</button>`;
                } else {
                    if (task.grade) {
                        actionBtn = `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">Graded: ${task.grade} <i class="fa-solid fa-star text-yellow-500"></i></span>`;
                    } else if (isSubmitted) {
                        actionBtn = `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">Completed <i class="fa-solid fa-check"></i></span>`;
                    } else {

                        // Check Deadline
                        let isDeadlinePassed = false;
                        if (task.due_date) {
                            const todayStr = new Date().toISOString().split('T')[0];
                            if (todayStr > task.due_date) isDeadlinePassed = true;
                        }

                        if (isDeadlinePassed) {
                            // ALLOW LATE SUBMISSION
                            actionBtn = `<button onclick="openSubmissionModal(${task.id})" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-colors">Submit Late <i class="fa-solid fa-clock"></i></button>`;
                        } else {
                            actionBtn = `<span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wide"><i class="fa-solid fa-lock"></i> Locked</span>`;
                        }
                    }
                }

                const taskCard = `
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center mb-6 hover:shadow-md transition-all gap-4 ${opacity < 1 ? 'opacity-70 grayscale' : ''}" style="border-left: 5px solid ${statusColor};">
                        <div class="flex-1 w-full">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide text-white" style="background: ${statusColor};">Task ${weekNum}</span>
                                <h3 class="m-0 text-lg font-bold text-gray-900">${task.title}</h3>
                            </div>
                            <p class="text-sm text-gray-500 mb-2">${task.description || 'Complete the assigned work for this week.'}</p>
                            ${task.due_date ? `<small class="text-gray-400 font-medium text-xs"><i class="fa-regular fa-calendar mr-1"></i> Due: ${task.due_date}</small>` : ''}
                            
                            ${task.feedback ? `<div class="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 text-sm"><strong class="text-blue-800">Feedback:</strong> <span class="text-blue-600">${task.feedback}</span></div>` : ''}
                        </div>
                        
                        <div class="whitespace-nowrap w-full md:w-auto flex justify-end">
                            ${actionBtn}
                        </div>
                    </div>
                `;
                container.innerHTML += taskCard;
            });
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
        const currentToken = localStorage.getItem("token");
        const res = await fetch(API_BASE + `/intern/task/${currentTaskId}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }, // No Content-Type for FormData!
            body: formData
        });

        if (res.status === 401) {
            handleUnauthorized();
            return;
        }

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

function handleUnauthorized() {
    alert("Session expired. Please login again.");
    localStorage.clear();
    window.location.href = "index.html";
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
            const fullUrl = API_BASE.replace('/api', '') + data.url;
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
            certBtn.style.background = '#2563EB';
            certBtn.style.cursor = 'pointer';
            certBtn.innerHTML = 'Download Certificate <i class="fa-solid fa-certificate"></i>';
            certBtn.onclick = generateCertificate;
            certMsg.innerText = "Congratulations! You have completed your internship program.";
            certMsg.style.color = "#2563EB";
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