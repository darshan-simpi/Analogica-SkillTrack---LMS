const API = "http://127.0.0.1:5005/api";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "STUDENT") {
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Student Dashboard Initializing...");
  console.log("📍 API Base:", API);
  console.log("🔑 Token Present:", !!token);

  const nameEl = document.getElementById("studentName");
  const initEl = document.getElementById("studentInitial");
  const studentName = localStorage.getItem("name") || "Student";

  if (nameEl) nameEl.innerText = studentName;
  if (initEl) initEl.innerText = studentName.charAt(0).toUpperCase();

  loadCourses();
  loadProgress();
  loadAssignments();
  loadStudentQuizzes();
  loadMentors();
  setupTabs();
  setupLogout();
  setupAssignmentForm();
  setupTaskForm();

  // Safety: Ensure no modals are open by default
  const quizModal = document.getElementById("quizModal");
  if (quizModal) quizModal.classList.remove("show");
});

async function loadProgress() {
  try {
    const res = await fetch(`${API}/student/progress?v=${Date.now()}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) return logout();
    if (!res.ok) throw new Error("Progress load failed");

    const progressData = await res.json();
    console.log("📊 Received Progress Data:", progressData);

    // Calculate Average Completion
    if (progressData.length > 0) {
      const totalProgress = progressData.reduce((sum, p) => sum + p.progress, 0);
      let avg = Math.round(totalProgress / progressData.length);
      avg = Math.min(avg, 100); // UI Safety Cap

      const fill = document.getElementById("completionFill");
      const text = document.getElementById("completionText");

      if (fill) fill.style.width = avg + "%";
      if (text) text.innerText = avg + "% of total curriculum";
    }

    renderProgressPage(progressData);
  } catch (err) {
    console.error("Failed to load progress", err);
    const container = document.getElementById("progressContainer");
    if (container) container.innerHTML = `<p style="color:red">Failed to load progress: ${err.message}</p>`;
  }
}

function renderProgressPage(data) {
  const container = document.getElementById("progressContainer");
  if (!container) return;

  container.innerHTML = "";
  if (data.length === 0) {
    container.innerHTML = "<p>No enrolled courses found.</p>";
    return;
  }

  data.forEach(item => {
    console.log("🛠️ Rendering Course Progress Item:", item);
    const progressColor = item.progress >= 100 ? 'bg-blue-500' : 'bg-indigo-600';
    const tagClass = item.progress >= 100 ? 'bg-blue-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800';
    const borderClass = item.progress >= 100 ? 'border-emerald-500' : 'border-indigo-600';

    // Certificate Status per course (Bagde Only)
    let certHtml = "";
    if (item.can_generate_certificate) {
      certHtml = `
            <div class="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold border border-green-200 shadow-sm">
                <i class="fa-solid fa-unlock"></i> Certificate Unlocked
            </div>
         `;
    } else {
      certHtml = `
            <div class="mt-3 inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-bold border border-gray-200">
                <i class="fa-solid fa-lock"></i> Certificate Locked
            </div>
         `;
    }

    const color = item.progress >= 100 ? '#3b82f6' : '#4f46e5'; // Hex values for Tailwind blue-500 and indigo-600

    container.innerHTML += `
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-bold text-gray-800 text-lg">${item.course_name}</h4>
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">${item.duration} • ${item.status}</span>
                </div>
                <!-- Radial Progress -->
                 <div class="relative w-16 h-16">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#e2e8f0" stroke-width="6" fill="transparent"></circle>
                        <circle cx="32" cy="32" r="28" stroke="${color}" stroke-width="6" fill="transparent"
                            stroke-dasharray="176" stroke-dashoffset="${176 - (176 * item.progress) / 100}"
                            class="transition-all duration-1000 ease-out"></circle>
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                        ${item.progress}%
                    </span>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Assignments</span>
                    <span class="font-bold text-slate-700">${item.assignments_completed} / ${item.total_assignments}</span>
                </div>
                 <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: ${(item.assignments_completed / item.total_assignments) * 100}%"></div>
                </div>

                <div class="flex justify-between text-sm pt-2">
                    <span class="text-slate-500">Quizzes</span>
                    <span class="font-bold text-slate-700">${item.quizzes_completed} / ${item.total_quizzes}</span>
                </div>
                 <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-purple-500 h-full rounded-full transition-all duration-500" style="width: ${(item.quizzes_completed / (item.total_quizzes || 1)) * 100}%"></div>
                </div>

                <div class="flex justify-between text-sm pt-2">
                    <span class="text-slate-500">Additional Tasks</span>
                    <span class="font-bold text-slate-700">${item.tasks_completed || 0} / ${item.total_tasks || 0}</span>
                </div>
                 <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${(item.tasks_completed / (item.total_tasks || 1)) * 100}%"></div>
                </div>
                
                ${certHtml}
            </div>
        </div>
        `;
  });
}

function renderWeeklyBreakdown(dashboardData) {
  const container = document.getElementById("weeklyBreakdown");
  if (!container) return;

  container.innerHTML = "";

  if (dashboardData.length === 0) {
    container.innerHTML = "<p>No progress data available yet.</p>";
    return;
  }

  dashboardData.forEach(c => {
    const assignments = c.assignments || [];
    const sorted = [...assignments].sort((a, b) => a.week_number - b.week_number);

    // Create a list layout for weeks (Long Rectangles)
    let weeksGrid = `<div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">`;

    sorted.forEach(a => {
      const safeTitle = (a.title || "Untitled").replace(/'/g, "\\'");
      const isUnlocked = a.is_unlocked;
      const isSubmitted = a.is_submitted;

      let statusColor = "#94a3b8"; // Gray (Locked)
      let statusIcon = '<i class="fa-solid fa-lock"></i>';

      if (isSubmitted) {
        statusColor = "#22c55e"; // Green
        statusIcon = '<i class="fa-solid fa-check-circle"></i>';
      } else if (isUnlocked) {
        statusColor = "#4f46e5"; // Blue
        statusIcon = '<i class="fa-solid fa-unlock"></i>';
      }


      // Check Deadline
      let isDeadlinePassed = false;
      if (a.due_date) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr > a.due_date) isDeadlinePassed = true;
      }

      // Action Button
      let actionBtn = "";

      // Allow submission if unlocked AND not submitted (even if deadline passed)
      if (isUnlocked && !isSubmitted) {
        let btnText = "Submit Task";
        let btnStyle = "padding:8px 20px; font-size:0.85em";

        if (isDeadlinePassed) {
          btnText = "Submit Late";
          btnStyle += "; background:#f59e0b; border: 1px solid #d97706"; // Amber warning color
        }

        actionBtn = `<button onclick="openSubmitModal(${a.id}, '${safeTitle}')" class="btn-primary" style="${btnStyle}">${btnText}</button>`;
      } else if (isSubmitted) {
        const feedback = a.feedback ? a.feedback.replace(/'/g, "\\'") : "Wait for trainer feedback...";
        actionBtn = `<button onclick="openViewModal('${safeTitle}', '${feedback}')" style="padding:8px 20px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer">View Status</button>`;
      } else {
        actionBtn = `<button disabled style="padding:8px 20px; background:#f1f5f9; color:#94a3b8; border:none; cursor:not-allowed">Locked</button>`;
      }

      weeksGrid += `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all sm:flex-row flex-col gap-4" style="border-left: 5px solid ${statusColor};">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-[${statusColor}]" style="color:${statusColor}">Assignment ${a.week_number}</span>
                    <span class="text-[${statusColor}]" style="color:${statusColor}">${statusIcon}</span>
                </div>
                <h4 class="font-bold text-gray-800 text-lg m-0">${a.title}</h4>
                <p class="text-sm text-gray-500 mt-1">${isUnlocked ? (a.due_date ? 'Due: ' + a.due_date : 'No Deadline') : 'Complete previous week'}</p>
            </div>
            <div class="ml-0 sm:ml-4">
                ${actionBtn}
            </div>
        </div>
      `;
    });

    weeksGrid += `</div>`;

    container.innerHTML += `
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div class="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <h3 class="font-bold text-gray-800 text-xl m-0">${c.course}</h3>
            <div class="text-right">
                <span class="block text-2xl font-extrabold text-indigo-600">${c.progress}%</span>
                <span class="text-xs text-gray-400 font-medium uppercase tracking-wide">Overall Progress</span>
            </div>
        </div>
        ${weeksGrid}
      </div>
    `;
  });
}

