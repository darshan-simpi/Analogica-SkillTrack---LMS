const API = "http://127.0.0.1:5000";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "STUDENT") {
  window.location.href = "login.html";
}


document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - Initializing Student Dashboard");

  // Set Student Name safely
  const nameEl = document.getElementById("studentName");
  if (nameEl) nameEl.innerText = localStorage.getItem("name") || "Student";

  loadCourses();
  loadProgress();
  loadAssignments();
  loadMentors(); // Fetch mentors
  setupTabs();
  setupLogout();
  setupAssignmentForm();
});

async function loadProgress() {
  try {
    const res = await fetch(`${API}/api/student/progress`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const progressData = await res.json();

    // Calculate Average Completion
    if (progressData.length > 0) {
      const totalProgress = progressData.reduce((sum, p) => sum + p.progress, 0);
      const avg = Math.round(totalProgress / progressData.length);

      const fill = document.getElementById("completionFill");
      const text = document.getElementById("completionText");

      if (fill) fill.style.width = avg + "%";
      if (text) text.innerText = avg + "% of total curriculum";
    }

    renderProgress(progressData);
  } catch (err) {
    console.error("Failed to load progress", err);
  }
}

async function loadMentors() {
  try {
    const res = await fetch(`${API}/api/mentors`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
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
    const initials = m.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    container.innerHTML += `
            <div class="mentor-card glow">
                <div class="mentor-badge">Trainer</div>
                <div class="mentor-img">${initials}</div>
                <h3>${m.name}</h3>
                <p><strong>Expertise:</strong> ${m.expertise}</p>
                <p class="mentor-email"><i class="fa-solid fa-envelope"></i> ${m.email}</p>
                <div class="socials">
                     <i class="fa-brands fa-linkedin"></i>
                </div>
            </div>
        `;
  });
}


async function loadCourses() {
  try {
    const res = await fetch(`${API}/api/student/courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

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
    const res = await fetch(`${API}/api/tasks`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const tasks = await res.json();

    // Update "Pending Tasks" count
    const pendingCount = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Submitted').length;
    const pendingEl = document.getElementById("pendingCount");
    if (pendingEl) pendingEl.innerText = pendingCount;

    renderAssignments(tasks);
  } catch (err) {
    console.error("Failed to load assignments", err);
    document.getElementById("assignmentList").innerHTML = "<p>Failed to load assignments.</p>";
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
    list.innerHTML += `
      <div class="box glow course-card">
        <h3>${c.name}</h3>
        <p class="description">Enrolled Student Course</p>
        <div class="course-meta">
            <span><i class="fa-solid fa-calendar"></i> ${c.date}</span>
            <span class="tag medium">${c.status || 'Active'}</span>
        </div>
      </div>
    `;
  });
}

function renderAssignments(tasks) {
  const listContainer = document.getElementById("assignmentList");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  if (tasks.length === 0) {
    listContainer.innerHTML = "<p>No pending assignments.</p>";
    return;
  }

  tasks.forEach(t => {
    listContainer.innerHTML += `
            <div class="task glow">
                <div style="flex:1">
                    <h4>${t.title}</h4>
                    <small>${t.description || ''}</small>
                </div>
                <span class="tag ${t.priority === 'High' ? 'high' : 'medium'}">${t.due_date ? 'Due: ' + t.due_date : 'No Deadline'}</span>
                <span class="tag" style="background:${t.status === 'Completed' ? 'green' : '#444'}">${t.status}</span>
            </div>
        `;
  });
}


function renderProgress(progressData) {
  const container = document.getElementById("progressContainer");

  if (!container) return; // Safety check

  container.innerHTML = "";

  if (progressData.length === 0) {
    container.innerHTML = "<p>No enrolled courses yet.</p>";
    return;
  }

  progressData.forEach(p => {
    container.innerHTML += `
        <div class="progress-box glow">
            <div class="week-header">
                <h4>${p.course_name} <span style="font-size:0.8em; color:#bbb">(${p.status})</span></h4>
                <span>${p.progress}%</span>
            </div>
            <div class="bar"><div class="fill" style="width:${p.progress}%; background: ${p.progress >= 100 ? '#22c55e' : '#4f46e5'}"></div></div>
        </div>
    `;
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
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
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      document.getElementById("submitMsg").style.display = "block";
      // In a real app, you would POST this to the server
    });
  }
}