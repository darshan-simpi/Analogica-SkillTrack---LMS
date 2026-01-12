const BASE_URL = "http://127.0.0.1:5000";
const API = `${BASE_URL}/api`;
const token = localStorage.getItem("token");

let selectedCourseId = null;

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("welcome").innerText =
    "Welcome, " + (localStorage.getItem("name") || "Trainer");

  loadTrainerCourses(); // ✅ ADD THIS BACK

  const logoutBtn = document.querySelector(".logout");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.clear();
      window.location.href = "index.html";
    };
  }
});

/* ================= LOAD COURSES ================= */
async function loadTrainerCourses() {
  const res = await fetch(`${API}/trainer/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const courses = await res.json();
  const container = document.getElementById("trainerCourses");
  container.innerHTML = "";

  document.getElementById("totalCourses").innerText = courses.length;
  document.getElementById("totalStudents").innerText =
    courses.reduce((a, b) => a + b.students, 0);

  courses.forEach(c => {
    container.innerHTML += `
      <div class="course-card">
        <h3>${c.course_name}</h3>
        <p>${c.students} Students</p>
        <p>${c.duration}</p>
        <button onclick="openCourse(${c.course_id}, '${c.course_name}')">
          Manage Course
        </button>
      </div>
    `;
  });
}



/* ================= OPEN COURSE ================= */
function openCourse(courseId, courseName) {
  selectedCourseId = courseId;

  showSection("manageCourse");
  document.getElementById("courseTitle").innerText = courseName;

  loadAssignments(selectedCourseId);
  loadResources();
}
function backToCourses() {
  showSection("courses");
}


/* ================= ASSIGNMENTS ================= */
let editingAssignmentId = null;

async function createAssignment() {
  const title = assignmentTitle.value;
  const due = assignmentDue.value;

  if (!title) return alert("Title is required");

  // DECIDE: Create or Update?
  if (editingAssignmentId) {
    // UPDATE MODE
    await fetch(`${API}/trainer/assignment/${editingAssignmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, due_date: due })
    });
    alert("Assignment updated successfully");
  } else {
    // CREATE MODE
    const res = await fetch(`${API}/trainer/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        course_id: selectedCourseId,
        title,
        due_date: due
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to create assignment");
      return; // Stop here, don't clear form
    }
    alert("Assignment created successfully");
  }

  // Reset Form
  cancelEdit();
  loadAssignments(selectedCourseId);
}

function editAssignment(id, title, week, due) {
  editingAssignmentId = id;

  // Populate Form
  document.getElementById("assignmentTitle").value = title;
  document.getElementById("assignmentDue").value = due && due !== 'null' ? due : "";

  // UI Updates
  document.getElementById("saveAssignmentBtn").innerText = "Update Assignment";
  document.getElementById("cancelEditBtn").style.display = "inline-block";

  // Scroll to top
  document.getElementById("manageCourse").scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingAssignmentId = null;

  document.getElementById("assignmentTitle").value = "";
  document.getElementById("assignmentDue").value = "";

  document.getElementById("saveAssignmentBtn").innerText = "Save Assignment";
  document.getElementById("cancelEditBtn").style.display = "none";
}

async function deleteAssignment(id) {
  if (!confirm("Are you sure? This will delete the assignment and ALL student submissions associated with it.")) return;

  const res = await fetch(`${API}/trainer/assignment/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    loadAssignments(selectedCourseId);
  } else {
    alert("Failed to delete assignment");
  }
}


