/* ================= PAGE LOAD ================= */
document.addEventListener("DOMContentLoaded", () => {
  checkAuthAndInitialize();
});

/* ================= AUTH ================= */
function checkAuthAndInitialize() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  // Show dashboard
  document.getElementById("dashboardSection").style.display = "block";

  // Set trainer name
  const trainerName = localStorage.getItem("name") || "Trainer";
  document.getElementById("trainerInfo").innerText = `Welcome, ${trainerName}`;

  // Initial load
  fetchStudents();
  setupEventListeners();
}

/* ================= MOCK DATA ================= */
let allStudents = [
  {
    id: 1,
    name: "John Doe",
    email: "john@mail.com",
    course: "Web Development",
    progress: 75,
    assignmentsCompleted: 8,
    totalAssignments: 10,
    status: "On Track",
    enrollmentDate: "2024-01-15",
    lastActivity: "2024-03-20"
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@mail.com",
    course: "Data Science",
    progress: 45,
    assignmentsCompleted: 4,
    totalAssignments: 10,
    status: "Behind",
    enrollmentDate: "2024-02-01",
    lastActivity: "2024-03-18"
  },
  {
    id: 3,
    name: "Rahul Kumar",
    email: "rahul@mail.com",
    course: "Flutter Development",
    progress: 82,
    assignmentsCompleted: 9,
    totalAssignments: 10,
    status: "On Track",
    enrollmentDate: "2024-01-10",
    lastActivity: "2024-03-22"
  }
];

let filteredStudents = [...allStudents];

/* ================= INITIAL LOAD ================= */
function fetchStudents() {
  populateCourseFilter();
  updateStatistics();
  updateCharts();
  renderStudentsTable();
}

/* ================= FILTER DROPDOWN ================= */
function populateCourseFilter() {
  const courseFilter = document.getElementById("courseFilter");

  const courses = [...new Set(allStudents.map(s => s.course))];

  courseFilter.innerHTML = `<option value="all">All Courses</option>`;

  courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseFilter.appendChild(option);
  });
}

/* ================= EVENT LISTENERS ================= */
function setupEventListeners() {
  document.getElementById("searchInput").addEventListener("input", filterStudents);
  document.getElementById("courseFilter").addEventListener("change", filterStudents);
  document.getElementById("statusFilter").addEventListener("change", filterStudents);
}

/* ================= FILTER LOGIC ================= */
function filterStudents() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const course = document.getElementById("courseFilter").value;
  const status = document.getElementById("statusFilter").value;

  filteredStudents = allStudents.filter(s =>
    (s.name.toLowerCase().includes(search) ||
     s.email.toLowerCase().includes(search)) &&
    (course === "all" || s.course === course) &&
    (status === "all" || s.status === status)
  );

  updateStatistics();
  updateCharts();
  renderStudentsTable();
}

/* ================= STATS ================= */
function updateStatistics() {
  document.getElementById("totalStudents").textContent = filteredStudents.length;

  document.getElementById("onTrackCount").textContent =
    filteredStudents.filter(s => s.status === "On Track").length;

  document.getElementById("behindCount").textContent =
    filteredStudents.filter(s => s.status === "Behind").length;

  const avg =
    filteredStudents.reduce((sum, s) => sum + s.progress, 0) /
    (filteredStudents.length || 1);

  document.getElementById("avgProgress").textContent = Math.round(avg) + "%";
  document.getElementById("studentCount").textContent = filteredStudents.length;
}

/* ================= TABLE ================= */
function renderStudentsTable() {
  const tbody = document.getElementById("studentsTableBody");
  tbody.innerHTML = "";

  if (filteredStudents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">No students found</td>
      </tr>`;
    return;
  }

  filteredStudents.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>
          <div class="student-name">${s.name}</div>
          <div class="student-email">${s.email}</div>
        </td>
        <td>${s.course}</td>
        <td>
          <div class="progress-wrapper">
            <div class="progress-bar-container">
              <div class="progress-bar progress-bar-green"
                   style="width:${s.progress}%"></div>
            </div>
            <span class="progress-text">${s.progress}%</span>
          </div>
        </td>
        <td>${s.assignmentsCompleted}/${s.totalAssignments}</td>
        <td>
          <span class="status-badge ${
            s.status === "On Track"
              ? "status-on-track"
              : "status-behind"
          }">${s.status}</span>
        </td>
        <td>
          <button class="btn-view"
                  onclick="viewStudentDetails(${s.id})">
            View
          </button>
        </td>
      </tr>
    `;
  });
}

/* ================= MODAL ================= */
function viewStudentDetails(id) {
  const s = allStudents.find(stu => stu.id === id);

  document.getElementById("modalBody").innerHTML = `
    <p><b>Name:</b> ${s.name}</p>
    <p><b>Email:</b> ${s.email}</p>
    <p><b>Course:</b> ${s.course}</p>
    <p><b>Progress:</b> ${s.progress}%</p>
    <p><b>Assignments:</b> ${s.assignmentsCompleted}/${s.totalAssignments}</p>
    <p><b>Status:</b> ${s.status}</p>
  `;

  document.getElementById("studentModal").classList.add("show");
}

function closeModal() {
  document.getElementById("studentModal").classList.remove("show");
}

/* ================= CHARTS ================= */
function updateCharts() {

  // Destroy old charts (avoid overlap)
  if (window.statusChart) window.statusChart.destroy();
  if (window.progressChart) window.progressChart.destroy();
  if (window.assignmentChart) window.assignmentChart.destroy();

  /* ===== PIE CHART (STATUS) ===== */
  window.statusChart = new Chart(
    document.getElementById("statusChart"),
    {
      type: "pie",
      data: {
        labels: ["On Track", "Behind"],
        datasets: [{
          data: [
            filteredStudents.filter(s => s.status === "On Track").length,
            filteredStudents.filter(s => s.status === "Behind").length
          ],
          backgroundColor: ["#10b981", "#ef4444"]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } }
      }
    }
  );

  /* ===== BAR CHART (PROGRESS) ===== */
  window.progressChart = new Chart(
    document.getElementById("progressChart"),
    {
      type: "bar",
      data: {
        labels: filteredStudents.map(s => s.name),
        datasets: [{
          label: "Progress %",
          data: filteredStudents.map(s => s.progress),
          backgroundColor: "#6366f1"
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    }
  );

  /* ===== BAR CHART (ASSIGNMENTS) ===== */
  window.assignmentChart = new Chart(
    document.getElementById("assignmentChart"),
    {
      type: "bar",
      data: {
        labels: filteredStudents.map(s => s.name),
        datasets: [{
          label: "Assignments Completed",
          data: filteredStudents.map(s => s.assignmentsCompleted),
          backgroundColor: "#22c55e"
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    }
  );
}


/* ================= LOGOUT ================= */
function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("name");
  window.location.href = "login.html";
}

