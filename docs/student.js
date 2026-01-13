const API = "http://localhost:5000/api";
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
  if (nameEl) nameEl.innerText = localStorage.getItem("name") || "Student";

  loadCourses();
  loadProgress();
  loadAssignments();
  loadStudentQuizzes();
  loadMentors();
  setupTabs();
  setupLogout();
  setupAssignmentForm();
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

  data.forEach(c => {
    console.log("🛠️ Rendering Course Progress Item:", c);
    container.innerHTML += `
            <div class="box glow" style="margin-bottom:20px; padding:25px; border-left: 5px solid ${c.progress >= 100 ? '#22c55e' : '#4f46e5'}">
                <div style="font-size: 0.7em; color: #cbd5e1; margin-bottom: 5px; text-align: right;">System Sync: ${new Date().toLocaleTimeString()}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                    <h3 style="margin:0; font-size:1.2em">${c.course_name}</h3>
                    <span class="tag" style="background:${c.progress >= 100 ? '#dcfce7' : '#e0ecff'}; color:${c.progress >= 100 ? '#166534' : '#3730a3'}">${c.status}</span>
                </div>
                
                <div class="bar" style="height:10px; background:#e2e8f0; border-radius:5px; overflow:hidden; margin-bottom:10px">
                    <div class="fill" style="width:${c.progress}%; background: ${c.progress >= 100 ? '#22c55e' : '#4f46e5'}; height:100%"></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px; font-size:0.9em; color:#64748b">
                    <div style="display:flex; justify-content:space-between">
                        <span><b>${c.progress}%</b> Overall Progress</span>
                    </div>
                    <div style="display:flex; justify-content:space-between">
                        <span>Assignments: ${c.assignments_completed || 0} / ${c.total_assignments || 0}</span>
                        <span>Quizzes: ${c.quizzes_completed || 0} / ${c.total_quizzes || 0}</span>
                    </div>
                </div>
                
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #f1f5f9; display:flex; gap:20px; font-size:0.85em">
                   <span><i class="fa-solid fa-clock"></i> Duration: ${c.duration || 'N/A'}</span>
                   <span><i class="fa-solid fa-trophy"></i> Certificate: ${c.progress >= 100 ? 'Unlocked 🔓' : 'Locked 🔒'}</span>
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

      // Action Button
      let actionBtn = "";
      if (isUnlocked && !isSubmitted) {
        actionBtn = `<button onclick="openSubmitModal(${a.id}, '${safeTitle}')" class="btn-primary" style="padding:8px 20px; font-size:0.85em">Submit Task</button>`;
      } else if (isSubmitted) {
        const feedback = a.feedback ? a.feedback.replace(/'/g, "\\'") : "Wait for trainer feedback...";
        actionBtn = `<button onclick="openViewModal('${safeTitle}', '${feedback}')" style="padding:8px 20px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer">View Status</button>`;
      } else {
        actionBtn = `<button disabled style="padding:8px 20px; background:#f1f5f9; color:#94a3b8; border:none; cursor:not-allowed">Locked</button>`;
      }

      weeksGrid += `
        <div class="card glow" style="padding:20px; border-left: 5px solid ${statusColor}; border-top:none; display:flex; justify-content:space-between; align-items:center; flex-direction:row;">
            <div style="flex:1">
                <div style="display:flex; align-items:center; margin-bottom:5px; gap:10px">
                    <span style="font-size:0.8em; font-weight:700; color:${statusColor}; text-transform:uppercase; letter-spacing:0.5px">Week ${a.week_number}</span>
                    <span style="color:${statusColor}">${statusIcon}</span>
                </div>
                <h4 style="font-size:1.1em; margin:0; color:#1e293b;">${a.title}</h4>
                <p style="font-size:0.85em; color:#64748b; margin:5px 0 0 0">${isUnlocked ? (a.due_date ? 'Due: ' + a.due_date : 'No Deadline') : 'Complete previous week'}</p>
            </div>
            <div style="margin-left:20px;">
                ${actionBtn}
            </div>
        </div>
      `;
    });

    weeksGrid += `</div>`;

    container.innerHTML += `
      <div class="box glow" style="padding:25px; margin-bottom:30px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:15px">
            <h3 style="margin:0; color:#1e293b; font-size:1.3em">${c.course}</h3>
            <div style="text-align:right">
                <span style="display:block; font-size:1.5em; font-weight:800; color:#4f46e5">${c.progress}%</span>
                <span style="font-size:0.8em; color:#64748b">Overall Progress</span>
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
            <div class="mentor-card glow">
                <div class="mentor-badge">Trainer</div>
                <div class="mentor-img">${initials}</div>
                <h3>${name}</h3>
                <p><strong>Expertise:</strong> ${m.expertise || 'Mentor'}</p>
                <p class="mentor-email"><i class="fa-solid fa-envelope"></i> ${m.email || 'N/A'}</p>
                <div class="socials">
                     <i class="fa-brands fa-linkedin"></i>
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
    if (!res.ok) throw new Error(`API Error: ${res.status}`);

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
    const res = await fetch(`${API}/student/dashboard`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401) return logout();
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

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

    if (dashboardData.length === 0) {
      document.getElementById("assignmentList").innerHTML = "<p>You are not enrolled in any courses with assignments.</p>";
      return;
    }

    // Flatten all assignments from all courses
    let allTasks = [];
    let eligibleForCertificate = null;

    console.log("📦 Processing Dashboard Data:", dashboardData.length, "courses found");

    dashboardData.forEach(c => {
      const assignments = c.assignments || [];
      assignments.forEach(a => {
        allTasks.push({ ...a, course_name: c.course });
      });
      if (c.can_generate_certificate) {
        eligibleForCertificate = {
          id: c.course_id,
          name: c.course,
          certificate_url: c.certificate_url
        };
      }
    });

    console.log("📝 Total Assignments Flattened:", allTasks.length);

    // Update "Pending Tasks" count
    const pendingCount = allTasks.filter(t => !t.is_submitted).length;
    const pendingEl = document.getElementById("pendingCount");
    if (pendingEl) pendingEl.innerText = pendingCount;

    renderAssignments(allTasks);

    // Certificate logic
    console.log("🎓 Checking Certificate Eligibility...");
    const certHeader = document.getElementById("certHeader");
    const certMsg = document.getElementById("certMsg");
    const certBtn = document.getElementById("downloadCertBtn");
    const certResult = document.getElementById("certResult");

    if (certBtn) {
      if (eligibleForCertificate) {
        console.log("✅ Eligible for Certificate:", eligibleForCertificate.name);

        // PERSISTENCE FIX: If it already exists in DB, show the link immediately!
        if (eligibleForCertificate.certificate_url) {
          const downloadUrl = `${API}${eligibleForCertificate.certificate_url}`;
          certResult.innerHTML = `
                <div style="background:#dcfce7; padding:20px; border-radius:12px; border:2px solid #22c55e; margin-bottom:20px;">
                    <p style="color:#166534; font-weight:bold; margin-bottom:10px; font-size:1.1em">Your Certificate is Ready ✅</p>
                    <a href="${downloadUrl}" target="_blank" style="display:inline-block; background:#22c55e; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:800; font-size:1.2em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        🔗 CLICK HERE TO VIEW PDF
                    </a>
                </div>
            `;
          certBtn.innerText = "Certificate Ready ✅";
        }

        if (certHeader) certHeader.style.color = "#22c55e";
        if (certHeader) certHeader.innerText = "🎓 Certification Available!";
        if (certMsg) certMsg.innerText = `Congratulations! You've completed "${eligibleForCertificate.name}".`;

        certBtn.disabled = false;
        certBtn.style.background = "#22c55e";
        certBtn.style.cursor = "pointer";
        certBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> ' + (eligibleForCertificate.certificate_url ? 'Regenerate Certificate' : 'Download Official Certificate');
        certBtn.onclick = () => generateCertificate(eligibleForCertificate.id);
      } else {
        console.log("⏳ Not currently eligible for any certificates.");
        if (certHeader) certHeader.style.color = "#64748b";
        if (certHeader) certHeader.innerText = "🎓 Course Certification";
        if (certMsg) certMsg.innerText = "Complete all assignments and quizzes to unlock your certificate.";

        certBtn.disabled = true;
        certBtn.style.background = "#94a3b8";
        certBtn.style.cursor = "not-allowed";
        certBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Certificate Locked';
      }
    }

  } catch (err) {
    console.error("Failed to load assignments", err);
    document.getElementById("assignmentList").innerHTML = `<p style="color:red">Failed to load assignments: ${err.message}</p>`;
  }
}

