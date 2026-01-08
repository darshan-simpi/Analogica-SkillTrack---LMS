const API = "http://127.0.0.1:5000/api";
const token = localStorage.getItem("token");

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

/* ================= CARDS ================= */
function updateCards() {
  document.getElementById("total").innerHTML = students.length;
  document.getElementById("onTrack").innerHTML = students.filter(s => s.status === "On Track").length;
  document.getElementById("behind").innerHTML = students.filter(s => s.status === "Behind").length;

  const avg = Math.round(students.reduce((a, b) => a + b.progress, 0) / students.length);
  document.getElementById("avg").innerHTML = avg + "%";
}

/* ================= COURSE CARDS ================= */
async function renderCourses() {
  const res = await fetch(`${API}/trainer/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const courses = await res.json();
  const container = document.getElementById("courseCards");
  container.innerHTML = "";

  courses.forEach(c => {
    container.innerHTML += `
      <div class="course-card">
        <h3>${c.course_name}</h3>
        <p>${c.students} students</p>
        <button onclick="assignTask(${c.course_id})">Assign Task</button>
      </div>
    `;
  });
}

/* ================= ASSIGN TASK ================= */
async function assignTask(courseId) {
  const title = prompt("Enter assignment title");
  const due = prompt("Enter due date (YYYY-MM-DD)");

  if (!title || !due) return;

  await fetch(`${API}/trainer/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      course_id: courseId,
      title: title,
      due_date: due
    })
  });

  alert("Assignment assigned successfully ✅");
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