async function loadMentors() {
  try {
    const res = await fetch(`${API}/mentors`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) return logout();
    if (!res.ok) throw new Error("Mentor load failed");

    const mentors = await res.json();

    renderMentors(mentors);
  } catch (err) {
    console.error("Failed to load mentors", err);
    document.getElementById("mentorList").innerHTML = "<p>Failed to load mentors.</p>";
  }
}

function renderMentors(mentors) {
  const container = document.getElementById("mentorList");
  if (!container) return;

  container.innerHTML = "";

  if (mentors.length === 0) {
    container.innerHTML = "<p>No mentors available.</p>";
    return;
  }

  mentors.forEach(m => {
    const name = m.name || "Unknown Mentor";
    const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    container.innerHTML += `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-center group">
                <div class="absolute top-4 right-4 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Trainer</div>
                <div class="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform">${initials}</div>
                <h3 class="text-lg font-bold text-gray-800 m-0">${name}</h3>
                <p class="text-sm text-gray-500 mt-1"><strong>Expertise:</strong> ${m.expertise || 'Mentor'}</p>
                <p class="text-indigo-600 text-sm mt-2 font-medium bg-indigo-50 inline-block px-3 py-1 rounded-lg"><i class="fa-solid fa-envelope mr-1"></i> ${m.email || 'N/A'}</p>
                <div class="flex justify-center gap-4 mt-4 text-gray-400 text-xl">
                     <i class="fa-brands fa-linkedin hover:text-indigo-600 cursor-pointer transition-colors"></i>
                </div>
            </div>
      `;
  });
}