async function generateCertificate(courseId) {
  const btn = document.getElementById("downloadCertBtn");
  const msg = document.getElementById("certResult");

  console.log("🛠️ Generating certificate for course:", courseId);
  btn.disabled = true;
  btn.innerText = "⏳ Generating...";

  try {
    const res = await fetch(`${API}/student/certificate/${courseId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    console.log("📡 API Response Status:", res.status);
    const data = await res.json();
    console.log("📄 API Data:", data);

    if (res.ok) {
      const downloadUrl = `${API}${data.url}`;
      console.log("✅ Certificate Ready at:", downloadUrl);

      // Using dedicated certResult div to prevent overwriting
      msg.innerHTML = `
        <div style="background:#dcfce7; padding:20px; border-radius:12px; border:2px solid #22c55e; margin-bottom:20px; animation: fadeIn 0.6s ease-out;">
          <p style="color:#166534; font-weight:bold; margin-bottom:10px; font-size:1.1em">Success! Certificate is ready ✅</p>
          <a href="${downloadUrl}" target="_blank" style="display:inline-block; background:#22c55e; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:800; font-size:1.2em; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;">
            🔗 CLICK HERE TO VIEW PDF
          </a>
        </div>
      `;
      btn.innerText = "Certificate Ready ✅";
    } else {
      console.error("❌ Generation failed:", data.error);
      msg.innerText = "Error: " + (data.error || "Failed to generate");
      btn.disabled = false;
      btn.innerText = "Download Certificate";
    }
  } catch (err) {
    console.error("🚨 Network/Server Error:", err);
    msg.innerText = "Server error occurred.";
    btn.disabled = false;
    btn.innerText = "Download Certificate";
  }
}
function renderCourses(courses) {
  const list = document.getElementById("courseList");
  if (!list) return;

  list.innerHTML = "";
  if (courses.length === 0) {
    list.innerHTML = "<p>No enrolled courses found.</p>";
    return;
  }

  courses.forEach(c => {
    const courseName = c.name ? c.name.replace(/'/g, "\\'") : "Unknown Course";
    const courseDate = c.date || "N/A";
    list.innerHTML += `
      <div class="box glow course-card" onclick="showResources(${c.id}, '${courseName}')" style="cursor:pointer">
        <h3>${c.name || 'Untitled Course'}</h3>
        <p class="description">Enrolled Student Course</p>
        <div class="course-meta">
            <span><i class="fa-solid fa-calendar"></i> ${courseDate}</span>
            <div style="display:flex; gap:10px; align-items:center">
                <span class="tag medium" style="margin:0">ENROLLED</span>
                <span class="tag" style="background:#e0ecff; color:#4f46e5; margin:0; cursor:pointer">View Resources</span>
            </div>
        </div>
      </div>
    `;
  });
}

async function showResources(courseId, courseName) {
  const resourceSection = document.getElementById("resourceSection");
  const resourceList = document.getElementById("resourceList");

  resourceSection.style.display = "block";
  resourceList.innerHTML = "<p>Loading resources for " + courseName + "...</p>";

  try {
    const res = await fetch(`${API}/student/course/${courseId}/resources`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const raw = await res.json();
    const resources = Array.isArray(raw) ? raw : raw.resources || [];

    resourceList.innerHTML = "";
    if (resources.length === 0) {
      resourceList.innerHTML = "<p>No resources found for this course.</p>";
      return;
    }

    resources.forEach(r => {
      const icon = r.type === 'youtube' ? 'fa-video' : (r.type === 'book' ? 'fa-book' : 'fa-link');
      resourceList.innerHTML += `
                <div class="card glow small-card">
                    <i class="fa-solid ${icon}" style="font-size:1.5em; margin-bottom:10px; color:#4f46e5"></i>
                    <h4>${r.title}</h4>
                    <p style="font-size:0.8em; margin:10px 0">${r.type.toUpperCase()}</p>
                    <a href="${r.url}" target="_blank" class="btn-primary" style="padding:5px 10px; font-size:0.8em">Visit Resource</a>
                </div>
            `;
    });
  } catch (err) {
    console.error("Failed to load resources", err);
    resourceList.innerHTML = `<p style="color:red">Error loading resources: ${err.message}</p>`;
  }
}

async function loadAllResources() {
  const container = document.getElementById("allResourcesContainer");
  if (!container) return;

  try {
    const res = await fetch(`${API}/student/courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const courses = await res.json();

    container.innerHTML = "";
    if (courses.length === 0) {
      container.innerHTML = "<p>Enroll in a course to see resources.</p>";
      return;
    }

    for (const c of courses) {
      const resData = await fetch(`${API}/student/course/${c.id}/resources`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const resources = await resData.json();

      if (resources.length > 0) {
        let resourceGrid = `<div class="grid" style="margin-top:10px; margin-bottom:30px">`;
        resources.forEach(r => {
          const icon = r.type === 'youtube' ? 'fa-video' : (r.type === 'book' ? 'fa-book' : 'fa-link');
          resourceGrid += `
            <div class="card glow small-card">
              <i class="fa-solid ${icon}" style="font-size:1.5em; margin-bottom:10px; color:#4f46e5"></i>
              <h4>${r.title}</h4>
              <p style="font-size:0.8em; margin:10px 0">${r.type.toUpperCase()}</p>
              <a href="${r.url}" target="_blank" class="btn-primary" style="padding:5px 10px; font-size:0.8em">Visit Resource</a>
            </div>`;
        });
        resourceGrid += `</div>`;

        container.innerHTML += `
          <div style="margin-bottom:20px">
            <h3 style="border-bottom:1px solid #f1f5f9; padding-bottom:10px">${c.name} Resources</h3>
            ${resourceGrid}
          </div>`;
      }
    }

    if (container.innerHTML === "") {
      container.innerHTML = "<p>No resources found for your courses.</p>";
    }

  } catch (err) {
    console.error("Failed to load all resources", err);
    container.innerHTML = "<p style='color:red'>Failed to load resources.</p>";
  }
}

function renderAssignments(tasks) {
  const listContainer = document.getElementById("assignmentList");
  if (!listContainer) return;

  try {
    console.log("🎨 Rendering Assignments:", tasks.length);
    listContainer.innerHTML = "";

    if (!Array.isArray(tasks) || tasks.length === 0) {
      listContainer.innerHTML = "<p>No pending assignments.</p>";
      return;
    }

    tasks.forEach((t, index) => {
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
        actionBtns = `<button onclick="openSubmitModal(${t.id}, '${safeTitle}')" class="btn-primary" style="padding:6px 14px; font-size:0.85em; border-radius:8px">Submit</button>`;
      } else if (isSubmitted) {
        const feedback = t.feedback ? t.feedback.replace(/'/g, "\\'") : "Wait for trainer feedback...";
        actionBtns = `<button onclick="openViewModal('${safeTitle}', '${feedback}')" class="btn-primary" style="padding:6px 14px; font-size:0.85em; border-radius:8px; background:#64748b">View Status</button>`;
      } else if (isDataRevealed && !isSubmitted) {
        actionBtns = `<button disabled class="btn-primary" style="padding:6px 14px; font-size:0.85em; border-radius:8px; background:#94a3b8; cursor:not-allowed">Locked</button>`;
      }

      const displayTitle = isDataRevealed ? `: ${t.title}` : "";
      let displayDesc = isDataRevealed ? (t.due_date ? '📅 Due: ' + t.due_date : 'No Deadline') : '🔒 This assignment is locked until the previous one is submitted.';

      listContainer.innerHTML += `
            <div class="task glow ${(!isDataRevealed) ? 'locked-task' : ''}" style="opacity: ${isDataRevealed ? 1 : 0.4}; border-left: 5px solid ${statusColor}; align-items: center">
                <div style="flex:1">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px">
                        <span class="tag" style="background:${statusColor}; color:#fff">${statusText}</span>
                        <h4 style="margin:0">Week ${weekNum}${displayTitle}</h4>
                    </div>
                    <small style="color:#666">${displayDesc}</small>
                </div>
                <div style="margin-left:20px">
                    ${actionBtns}
                </div>
            </div>
        `;
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

function openViewModal(title, feedback) {
  const modal = document.getElementById("viewModal");
  if (modal) {
    document.getElementById("viewAssignmentTitle").innerText = title;
    document.getElementById("feedbackContent").innerHTML = `<p>${feedback}</p>`;
    modal.classList.add("show");
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
            <div class="card glow" style="padding:20px; border-left: 5px solid ${statusColor}; border-top:none; display:flex; justify-content:space-between; align-items:center; opacity: ${isVisible ? 1 : 0.6}">
              <div>
                <span style="font-size:0.8em; font-weight:700; color:${statusColor}; text-transform:uppercase">Week ${q.week_number}</span>
                <h4 style="margin:5px 0">${q.title}</h4>
                <small style="color:#64748b">${isVisible ? (q.deadline ? 'Deadline: ' + q.deadline : 'No Deadline') : 'Available after previous week deadline'}</small>
              </div>
              <div>
                ${isVisible && !isSubmitted ? `<button onclick="takeQuiz(${q.id}, '${q.title.replace(/'/g, "\\'")}')" class="btn-primary">Take Quiz</button>` : `<span style="font-weight:bold; color:${statusColor}">${statusText}</span>`}
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
      <div class="quiz-question-box" style="margin-bottom:20px; padding:15px; background:#f8fafc; border-radius:8px">
        <p><strong>Q${idx + 1}:</strong> ${q.text}</p>
        <div class="options" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px">
          <label><input type="radio" name="q${q.id}" value="A"> A) ${q.option_a}</label>
          <label><input type="radio" name="q${q.id}" value="B"> B) ${q.option_b}</label>
          <label><input type="radio" name="q${q.id}" value="C"> C) ${q.option_c}</label>
          <label><input type="radio" name="q${q.id}" value="D"> D) ${q.option_d}</label>
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
    const qId = box.querySelector('input[type="radio"]').name.substring(1);
    if (radio) {
      answers[qId] = radio.value;
    } else {
      allAnswered = false;
    }
  });

  if (!allAnswered && !confirm("You haven't answered all questions. Submit anyway?")) return;

  const res = await fetch(`${API}/student/quiz/${activeQuizId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ answers })
  });

  if (res.ok) {
    const data = await res.json();
    alert(`Quiz Submitted! Your score: ${data.score}/${data.total}`);
    closeQuizModal();
    loadStudentQuizzes();
    loadAssignments(); // Refresh Certificate Status
    loadProgress();    // Refresh Progress Bar
  } else {
    const data = await res.json();
    alert(data.error || "Failed to submit quiz");
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