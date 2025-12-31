const courseList = document.getElementById("courseList");

/* ================= LOAD COURSES (READ ONLY) ================= */
function renderCourses() {
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  courseList.innerHTML = "";

  if (courses.length === 0) {
    courseList.innerHTML = "<p>No upcoming courses</p>";
    return;
  }

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

  fetch("http://127.0.0.1:5000/api/auth/login", {
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
  });
}
