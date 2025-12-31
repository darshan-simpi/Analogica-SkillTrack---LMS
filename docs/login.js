const courseList = document.getElementById("courseList");

/* ================= DEFAULT COURSES (READ ONLY) ================= */
const DEFAULT_COURSES = [
  { name: "Full Stack Web Development", date: "15 Jan 2026" },
  { name: "AI & Machine Learning", date: "22 Jan 2026" },
  { name: "Flutter App Development", date: "01 Feb 2026" },
  { name: "Python for Data Science", date: "10 Feb 2026" }
];

/* ================= LOAD COURSES ================= */
function renderCourses() {
  let courses = JSON.parse(localStorage.getItem("courses"));

  // ✅ If no courses in storage, use defaults
  if (!courses || courses.length === 0) {
    courses = DEFAULT_COURSES;
    localStorage.setItem("courses", JSON.stringify(courses));
  }

  courseList.innerHTML = "";

  courses.forEach(course => {
    const div = document.createElement("div");
    div.className = "course-card";
    div.innerHTML = `
      <h4>${course.name}</h4>
      <p>Starts: ${course.date}</p>
    `;
    courseList.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", renderCourses);

/* ================= LOGIN ================= */
function login() {
  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!role) {
    document.getElementById("error").innerText = "Please select a role";
    return;
  }

  const API_BASE = "https://analogica-skilltrack-api.onrender.com";

  fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token && data.role === role) {

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);

      if (role === "ADMIN") location.href = "admin.html";
      else if (role === "STUDENT") location.href = "student.html";
      else if (role === "TRAINER") location.href = "trainer.html";
      else if (role === "INTERN") location.href = "intern.html";

    } else {
      document.getElementById("error").innerText =
        "Invalid role or credentials";
    }
  })
  .catch(() => {
    document.getElementById("error").innerText =
      "Server not reachable. Please try again later.";
  });
}
