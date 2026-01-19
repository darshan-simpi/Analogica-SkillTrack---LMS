const API_BASE = "http://127.0.0.1:5005"; // change to Render URL later
const courseList = document.getElementById("courseList");

async function renderCourses() {
  if (!courseList) return;

  courseList.innerHTML = "Loading courses...";

  try {
    const res = await fetch(`${API_BASE}/api/courses`);
    const courses = await res.json();

    courseList.innerHTML = "";

    if (!courses.length) {
      courseList.innerHTML = "<p>No upcoming courses</p>";
      return;
    }

    courses.forEach((course, index) => {
      const div = document.createElement("div");
      div.className = "course-card";
      div.style.animationDelay = `${index * 0.1}s`;
      div.innerHTML = `
        <h4>${course.name}</h4>
        <p>Starts: ${course.date}</p>
      `;
      courseList.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    courseList.innerHTML = "<p style='color:red'>Failed to load courses</p>";
  }
}

document.addEventListener("DOMContentLoaded", renderCourses);


/* ================= LOGIN ================= */
function login() {
  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  error.innerText = "";

  if (!role || !email || !password) {
    error.innerText = "Please fill all fields";
    return;
  }

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
        error.innerText = "Invalid credentials or role mismatch";
      }
    })
    .catch(() => {
      error.innerText = "Server not reachable. Try again later.";
    });
}

/* ================= REGISTER ================= */
/* ================= REGISTER ================= */
function openRegister() {
  document.getElementById("registerModal").style.display = "flex";
  populateOptions();
}

function closeRegister() {
  document.getElementById("registerModal").style.display = "none";
}

function toggleRoleFields() {
  const role = document.getElementById("regRole").value;
  document.getElementById("studentFields").style.display = role === "STUDENT" ? "block" : "none";
  document.getElementById("internFields").style.display = role === "INTERN" ? "block" : "none";
}

async function populateOptions() {
  // Populate Courses
  try {
    const res = await fetch(`${API_BASE}/api/courses`);
    const courses = await res.json();
    const courseSelect = document.getElementById("regCourse");
    courseSelect.innerHTML = '<option value="">Select Course</option>';
    courses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.innerText = c.name + " (" + c.date + ")";
      courseSelect.appendChild(opt);
    });
  } catch(e) { console.error("Error loading courses", e); }

  // Populate Internships
  try {
    const res = await fetch(`${API_BASE}/api/internships`);
    const internships = await res.json();
    const internSelect = document.getElementById("regInternship");
    internSelect.innerHTML = '<option value="">Select Internship</option>';
    internships.forEach(i => {
      const opt = document.createElement("option");
      opt.value = i.id;
      opt.innerText = i.intern_name + " (" + i.duration + ")";
      internSelect.appendChild(opt);
    });
  } catch(e) { console.error("Error loading internships", e); }
}

function register() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;

  let extraData = {};
  if (role === "STUDENT") {
    const courseId = document.getElementById("regCourse").value;
    if (!courseId) { alert("Please select a course"); return; }
    extraData.course_id = courseId;
  } else if (role === "INTERN") {
    const internshipId = document.getElementById("regInternship").value;
    if (!internshipId) { alert("Please select an internship"); return; }
    extraData.internship_id = internshipId;
  }

  if (!name || !email || !password || !role) {
    alert("Please fill all fields");
    return;
  }

  fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role, ...extraData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        alert("Registration successful. Please login.");
        closeRegister();
      } else {
        alert(data.error || "Registration failed");
      }
    })
    .catch(() => alert("Server error"));
}

/* ================= FORGOT PASSWORD ================= */
function openForgot() {
  document.getElementById("forgotModal").style.display = "flex";
}

function closeForgot() {
  document.getElementById("forgotModal").style.display = "none";
}

function sendResetLink() {
  const email = document.getElementById("fpEmail").value;

  if (!email) {
    alert("Please enter email");
    return;
  }

  fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        alert("Reset link sent to your email");
        closeForgot();
      } else if (data.error === "Email not registered") {
        alert("You are not registered. Please register first.");
        closeForgot();
        openRegister();
      } else {
        alert(data.error || "Something went wrong with your request");
      }
    })
    .catch(() => alert("Server error"));
}