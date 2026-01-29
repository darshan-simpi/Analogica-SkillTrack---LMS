const API = "http://localhost:5005/api";
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

  data.forEach(c => {
    console.log("🛠️ Rendering Course Progress Item:", c);
    const progressColor = c.progress >= 100 ? 'bg-blue-500' : 'bg-indigo-600';
    const tagClass = c.progress >= 100 ? 'bg-blue-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800';
    const borderClass = c.progress >= 100 ? 'border-emerald-500' : 'border-indigo-600';

    container.innerHTML += `
            <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 ${borderClass} mb-6 hover:shadow-md transition-shadow relative overflow-hidden">
                <div class="flex justify-between items-center mb-4 relative z-10">
                    <h3 class="text-lg font-bold text-gray-800 m-0">${c.course_name}</h3>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${tagClass}">${c.status}</span>
                </div>
                
                <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4 relative z-10">
                    <div class="h-full rounded-full transition-all duration-500 ${progressColor}" style="width:${c.progress}%"></div>
                </div>
                
                <div class="flex flex-col gap-2 text-sm text-gray-600 relative z-10">
                    <div class="flex justify-between font-medium">
                        <span class="text-gray-900 font-bold">${c.progress}% Overall Progress</span>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>Assignments: ${c.assignments_completed || 0} / ${c.total_assignments || 0}</span>
                        <span>Quizzes: ${c.quizzes_completed || 0} / ${c.total_quizzes || 0}</span>
                    </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-500 font-medium relative z-10">
                   <span class="flex items-center gap-2"><i class="fa-solid fa-clock text-gray-400"></i> ${c.duration || 'N/A'}</span>
                   <span class="flex items-center gap-2"><i class="fa-solid fa-trophy ${c.progress >= 100 ? 'text-yellow-500' : 'text-gray-300'}"></i> ${c.progress >= 100 ? 'Certificate Unlocked' : 'Certificate Locked'}</span>
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
                    <span class="text-xs font-bold uppercase tracking-wider text-[${statusColor}]" style="color:${statusColor}">Week ${a.week_number}</span>
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
    const res = await fetch(`${API}/student/dashboard`, {
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
          const downloadUrl = `${API}${eligibleForCertificate.certificate_url} `;
          certResult.innerHTML = `
        <div style="background:#dbeafe; padding:20px; border-radius:12px; border:2px solid #2563EB; margin-bottom:20px;">
                    <p style="color:#1e40af; font-weight:bold; margin-bottom:10px; font-size:1.1em">Your Certificate is Ready ✅</p>
                    <a href="${downloadUrl}" target="_blank" style="display:inline-block; background:#2563EB; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:800; font-size:1.2em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        🔗 CLICK HERE TO VIEW PDF
                    </a>
                </div>
      `;
          certBtn.innerText = "Certificate Ready ✅";
        }

        if (certHeader) certHeader.style.color = "#2563EB";
        if (certHeader) certHeader.innerText = "🎓 Certification Available!";
        if (certMsg) certMsg.innerText = `Congratulations! You've completed "${eligibleForCertificate.name}".`;

        certBtn.disabled = false;
        certBtn.style.background = "#2563EB";
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
        <div style="background:#dbeafe; padding:20px; border-radius:12px; border:2px solid #2563EB; margin-bottom:20px; animation: fadeIn 0.6s ease-out;">
          <p style="color:#1e40af; font-weight:bold; margin-bottom:10px; font-size:1.1em">Success! Certificate is ready ✅</p>
          <a href="${downloadUrl}" target="_blank" style="display:inline-block; background:#2563EB; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:800; font-size:1.2em; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;">
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
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group h-full flex flex-col" onclick="showResources(${c.id}, '${courseName}')">
        <h3 class="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">${c.name || 'Untitled Course'}</h3>
        <p class="text-gray-500 text-sm mb-4 line-clamp-2">Enrolled Student Course</p>
        <div class="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
            <span class="flex items-center text-gray-400 font-medium"><i class="fa-solid fa-calendar mr-2"></i> ${courseDate}</span>
            <div class="flex gap-2 items-center">
                <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-bold uppercase tracking-wider text-[10px]">ENROLLED</span>
                <span class="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md font-bold uppercase tracking-wider text-[10px] group-hover:bg-indigo-100">Details</span>
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

      let finalUrl = r.url;
      if (finalUrl && !finalUrl.startsWith("http")) {
        // If relative path (e.g. uploads/resources/...), prepend API base
        const cleanPath = finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl;
        finalUrl = `${API}/${cleanPath}`;
      }

      resourceList.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <i class="fa-solid ${icon} text-2xl mb-3 text-indigo-600"></i>
                    <h4 class="font-bold text-gray-800 text-sm mb-1">${r.title}</h4>
                    <p class="text-xs text-gray-400 font-bold uppercase mb-3">${r.type.toUpperCase()}</p>
                    <a href="${finalUrl}" target="_blank" class="inline-block w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 rounded-lg transition-colors">Visit Resource</a>
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

          let finalUrl = r.url;
          if (finalUrl && !finalUrl.startsWith("http")) {
            const cleanPath = finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl;
            finalUrl = `${API}/${cleanPath}`;
          }

          resourceGrid += `
            <div class="card glow small-card">
              <i class="fa-solid ${icon}" style="font-size:1.5em; margin-bottom:10px; color:#4f46e5"></i>
              <h4>${r.title}</h4>
              <p style="font-size:0.8em; margin:10px 0">${r.type.toUpperCase()}</p>
              <a href="${finalUrl}" target="_blank" class="btn-primary" style="padding:5px 10px; font-size:0.8em">Visit Resource</a>
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
        actionBtns = `<button onclick="openSubmitModal(${t.id}, '${safeTitle}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm">Submit</button>`;
      } else if (isSubmitted) {
        const feedback = t.feedback ? t.feedback.replace(/'/g, "\\'") : "Wait for trainer feedback...";
        const grade = t.grade ? `Grade: ${t.grade}` : "Grading Pending";
        const btnText = t.grade ? "View Grade" : "View Status";
        actionBtns = `<button onclick="openViewModal('${safeTitle}', '${feedback}', '${t.grade || ''}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors border border-slate-200">${btnText}</button>`;
      } else if (isDataRevealed && !isSubmitted) {
        actionBtns = `<button disabled class="bg-slate-100 text-slate-400 font-semibold py-2 px-4 rounded-lg text-sm cursor-not-allowed border border-slate-200">Locked</button>`;
      }

      const displayTitle = isDataRevealed ? `: ${t.title}` : "";
      let displayDesc = isDataRevealed ? (t.due_date ? '📅 Due: ' + t.due_date : 'No Deadline') : '🔒 This assignment is locked until the previous one is submitted.';

      listContainer.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all ${(!isDataRevealed) ? 'opacity-50 grayscale' : ''}" style="border-left: 5px solid ${statusColor};">
                <div class="flex-1 pr-4">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white" style="background:${statusColor}">${statusText}</span>
                        <h4 class="font-bold text-gray-800 text-lg m-0">Week ${weekNum}${displayTitle}</h4>
                    </div>
                    <p class="text-sm text-gray-500 font-medium">${displayDesc}</p>
                </div>
                <div>
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
                <span class="text-xs font-bold uppercase tracking-wider block mb-1" style="color:${statusColor}">Week ${q.week_number}</span>
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