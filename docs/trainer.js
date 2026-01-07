/* ================= TRAINER NAME ================= */
window.addEventListener("DOMContentLoaded", () => {

  // Get trainer name saved during login
  const name = localStorage.getItem("name") || "Trainer";

  const welcomeEl = document.getElementById("welcome");

  if (welcomeEl) {
    welcomeEl.innerHTML = `Welcome ${name}`;
  }
});

/* ================= LOGOUT ================= */
document.querySelector(".logout").onclick = () => {
  localStorage.clear();
  window.location.href = "index.html";
};

/* ================= STUDENTS ================= */
const students = [
  { name: "John", course: "Web Development", progress: 70, status: "On Track", task: "", submitted: false, feedback: "" },
  { name: "Jane", course: "Data Science", progress: 85, status: "On Track", task: "", submitted: false, feedback: "" },
  { name: "Mike", course: "Web Development", progress: 40, status: "Behind", task: "", submitted: false, feedback: "" },
  { name: "Sarah", course: "Machine Learning", progress: 65, status: "On Track", task: "", submitted: false, feedback: "" },
  { name: "David", course: "Data Science", progress: 30, status: "Behind", task: "", submitted: false, feedback: "" }
];

/* ================= CARDS ================= */
function updateCards() {
  document.getElementById("total").innerHTML = students.length;
  document.getElementById("onTrack").innerHTML = students.filter(s => s.status === "On Track").length;
  document.getElementById("behind").innerHTML = students.filter(s => s.status === "Behind").length;

  const avg = Math.round(students.reduce((a, b) => a + b.progress, 0) / students.length);
  document.getElementById("avg").innerHTML = avg + "%";
}

/* ================= COURSE CARDS ================= */
const courseCards = document.getElementById("courseCards");
const uniqueCourses = [...new Set(students.map(s => s.course))];

function renderCourses() {
  courseCards.innerHTML = "";
  uniqueCourses.forEach(course => {
    const count = students.filter(s => s.course === course).length;

    courseCards.innerHTML += `
      <div class="course-card">
        <h3>${course}</h3>
        <p>${count} students</p>

        <button onclick="assignTask('${course}')">Assign Task</button>
        <button onclick="manage('${course}')">Manage Students</button>
      </div>`;
  });
}

/* ================= ASSIGN TASK ================= */
function assignTask(course) {
  const task = prompt("Enter assignment for " + course);
  if (!task) return;

  students.forEach(s => {
    if (s.course === course) {
      s.task = task;
      s.submitted = false;
    }
  });

  alert("Task assigned ✔");
}

/* ================= MODAL ================= */
function openModal(html) {
  const m = document.getElementById("modal");
  m.classList.remove("hidden");
  m.innerHTML = `
    <div class="modal-box">
      ${html}
      <button onclick="closeModal()">Close</button>
    </div>`;
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

/* ================= MANAGE STUDENTS ================= */
function manage(course) {
  const list = students.filter(s => s.course === course);
  let html = `<h3>${course} Students</h3>`;

  list.forEach(s => {
    html += `
      <p>
        <b>${s.name}</b><br>
        Task: ${s.task || "Not assigned"}<br>
        Submitted: ${s.submitted ? "Yes" : "No"}<br>
        Status: ${s.status}<br>
        Feedback: ${s.feedback || "None"}<br>

        <button onclick="mark('${s.name}','On Track')">Mark On-Track</button>
        <button onclick="mark('${s.name}','Behind')">Mark Behind</button>
        <button onclick="feedback('${s.name}')">Give Feedback</button>
        <button onclick="submit('${s.name}')">Mark Submitted</button>
      </p><hr>`;
  });

  openModal(html);
}

/* ================= ACTIONS ================= */
function mark(name, status) {
  const s = students.find(x => x.name === name);
  s.status = status;
  updateCards();
  updateStatusChart();
}

function feedback(name) {
  const s = students.find(x => x.name === name);
  const f = prompt("Enter feedback");
  if (f) s.feedback = f;
}

function submit(name) {
  const s = students.find(x => x.name === name);
  s.submitted = true;
}

/* ================= CHARTS ================= */
Chart.defaults.maintainAspectRatio = false;

let statusChart = new Chart(document.getElementById("statusChart"), {
  type: "pie",
  data: {
    labels: ["On Track", "Behind"],
    datasets: [{
      data: [
        students.filter(s => s.status === "On Track").length,
        students.filter(s => s.status === "Behind").length
      ],
      backgroundColor: ["#16a34a", "#dc2626"]
    }]
  }
});

function updateStatusChart() {
  statusChart.data.datasets[0].data = [
    students.filter(s => s.status === "On Track").length,
    students.filter(s => s.status === "Behind").length
  ];
  statusChart.update();
}

new Chart(document.getElementById("completionChart"), {
  type: "bar",
  data: {
    labels: ["Web Dev", "Data Science", "ML"],
    datasets: [{ data: [75, 60, 55], backgroundColor: "#2563eb" }]
  }
});

new Chart(document.getElementById("assignmentChart"), {
  type: "bar",
  data: {
    labels: ["Web Dev", "Data Science", "ML"],
    datasets: [{ data: [80, 65, 50], backgroundColor: "#10b981" }]
  }
});

/* ================= INIT ================= */
renderCourses();
updateCards();