async function loadAssignments(courseId) {
  const res = await fetch(`${API}/trainer/course/${courseId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const container = document.getElementById("assignmentTable");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<tr><td colspan='3'>No assignments yet</td></tr>";
    return;
  }

  data.forEach(a => {
    // Escape single quotes for safety in onclick
    const safeTitle = (a.title || "").replace(/'/g, "\\'");

    container.innerHTML += `
      <tr>
        <td>Week ${a.week_number || 1}: <b>${a.title}</b></td>
        <td>${a.due_date || "No Date"}</td>
        <td>
           <button onclick="viewSubmissions(${a.id})" class="btn-small">View</button>
           <button onclick="editAssignment(${a.id}, '${safeTitle}', ${a.week_number}, '${a.due_date}')" class="btn-small">Edit</button>
           <button onclick="deleteAssignment(${a.id})" class="btn-small">Delete</button>
        </td>
      </tr>
    `;
  });
}

/* ================= SUBMISSIONS ================= */
async function viewSubmissions(assignmentId) {
  try {
    const res = await fetch(`${API}/trainer/assignment/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch submissions");

    const data = await res.json();
    const container = document.getElementById("submissionTable");
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<tr><td colspan='4'>No submissions yet</td></tr>";
    } else {
      data.forEach(s => {
        container.innerHTML += `
          <tr>
            <td>${s.student_name}</td>
            <td><a href="${BASE_URL}/${s.file_url}" target="_blank" class="view-link">View File</a></td>
            <td>
              <input class="feedback-input" placeholder="Grade (e.g. 90%)" value="${s.grade || ""}" 
                style="width: 80px; text-align: center;"
                onchange="updateSubmission(${s.submission_id}, {grade: this.value})">
            </td>
            <td>
              <input class="feedback-input" placeholder="Feedback" value="${s.feedback || ""}"
                onchange="updateSubmission(${s.submission_id}, {feedback: this.value})">
            </td>
            <td>
              <div class="action-btns">
                <button class="approve-btn" onclick="updateSubmissionStatus(${s.submission_id}, 'Approved')">Approve</button>
                <button class="reject-btn" onclick="updateSubmissionStatus(${s.submission_id}, 'Rejected')">Reject</button>
              </div>
              <div id="status-${s.submission_id}" class="status-text">${s.status || 'Pending'}</div>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error(err);
  }

  switchTab('submissions', true);
}

async function updateSubmission(id, data) {
  await fetch(`${API}/trainer/submission/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ submission_id: id, ...data })
  });
}

async function updateSubmissionStatus(id, status) {
  const res = await fetch(`${API}/trainer/submission/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ submission_id: id, status: status })
  });

  if (res.ok) {
    const statusEl = document.getElementById(`status-${id}`);
    if (statusEl) {
      statusEl.innerText = status;
      statusEl.className = `status-text status-${status.toLowerCase()}`;
    }
    alert(`Submission ${status}`);
  }
}

/* ================= RESOURCES ================= */
async function addResource() {
  const form = new FormData();
  form.append("title", resourceTitle.value);
  form.append("file", resourceFile.files[0]);

  await fetch(`${API}/trainer/course/${selectedCourseId}/resource/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  resourceTitle.value = "";
  resourceFile.value = "";
  loadResources();
}

async function loadResources() {
  const res = await fetch(`${API}/trainer/course/${selectedCourseId}/resources`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const table = document.getElementById("resourceTable");
  table.innerHTML = "";

  data.forEach(r => {
    table.innerHTML += `
      <tr>
        <td>${r.title}</td>
        <td>${r.type}</td>
        <td><a href="${API}/${r.url}" target="_blank">Open</a></td>
        <td><button onclick="deleteResource(${r.id})">Delete</button></td>
      </tr>
    `;
  });
}

async function deleteResource(id) {
  await fetch(`${API}/trainer/resource/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadResources();
}
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => {
    s.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) target.style.display = "block";
}

async function loadCourseSubmissions(courseId) {
  if (!courseId) return;
  try {
    const res = await fetch(`${API}/trainer/course/${courseId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch course submissions");

    const data = await res.json();
    const container = document.getElementById("submissionTable");
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<tr><td colspan='4'>No submissions yet for this course</td></tr>";
    } else {
      data.forEach(s => {
        container.innerHTML += `
          <tr>
            <td>${s.student_name}</td>
            <td>
              <div style="font-size: 0.8em; color: #64748b; margin-bottom: 4px;">Task: ${s.assignment_title || 'N/A'}</div>
              <a href="${BASE_URL}/${s.file_url}" target="_blank" class="view-link">View File</a>
            </td>
            <td>
              <input class="feedback-input" placeholder="Grade" value="${s.grade || ""}" 
                style="width: 80px;"
                onchange="updateSubmission(${s.submission_id}, {grade: this.value})">
            </td>
            <td>
              <input class="feedback-input" placeholder="Feedback" value="${s.feedback || ""}"
                onchange="updateSubmission(${s.submission_id}, {feedback: this.value})">
            </td>
            <td>
              <div class="action-btns">
                <button class="approve-btn" onclick="updateSubmissionStatus(${s.submission_id}, 'Approved')">Approve</button>
                <button class="reject-btn" onclick="updateSubmissionStatus(${s.submission_id}, 'Rejected')">Reject</button>
              </div>
              <div id="status-${s.submission_id}" class="status-text">${s.status || 'Pending'}</div>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function switchTab(tab, preventReload = false) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  const tabBtn = document.querySelector(`button[onclick*="switchTab('${tab}')"]`);
  if (tabBtn) tabBtn.classList.add("active");

  const content = document.getElementById(tab);
  if (content) content.classList.add("active");

  if (tab === 'submissions' && !preventReload) {
    loadCourseSubmissions(selectedCourseId);
  }
}
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}