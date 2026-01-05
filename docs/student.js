const API = "http://127.0.0.1:5000";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "STUDENT") {
  window.location.href = "login.html";
}

document.getElementById("studentName").innerText =
  localStorage.getItem("name") || "Student";

async function loadCourses() {
  try {
    const res = await fetch(`${API}/api/courses`);
    const courses = await res.json();

    document.getElementById("courseCount").innerText = courses.length;
    renderCourses(courses);
    renderProgress(courses);
  } catch (err) {
    console.error(err);
  }
}

function renderCourses(courses) {
  const list = document.getElementById("courseList");
  list.innerHTML = "";

  courses.forEach(c => {
    list.innerHTML += `
      <div class="box course-card">
        <h3>${c.name}</h3>
        <p>Start Date: ${c.date}</p>
      </div>
    `;
  });
}

function renderProgress(courses) {
  const table = document.getElementById("progressTable");
  table.innerHTML = "";

  courses.forEach(c => {
    const progress = 70; // demo-safe fixed value
    table.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${progress}%</td>
        <td>${progress >= 50 ? "On Track" : "Behind"}</td>
      </tr>
    `;
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", loadCourses);
