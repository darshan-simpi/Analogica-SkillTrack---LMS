const API = "http://127.0.0.1:5000/api";
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
      window.location.href = "login.html";
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
trainerInternships.innerHTML += `
  <div class="course-card">
    <h3>${i.title}</h3>
    <p>${i.students} Interns</p>
    <p>${i.duration}</p>
    <button>
      View Internship
    </button>
  </div>
`;
trainerWorkshops.innerHTML += `
  <div class="course-card">
    <h3>${w.title}</h3>
    <p>${w.students} Attenders</p>
    <p>Date: ${w.date}</p>
    <button>
      View Workshop
    </button>
  </div>
`;


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
async function createAssignment() {
  const title = assignmentTitle.value;
  const due = assignmentDue.value;

  await fetch(`${API}/trainer/assign`, {
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

  assignmentTitle.value = "";
  assignmentDue.value = "";
loadAssignments(selectedCourseId);
}


async function loadAssignments(courseId) {
  const res = await fetch(`${API}/trainer/course/${courseId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const container = document.getElementById("assignmentList");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p>No assignments yet</p>";
    return;
  }

  data.forEach(a => {
    container.innerHTML += `
      <div class="assignment-row">
        <b>${a.title}</b> | Due: ${a.due_date}
        <button onclick="viewSubmissions(${a.id})">
          View Submissions
        </button>
      </div>
    `;
  });
}

/* ================= SUBMISSIONS ================= */
async function viewSubmissions(assignmentId) {
  const res = await fetch(`${API}/trainer/assignment/${assignmentId}/submissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const container = document.getElementById("submissionList");
  container.innerHTML = "";

  data.forEach(s => {
    container.innerHTML += `
      <div>
        <p>${s.student_name}</p>
        <a href="${API}/${s.file_url}" target="_blank">View</a>
        <input placeholder="Feedback" value="${s.feedback || ""}"
          onchange="sendFeedback(${s.submission_id}, this.value)">
      </div>
    `;
  });
}

async function sendFeedback(id, feedback) {
  await fetch(`${API}/trainer/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ submission_id: id, feedback })
  });
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

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  document.querySelector(`button[onclick="switchTab('${tab}')"]`).classList.add("active");
  document.getElementById(tab).classList.add("active");
}
function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}