async function loadCourses() {
  try {
    const res = await fetch(`${API}/student/courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) return logout();
    if (!res.ok) throw new Error(`API Error: ${res.status} `);

    const courses = await res.json();

    if (!Array.isArray(courses)) throw new Error("Invalid response format");

    const countEl = document.getElementById("courseCount");
    if (countEl) countEl.innerText = courses.length;

    renderCourses(courses);
  } catch (err) {
    console.error("Error loading courses:", err);
    document.getElementById("courseList").innerHTML = `<p style="color:red">Failed to load courses. Please try again.</p>`;
  }
}

async function loadAssignments() {
  try {
    const res = await fetch(`${API}/student/dashboard?v=${Date.now()}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) return logout();
    if (!res.ok) throw new Error(`Server returned ${res.status} `);

    const rawData = await res.json();

    // ✅ Handle New API Format (Dict with courses, study_streak, overall_grade)
    const dashboardData = Array.isArray(rawData) ? rawData : (rawData.courses || []);

    // Update Streak & Grade UI
    if (rawData.study_streak !== undefined) {
      const streakEl = document.getElementById("studyStreak");
      if (streakEl) streakEl.innerText = rawData.study_streak + " Days";
    }

    if (rawData.overall_grade) {
      const gradeEl = document.getElementById("overallGrade");
      if (gradeEl) gradeEl.innerText = rawData.overall_grade;
    }

    let totalPending = 0;
    const processedIds = new Set(); // To avoid double counting same entities across loops

    if (dashboardData.length > 0) {
      dashboardData.forEach(c => {
        // Use the summary numbers from the API which are more reliable than counting items in JS
        const pAsgns = (c.total_assignments || 0) - (c.assignments_completed || 0);
        const pQuizzes = (c.pending_quizzes_count || 0);
        const pTasks = (c.total_tasks || 0) - (c.tasks_completed || 0);

        totalPending += Math.max(0, pAsgns) + Math.max(0, pQuizzes) + Math.max(0, pTasks);
      });
    }
    const pendingEl = document.getElementById("pendingCount");
    if (pendingEl) pendingEl.innerText = totalPending;

    if (dashboardData.length === 0) {
      document.getElementById("assignmentList").innerHTML = "<p>You are not enrolled in any courses with assignments.</p>";
      return;
    }

    // Pass entire dashboardData (list of courses) to renderAssignments
    renderAssignments(dashboardData);

    // Certificate logic - Handle MULTIPLE certificates
    console.log("🎓 Checking Certificate Eligibility...");
    const certContainer = document.getElementById("certificateContainer");

    if (certContainer) {
      // Find all completed courses with certificates
      const completedCourses = dashboardData.filter(c => c.can_generate_certificate);

      certContainer.innerHTML = `
            <div class="inline-flex items-center justify-center h-16 w-16 bg-blue-100 text-blue-600 rounded-full mb-4 text-2xl">
                <i class="fa-solid fa-certificate"></i>
            </div>
            <h3 class="text-xl font-bold text-[#172554] mb-2">Completion Certificates</h3>
        `;

      if (completedCourses.length > 0) {
        console.log("✅ Found completed courses:", completedCourses.length);

        // 🎉 Trigger Celebration if not already shown this session
        console.log("🚀 Attempting to trigger celebration...");
        triggerCelebration();

        certContainer.innerHTML += `<p class="text-slate-500 text-sm mb-4">You have earned the following certificates:</p>`;

        completedCourses.forEach(c => {
          let btnHtml = "";
          if (c.certificate_url) {
            const downloadUrl = `${API.replace('/api', '')}${c.certificate_url}`;
            btnHtml = `
                        <a href="${downloadUrl}" target="_blank" class="block w-full text-left p-3 mb-2 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex justify-between items-center group">
                            <div>
                                <h4 class="font-bold text-blue-800 text-sm">${c.course}</h4>
                                <span class="text-xs text-blue-600">View Certificate</span>
                            </div>
                            <i class="fa-solid fa-external-link text-blue-400 group-hover:text-blue-600"></i>
                        </a>
                     `;
          } else {
            btnHtml = `
                        <button onclick="generateCertificate(${c.course_id})" class="block w-full text-left p-3 mb-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex justify-between items-center group">
                             <div>
                                <h4 class="font-bold text-emerald-800 text-sm">${c.course}</h4>
                                <span class="text-xs text-emerald-600">Generate & Download</span>
                            </div>
                            <i class="fa-solid fa-download text-emerald-400 group-hover:text-emerald-600"></i>
                        </button>
                     `;
          }
          certContainer.innerHTML += btnHtml;
        });

        // Add a dedicated result div for generation messages if needed
        certContainer.innerHTML += `<div id="certResult" class="mt-4 text-sm font-medium"></div>`;

      } else {
        certContainer.innerHTML += `
                <p class="text-slate-500 text-sm mb-6 max-w-lg mx-auto">Complete all assignments and quizzes for a course to unlock its certificate.</p>
                <div class="inline-flex items-center gap-2 text-slate-400 font-medium text-sm bg-slate-100 px-4 py-2 rounded-lg">
                    <i class="fa-solid fa-lock"></i> No Certificates Yet
                </div>
            `;
      }
    }

  } catch (err) {
    console.error("Failed to load assignments", err);
    document.getElementById("assignmentList").innerHTML = `<p style="color:red">Failed to load assignments: ${err.message}</p>`;
  }
}

