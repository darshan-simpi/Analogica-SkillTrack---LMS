const students = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    course: "Web Development",
    progress: 75,
    assignments: "8 / 10",
    assignedTask: "",
    taskStatus: "Not Assigned",
    submission: "",
    feedback: "",
    status: "On Track"
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    course: "Data Science",
    progress: 90,
    assignments: "9 / 10",
    assignedTask: "",
    taskStatus: "Not Assigned",
    submission: "",
    feedback: "",
    status: "On Track"
  },
  {
    name: "Mike Johnson",
    email: "mike.j@example.com",
    course: "Web Development",
    progress: 45,
    assignments: "4 / 10",
    assignedTask: "",
    taskStatus: "Not Assigned",
    submission: "",
    feedback: "",
    status: "Behind"
  },
  {
    name: "Sarah Williams",
    email: "sarah.w@example.com",
    course: "Machine Learning",
    progress: 60,
    assignments: "6 / 10",
    assignedTask: "",
    taskStatus: "Not Assigned",
    submission: "",
    feedback: "",
    status: "On Track"
  },
  {
    name: "David Brown",
    email: "david.b@example.com",
    course: "Data Science",
    progress: 30,
    assignments: "3 / 10",
    assignedTask: "",
    taskStatus: "Not Assigned",
    submission: "",
    feedback: "",
    status: "Behind"
  }
];

const table = document.getElementById("studentTable");
const searchInput = document.getElementById("search");
const courseFilter = document.getElementById("courseFilter");
const statusFilter = document.getElementById("statusFilter");

/* ================= TABLE RENDER ================= */
function renderTable(data) {
  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="6">No students found</td></tr>`;
    return;
  }

  data.forEach((s, index) => {
    table.innerHTML += `
      <tr>
        <td><strong>${s.name}</strong><br><small>${s.email}</small></td>
        <td>${s.course}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill ${s.status === "Behind" ? "behind" : ""}"
                 style="width:${s.progress}%"></div>
          </div>
          ${s.progress}%
        </td>
        <td>
          ${s.assignments}<br>
          <small>
            <strong>Task:</strong> ${s.assignedTask || "Not Assigned"}<br>
            <strong>Status:</strong> ${s.taskStatus}<br>
            <strong>Submission:</strong> ${s.submission ? "Submitted" : "Not Submitted"}
          </small>
        </td>
        <td>
          <span class="status ${s.status === "On Track" ? "on-track" : "behind-tag"}">
            ${s.status}
          </span>
        </td>
        <td>
          <button class="view" onclick="viewDetails(${index})">View</button>
        </td>
      </tr>
    `;
  });
}

/* ================= VIEW DETAILS (CLOSE ONLY ON CLOSE BUTTON) ================= */
function viewDetails(index) {
  const s = students[index];

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "1000";

  modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:8px;width:420px">
      <h3>Student Details</h3>
      <p><strong>Name:</strong> ${s.name}</p>
      <p><strong>Email:</strong> ${s.email}</p>
      <p><strong>Course:</strong> ${s.course}</p>
      <p><strong>Task:</strong> ${s.assignedTask || "Not Assigned"}</p>
      <p><strong>Status:</strong> ${s.taskStatus}</p>
      <p><strong>Submission:</strong> ${s.submission ? "Submitted" : "Not Submitted"}</p>
      <p><strong>Feedback:</strong> ${s.feedback || "No feedback"}</p>

      <div style="margin-top:15px;display:flex;gap:10px;flex-wrap:wrap">
        <button onclick="assignTask(${index})">Assign Task</button>
        <button onclick="updateTaskStatus(${index})">Validate Task</button>
        <button onclick="giveFeedback(${index})">Give Feedback</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  window.closeModal = function () {
    document.body.removeChild(modal);
  };
}

/* ================= ASSIGN TASK ================= */
function assignTask(index) {
  const task = prompt("Enter assignment for student:");

  if (task && task.trim() !== "") {
    students[index].assignedTask = task;
    students[index].taskStatus = "Assigned";
    students[index].submission = "";
    students[index].feedback = "";
    renderTable(students);
  }
}

/* ================= TRAINER VALIDATE ================= */
function updateTaskStatus(index) {
  if (!students[index].submission) {
    alert("No submission to validate.");
    return;
  }

  const status = prompt(
    "Validate Task:\nType 'Completed' or 'Rejected'",
    "Completed"
  );

  if (status) {
    students[index].taskStatus = status;
    renderTable(students);
  }
}

/* ================= FEEDBACK ================= */
function giveFeedback(index) {
  if (!students[index].submission) {
    alert("Student has not submitted work yet.");
    return;
  }

  const feedback = prompt("Enter feedback:");

  if (feedback && feedback.trim() !== "") {
    students[index].feedback = feedback;
    alert("Feedback saved!");
  }
}

/* ================= FILTER LOGIC ================= */
function applyFilters() {
  let filtered = [...students];

  const searchValue = searchInput.value.toLowerCase();
  const courseValue = courseFilter.value;
  const statusValue = statusFilter.value;

  if (searchValue) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchValue) ||
      s.email.toLowerCase().includes(searchValue)
    );
  }

  if (courseValue !== "all") {
    filtered = filtered.filter(s => s.course === courseValue);
  }

  if (statusValue !== "all") {
    filtered = filtered.filter(s => s.status === statusValue);
  }

  renderTable(filtered);
}

/* ================= EVENTS ================= */
searchInput.addEventListener("input", applyFilters);
courseFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);

/* ================= INITIAL LOAD ================= */
renderTable(students);

/* ================= CHARTS (UNCHANGED) ================= */
new Chart(document.getElementById("statusChart"), {
  type: "pie",
  data: {
    labels: ["On Track", "Behind"],
    datasets: [{
      data: [3, 2],
      backgroundColor: ["#22c55e", "#ef4444"]
    }]
  }
});

new Chart(document.getElementById("completionChart"), {
  type: "bar",
  data: {
    labels: ["John", "Jane", "Mike", "Sarah", "David"],
    datasets: [{
      data: [75, 90, 45, 60, 30],
      backgroundColor: "#3b82f6"
    }]
  },
  options: { scales: { y: { beginAtZero: true, max: 100 } } }
});

new Chart(document.getElementById("assignmentChart"), {
  type: "bar",
  data: {
    labels: ["John", "Jane", "Mike", "Sarah", "David"],
    datasets: [{
      data: [80, 90, 40, 60, 30],
      backgroundColor: "#10b981"
    }]
  },
  options: { scales: { y: { beginAtZero: true, max: 100 } } }
});