// 🎉 Celebration Logic
function triggerCelebration() {
  console.log("CELEBRATION TRIGGERED!");
  // Check removed for debugging 

  // Create container
  const container = document.createElement("div");
  container.className = "celebration-container";
  document.body.appendChild(container);

  // Spawn stars
  const colors = ["#FFD700", "#FFC107", "#FFEB3B", "#FFA000", "#FF5722", "#4CAF50", "#2196F3"];

  for (let i = 0; i < 60; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = Math.random() * 100 + "vw";
    // Randomize delay and duration for natural feel
    star.style.animationDuration = Math.random() * 2 + 3 + "s"; // 3-5s
    star.style.animationDelay = Math.random() * 2 + "s";
    star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

    // Random size
    const size = Math.random() * 10 + 5 + "px";
    star.style.width = size;
    star.style.height = size;

    container.appendChild(star);
  }

  sessionStorage.setItem("celebrationShown", "true");

  // Cleanup
  setTimeout(() => {
    container.remove();
  }, 6000);
}

async function generateCertificate(courseId) {
  const msg = document.getElementById("certResult");
  if (msg) msg.innerText = "⏳ Generating certificate...";

  try {
    const res = await fetch(`${API}/student/certificate/${courseId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();

    if (res.ok) {
      if (msg) msg.innerHTML = `<span class="text-green-600">Certificate Ready! Refreshing...</span>`;
      // Refresh to update the list with the new URL
      setTimeout(() => loadAssignments(), 1000);
    } else {
      if (msg) msg.innerText = "Error: " + (data.error || "Failed");
    }
  } catch (err) {
    console.error("Error", err);
    if (msg) msg.innerText = "Server error occurred.";
  }
}

function renderAssignments(courseList) {
  const listContainer = document.getElementById("assignmentList");
  if (!listContainer) return;

  try {
    listContainer.innerHTML = "";

    if (!Array.isArray(courseList) || courseList.length === 0) {
      listContainer.innerHTML = "<p>No enrolled courses.</p>";
      return;
    }

    // Iterate through courses to create groupings
    courseList.forEach(c => {


      // Create Section Header
      const section = document.createElement("div");
      section.className = "mb-8";
      section.innerHTML = `
            <div class="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                <div class="flex items-center gap-3">
                    <div class="h-8 w-1 bg-indigo-500 rounded-full"></div>
                    <h3 class="text-xl font-bold text-gray-800">${c.course} <span class="text-sm font-normal text-slate-500">(${c.duration})</span></h3>
                </div>

            </div>
        `;

      const tasksContainer = document.createElement("div");
      tasksContainer.className = "space-y-4";

      const asgns = c.assignments || [];
      const tasks = c.tasks || [];

      if (asgns.length === 0 && tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-slate-400 text-sm ml-4">No assignments or tasks for this course yet.</p>`;
      } else {
        // Render Assignments
        asgns.forEach((t, index) => {
          // Safety defaults
          const weekNum = t.week_number || (index + 1);
          const isDataRevealed = !!t.is_data_revealed;
          const isSubmittable = !!t.is_unlocked;
          const isSubmitted = !!t.is_submitted;

          const statusText = isSubmitted ? "Submitted" : (isSubmittable ? "Unlocked" : "Locked 🔒");
          const statusColor = isSubmitted ? "#22c55e" : (isSubmittable ? "#4f46e5" : "#666");

          let actionBtns = "";
          const safeTitle = (t.title || "Untitled Assignment").replace(/'/g, "\\'");

          if (isSubmittable && !isSubmitted) {
            actionBtns = `<button onclick="openSubmitModal(${t.id}, '${safeTitle}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm">Submit</button>`;
          } else if (isSubmitted) {
            const feedback = t.feedback ? t.feedback.replace(/'/g, "\\'") : "Wait for trainer feedback...";
            const btnText = t.grade ? "View Grade" : "View Status";
            actionBtns = `<button onclick="openViewModal('${safeTitle}', '${feedback}', '${t.grade || ''}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors border border-slate-200">${btnText}</button>`;
          } else if (isDataRevealed && !isSubmitted) {
            actionBtns = `<button disabled class="bg-slate-100 text-slate-400 font-semibold py-2 px-4 rounded-lg text-sm cursor-not-allowed border border-slate-200">Locked</button>`;
          }

          const displayTitle = isDataRevealed ? `: ${t.title}` : "";
          let displayDesc = isDataRevealed ? (t.due_date ? '📅 Due: ' + t.due_date : 'No Deadline') : '🔒 This assignment is locked until the previous one is submitted.';

          tasksContainer.innerHTML += `
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all ${(!isDataRevealed) ? 'opacity-50 grayscale' : ''}" style="border-left: 5px solid ${statusColor};">
                        <div class="flex-1 pr-4">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white" style="background:${statusColor}">${statusText}</span>
                                <h4 class="font-bold text-gray-800 text-lg m-0">Assignment ${weekNum}${displayTitle}</h4>
                            </div>
                            <p class="text-sm text-gray-500 font-medium">${displayDesc}</p>
                        </div>
                        <div>
                            ${actionBtns}
                        </div>
                    </div>
                `;
        });

        // Render Tasks
        tasks.forEach((t) => {
          const isSubmitted = !!t.is_submitted;
          const statusText = isSubmitted ? "Completed" : "Pending";
          const statusColor = isSubmitted ? "#22c55e" : "#f59e0b"; // Yellow for pending tasks

          let actionBtns = "";
          if (!isSubmitted) {
            actionBtns = `<button onclick="openSubmitTaskModal(${t.id}, '${t.title.replace(/'/g, "\\'")}')" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm">Submit Task</button>`;
          } else {
            const feedback = t.feedback ? t.feedback.replace(/'/g, "\\'") : "Wait for trainer feedback...";
            actionBtns = `<button onclick="openViewModal('${t.title.replace(/'/g, "\\'")}', '${feedback}', '${t.grade || ''}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors border border-slate-200">View Status</button>`;
          }

          tasksContainer.innerHTML += `
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all" style="border-left: 5px solid ${statusColor};">
                        <div class="flex-1 pr-4">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white" style="background:${statusColor}">${statusText}</span>
                                <h4 class="font-bold text-gray-800 text-lg m-0">Task: ${t.title}</h4>
                            </div>
                            <p class="text-sm text-gray-500 font-medium">${t.due_date ? '📅 Due: ' + t.due_date : 'No Deadline'}</p>
                        </div>
                        <div>
                            ${actionBtns}
                        </div>
                    </div>
                `;
        });
      }

      section.appendChild(tasksContainer);
      listContainer.appendChild(section);
    });

  } catch (err) {
    console.error("Critical Error in renderAssignments:", err);
    listContainer.innerHTML = `<p style="color:red">Error rendering assignments. Please check the console.</p>`;
  }
}

function openSubmitModal(id, title) {
  const modal = document.getElementById("submitModal");
  if (modal) {
    document.getElementById("submitAssignmentId").value = id;
    document.getElementById("modalAssignmentTitle").innerText = title;
    modal.classList.add("show");
  }
}

function closeSubmitModal() {
  const modal = document.getElementById("submitModal");
  if (modal) {
    modal.classList.remove("show");
    document.getElementById("submitMsg").style.display = "none";
    document.getElementById("assignmentForm").reset();
  }
}

function openViewModal(title, feedback, grade) {
  const modal = document.getElementById("viewModal");
  if (modal) {
    document.getElementById("viewAssignmentTitle").innerText = title;

    let content = "";
    if (grade) {
      content += `<div style="background:#dcfce7; color:#166534; padding:10px; border-radius:6px; margin-bottom:10px; font-weight:bold; text-align:center">🎉 Grade: ${grade}</div>`;
    }
    content += `<p><strong>Feedback:</strong> ${feedback}</p>`;

    document.getElementById("feedbackContent").innerHTML = content;
    modal.classList.add("show");
  }
}

function openSubmitTaskModal(id, title) {
  const modal = document.getElementById("submitTaskModal");
  if (modal) {
    document.getElementById("submitTaskId").value = id;
    document.getElementById("modalTaskTitle").innerText = title;
    modal.classList.add("show");
  }
}

function closeSubmitTaskModal() {
  const modal = document.getElementById("submitTaskModal");
  if (modal) {
    modal.classList.remove("show");
    document.getElementById("taskSubmitMsg").style.display = "none";
    document.getElementById("taskForm").reset();
  }
}

function closeViewModal() {
  const modal = document.getElementById("viewModal");
  if (modal) modal.classList.remove("show");
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ================= QUIZZES ================= */
async function loadStudentQuizzes() {
  try {
    const res = await fetch(`${API}/student/courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const courses = await res.json();

    const container = document.getElementById("quizList");
    container.innerHTML = "";

    if (courses.length === 0) {
      container.innerHTML = "<p>Enroll in a course to see quizzes.</p>";
      return;
    }

    for (const c of courses) {
      const qRes = await fetch(`${API}/student/course/${c.id}/quizzes`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const quizzes = await qRes.json();

      if (quizzes.length > 0) {
        let quizHtml = `
          <div class="box glow" style="margin-bottom:30px; padding:25px">
             <h3 style="margin-bottom:20px; color:#4f46e5">${c.name} Quizzes</h3>
             <div class="quiz-grid" style="display:flex; flex-direction:column; gap:15px">
        `;

        quizzes.forEach(q => {
          const isVisible = q.is_visible;
          const isSubmitted = q.is_submitted;
          const statusText = isSubmitted ? `Score: ${q.score}/${q.total}` : (isVisible ? "Available" : "Locked 🔒");
          const statusColor = isSubmitted ? "#22c55e" : (isVisible ? "#4f46e5" : "#94a3b8");

          quizHtml += `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-all ${isVisible ? '' : 'opacity-60'}" style="border-left: 5px solid ${statusColor};">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider block mb-1" style="color:${statusColor}">Quiz ${q.week_number}</span>
                <h4 class="font-bold text-gray-800 m-0 text-lg">${q.title}</h4>
                <small class="text-gray-500 font-medium mt-1 block">${isVisible ? (q.deadline ? 'Deadline: ' + q.deadline : 'No Deadline') : 'Available after previous week deadline'}</small>
              </div>
              <div>
                ${isVisible && !isSubmitted ? `<button onclick="takeQuiz(${q.id}, '${q.title.replace(/'/g, "\\'")}')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">Take Quiz</button>` : `<span class="font-bold text-[${statusColor}]" style="color:${statusColor}">${statusText}</span>`}
              </div>
            </div>
          `;
        });

        quizHtml += `</div></div>`;
        container.innerHTML += quizHtml;
      }
    }

    if (container.innerHTML === "") {
      container.innerHTML = "<p>No quizzes available for your courses yet.</p>";
    }
  } catch (err) {
    console.error("Failed to load quizzes", err);
  }
}

let activeQuizId = null;

async function takeQuiz(quizId, title) {
  activeQuizId = quizId;
  const res = await fetch(`${API}/student/quiz/${quizId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const quiz = await res.json();

  document.getElementById("quizModalTitle").innerText = title;
  const container = document.getElementById("quizQuestions");
  container.innerHTML = "";

  quiz.questions.forEach((q, idx) => {
    container.innerHTML += `
      <div class="quiz-question-box bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6" data-id="${q.id}">
        <p class="font-medium text-gray-800 mb-3 text-lg"><strong>Q${idx + 1}:</strong> ${q.text}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all select-none">
            <input type="radio" name="q${q.id}" value="A" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"> 
            <span class="text-gray-700">A) ${q.option_a}</span>
          </label>
          <label class="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all select-none">
            <input type="radio" name="q${q.id}" value="B" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"> 
            <span class="text-gray-700">B) ${q.option_b}</span>
          </label>
          <label class="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all select-none">
            <input type="radio" name="q${q.id}" value="C" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"> 
            <span class="text-gray-700">C) ${q.option_c}</span>
          </label>
          <label class="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all select-none">
            <input type="radio" name="q${q.id}" value="D" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"> 
            <span class="text-gray-700">D) ${q.option_d}</span>
          </label>
        </div>
      </div>
    `;
  });

  document.getElementById("quizModal").classList.add("show");
}

function closeQuizModal() {
  document.getElementById("quizModal").classList.remove("show");
}

async function submitQuizAnswers() {
  const container = document.getElementById("quizQuestions");
  const questions = container.querySelectorAll(".quiz-question-box");
  const answers = {};

  let allAnswered = true;
  questions.forEach(box => {
    const radio = box.querySelector('input[type="radio"]:checked');
    const qId = box.dataset.id;
    if (radio) {
      answers[qId] = radio.value;
    } else {
      allAnswered = false;
    }
  });

  if (!allAnswered) {
    alert("Please answer all questions before submitting.");
    return;
  }

  try {
    const res = await fetch(`${API}/student/quiz/${activeQuizId}/submit`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ answers })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`Quiz Submitted! Score: ${data.score}/${data.total}`);
      closeQuizModal();
      loadStudentQuizzes(); // Refresh list
      loadProgress(); // Update progress
      loadAssignments(); // Update pending count on dashboard
    } else {
      alert(data.error || "Submission failed");
    }
  } catch (err) {
    console.error("Quiz submission error", err);
  }
}

/* ================= ENROLLMENT ================= */
async function openEnrollModal() {
  const modal = document.getElementById("enrollModal");
  const select = document.getElementById("enrollCourseSelect");
  const msg = document.getElementById("enrollMsg");

  if (!modal) return;

  modal.classList.add("show");
  msg.style.display = "none";
  msg.className = "";
  select.innerHTML = '<option>Loading...</option>';

  try {
    // Fetch all available courses
    // We use the public endpoint or a student-specific one. 
    // The public one is /api/courses (GET) from login.js usage.
    // Let's check api base. login.js uses http://127.0.0.1:5005/api/courses
    // student.js API constant is http://localhost:5005/api

    const res = await fetch(`${API}/courses`);
    const courses = await res.json();

    // Filter out courses already enrolled
    // We need to know which ones are enrolled. 
    // We can get enrolled list from `loadCourses` which populates UI, but better to fetch or store it.
    // Let's refactor: loadCourses() stores enrolled IDs in a global set? 
    // Or just map what is in UI? 
    // Simpler: Fetch enrolled again or reuse cached data if we had it.

    // Quick fetch of enrolled to be safe
    const enrolledRes = await fetch(`${API}/student/courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const enrolledData = await enrolledRes.json();
    const enrolledIds = new Set(enrolledData.map(c => c.id));

    select.innerHTML = '<option value="">Select a Course</option>';

    let availableCount = 0;
    courses.forEach(c => {
      if (!enrolledIds.has(c.id)) {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.innerText = `${c.name} (${c.duration})`;
        select.appendChild(opt);
        availableCount++;
      }
    });

    if (availableCount === 0) {
      select.innerHTML = '<option value="">No new courses available</option>';
    }

  } catch (e) {
    console.error("Error loading courses for enrollment", e);
    select.innerHTML = '<option>Error loading courses</option>';
  }
}

function closeEnrollModal() {
  const modal = document.getElementById("enrollModal");
  if (modal) modal.classList.remove("show");
}

async function submitEnrollment() {
  const select = document.getElementById("enrollCourseSelect");
  const msg = document.getElementById("enrollMsg");
  const courseId = select.value;

  if (!courseId) {
    alert("Please select a course.");
    return;
  }

  try {
    const res = await fetch(`${API}/student/enroll`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ course_id: parseInt(courseId) })
    });

    const data = await res.json();

    msg.style.display = "block";
    if (res.ok) {
      msg.innerText = "🎉 Enrollment Successful!";
      msg.className = "bg-green-100 text-green-700 p-3 rounded-lg text-center font-bold mb-4 block";

      // Refresh Dashboard after short delay
      setTimeout(() => {
        closeEnrollModal();
        loadCourses();
        loadProgress();
        loadAssignments();
        loadStudentQuizzes();
        loadMentors();
      }, 1000);
    } else {
      msg.innerText = data.error || "Enrollment failed.";
      msg.className = "bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold mb-4 block";
    }

  } catch (e) {
    console.error("Enrollment error", e);
    msg.innerText = "Server error. Please try again.";
    msg.className = "bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold mb-4 block";
    msg.style.display = "block";
  }
}

function setupTabs() {
  console.log("Setting up tabs...");
  const navs = document.querySelectorAll(".nav");
  const pages = document.querySelectorAll(".page");

  if (navs.length === 0) console.warn("No nav elements found!");
  if (pages.length === 0) console.warn("No page elements found!");

  navs.forEach(nav => {
    nav.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default if it's a link
      const pageId = nav.dataset.page;
      console.log("Nav clicked:", pageId);

      // Update Nav State
      navs.forEach(n => n.classList.remove("active"));
      nav.classList.add("active");

      // Update Page State
      pages.forEach(p => p.classList.remove("show"));
      const target = document.getElementById(pageId);
      if (target) {
        target.classList.add("show");
        console.log("Switched to page:", pageId);
      } else {
        console.error("Target page not found:", pageId);
      }
    });
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
}

function setupAssignmentForm() {
  const form = document.getElementById("assignmentForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("finalSubmitBtn");
    const msg = document.getElementById("submitMsg");

    const assignmentId = document.getElementById("submitAssignmentId").value;
    const fileInput = document.getElementById("assignmentFile");

    if (!fileInput.files[0]) return alert("Please select a file");

    const file = fileInput.files[0];
    const allowedExtensions = ['pdf', 'zip', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt) || fileExt === 'png') {
      return alert("Invalid file type. Only PDF, ZIP, and Documents are allowed. PNGs are not allowed.");
    }

    const formData = new FormData();
    formData.append("assignment_id", assignmentId);
    formData.append("file", fileInput.files[0]);

    submitBtn.disabled = true;
    submitBtn.innerText = "Uploading...";

    try {
      const res = await fetch(`${API}/student/submit`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.status === 401) {
        alert("Session expired. Please login again.");
        logout();
        return;
      }

      if (res.ok) {
        msg.innerText = "Assignment submitted successfully! ✅";
        msg.style.display = "block";
        form.reset();

        setTimeout(() => {
          closeSubmitModal();
          loadAssignments(); // Refresh list to unlock next
          loadProgress();    // Update progress bar
        }, 1500);
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "Failed to submit"));
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit for Grading";
    }
  });
}

function setupTaskForm() {
  const form = document.getElementById("taskForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("finalSubmitTaskBtn");
    const msg = document.getElementById("taskSubmitMsg");

    const taskId = document.getElementById("submitTaskId").value;
    const fileInput = document.getElementById("taskFile");

    if (!fileInput.files[0]) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    try {
      const res = await fetch(`${API}/intern/task/${taskId}/complete`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        msg.innerText = "Task submitted successfully! ✅";
        msg.style.display = "block";
        form.reset();

        setTimeout(() => {
          closeSubmitTaskModal();
          loadAssignments();
          loadProgress();
        }, 1500);
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "Failed to submit task"));
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Task";
    }
  });
}

function renderCourses(courses) {
  const container = document.getElementById("courseList");
  if (!container) return; // Might not exist if not on course page, but it should

  container.innerHTML = "";

  if (!courses || courses.length === 0) {
    container.innerHTML = "<p class='col-span-3 text-center text-slate-400 py-10'>You are not enrolled in any courses yet.</p>";
    return;
  }

  courses.forEach(c => {
    // Use Tailwind styling consistent with dashboard
    // c structure: {id, name, date, status, ...} from backend

    const statusClass = c.status === 'Completed'
      ? 'bg-green-100 text-green-700'
      : 'bg-blue-100 text-blue-700';

    const card = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden">
            <div class="flex justify-between items-start mb-4">
                <div class="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform shadow-sm">
                    <i class="fa-solid fa-graduation-cap"></i>
                </div>
                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${statusClass}">${c.status || 'Active'}</span>
            </div>
            
            <h3 class="text-xl font-bold text-gray-800 mb-1">${c.name}</h3>
            
            <div class="flex items-center gap-2 mb-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <i class="fa-regular fa-calendar"></i> Enrolled: ${c.date || 'N/A'}
            </div>
            
            <div class="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                 <button onclick="viewCourseResources(${c.id}, '${c.name.replace(/'/g, "\\'")}')" class="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-2 group/btn transition-colors">
                    <i class="fa-solid fa-folder-open"></i> Course Resources <i class="fa-solid fa-arrow-right group-hover/btn:translate-x-1 transition-transform"></i>
                 </button>
            </div>
        </div>
      `;
    container.innerHTML += card;
  });
}

async function viewCourseResources(courseId, courseName) {
  const resourceSection = document.getElementById("resourceSection");
  const list = document.getElementById("resourceList");

  if (!resourceSection || !list) return;

  // Show loading state
  resourceSection.classList.remove("hidden");
  list.innerHTML = `<p class="col-span-3 text-center text-slate-400 py-4"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading resources for ${courseName}...</p>`;

  // Smooth scroll
  resourceSection.scrollIntoView({ behavior: 'smooth' });

  try {
    const res = await fetch(`${API}/student/course/${courseId}/resources`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch resources");

    const resources = await res.json();
    list.innerHTML = "";

    if (resources.length === 0) {
      list.innerHTML = `<p class="col-span-3 text-center text-slate-400 py-4">No resources available for this course yet.</p>`;
      return;
    }

    resources.forEach(r => {
      let icon = "fa-file";
      let color = "text-gray-500 bg-gray-50";

      if (r.type === 'PDF') { icon = "fa-file-pdf"; color = "text-red-500 bg-red-50"; }
      else if (r.type === 'Video') { icon = "fa-video"; color = "text-red-600 bg-red-50"; }
      else if (r.type === 'Link') { icon = "fa-link"; color = "text-blue-500 bg-blue-50"; }

      // Construct safe URL
      let resourceUrl = r.url;
      if (!resourceUrl.startsWith('http') && !resourceUrl.startsWith('//')) {
        // If relative path, prepend API base (assuming uploads are served via API)
        // Remove leading slash to avoid double slash if needed, or handle elegantly
        const cleanPath = resourceUrl.startsWith('/') ? resourceUrl.substring(1) : resourceUrl;
        resourceUrl = `${API}/${cleanPath}`;
      }

      const card = `
                <a href="${resourceUrl}" target="_blank" class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all group">
                    <div class="h-12 w-12 rounded-lg flex items-center justify-center text-xl ${color}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">${r.title}</h4>
                        <span class="text-xs text-slate-400 uppercase tracking-wide font-medium">${r.type}</span>
                    </div>
                    <i class="fa-solid fa-external-link-alt ml-auto text-gray-300 group-hover:text-indigo-400"></i>
                </a>
            `;
      list.innerHTML += card;
    });

  } catch (err) {
    console.error("Error loading resources:", err);
    list.innerHTML = `<p class="col-span-3 text-center text-red-400 py-4">Failed to load resources.</p>`;
  }
}