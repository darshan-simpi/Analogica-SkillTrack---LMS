const BASE_URL = "http://127.0.0.1:5005";
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

  const data = await res.json();
  const courses = data.courses || [];
  const internships = data.internships || [];

  // Update Courses
  const courseContainer = document.getElementById("trainerCourses");
  courseContainer.innerHTML = "";
  document.getElementById("totalCourses").innerText = courses.length;
  document.getElementById("totalStudents").innerText = courses.reduce((a, b) => a + b.students, 0);

  courses.forEach(c => {
    courseContainer.innerHTML += `
      <div class="course-card">
        <h3>${c.course_name}</h3>
        <p>${c.students} Students</p>
        <p>${c.duration}</p>
        <button onclick="openCourse(${c.course_id}, '${c.course_name}')">Manage Course</button>
      </div>
    `;
  });

  // Update Internships
  const internContainer = document.getElementById("trainerInternships");
  internContainer.innerHTML = "";
  document.getElementById("totalInternships").innerText = internships.length;
  // (Total Interns calculation depends on logic, but for now we set it)
  document.getElementById("totalInterns").innerText = internships.length;

  internships.forEach(i => {
    internContainer.innerHTML += `
      <div class="course-card">
        <h3>${i.intern_name}</h3>
        <p>Internship</p>
        <p>${i.duration}</p>
        <button onclick="openInternship(${i.internship_id}, '${i.intern_name}')">Manage Internship</button>
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
  loadQuizzes();
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
  if (tab === 'quizzes') {
    loadQuizzes();
  }
}

/* ================= QUIZZES ================= */
let questionCount = 0;

function addQuestionUI() {
  questionCount++;
  const container = document.getElementById("questionList");
  const div = document.createElement("div");
  div.className = "question-item";
  div.id = `question-${questionCount}`;
  div.innerHTML = `
    <hr>
    <div style="display:flex; justify-content:space-between">
      <h4>Question ${questionCount}</h4>
      <button onclick="removeQuestionUI(${questionCount})" style="background:red; padding:2px 5px">X</button>
    </div>
    <textarea placeholder="Enter Question Text" class="q-text" style="width:100%"></textarea>
    <div class="options-grid">
      <input placeholder="Option A" class="q-a">
      <input placeholder="Option B" class="q-b">
      <input placeholder="Option C" class="q-c">
      <input placeholder="Option D" class="q-d">
    </div>
    <select class="q-correct">
      <option value="">Select Correct Answer</option>
      <option value="A">A</option>
      <option value="B">B</option>
      <option value="C">C</option>
      <option value="D">D</option>
    </select>
  `;
  container.appendChild(div);
}

function removeQuestionUI(id) {
  document.getElementById(`question-${id}`).remove();
}

async function createQuiz() {
  const title = document.getElementById("quizTitle").value;
  const deadline = document.getElementById("quizDeadline").value;

  if (!title || !deadline) return alert("Title and Deadline are required");

  const questionElements = document.querySelectorAll(".question-item");
  const questions = [];

  questionElements.forEach(el => {
    questions.push({
      text: el.querySelector(".q-text").value,
      option_a: el.querySelector(".q-a").value,
      option_b: el.querySelector(".q-b").value,
      option_c: el.querySelector(".q-c").value,
      option_d: el.querySelector(".q-d").value,
      correct_answer: el.querySelector(".q-correct").value
    });
  });

  if (questions.length === 0) return alert("Add at least one question");

  const res = await fetch(`${API}/trainer/quiz/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      course_id: selectedCourseId,
      title,
      deadline,
      questions
    })
  });

  if (res.ok) {
    alert("Quiz Assigned!");
    document.getElementById("quizTitle").value = "";
    document.getElementById("quizDeadline").value = "";
    document.getElementById("questionList").innerHTML = "";
    questionCount = 0;
    loadQuizzes();
  } else {
    const data = await res.json();
    alert(data.error || "Failed to assign quiz");
  }
}

async function loadQuizzes() {
  const res = await fetch(`${API}/trainer/course/${selectedCourseId}/quizzes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const table = document.getElementById("quizTable");
  table.innerHTML = "";

  data.forEach(q => {
    table.innerHTML += `
      <tr>
        <td>Week ${q.week_number}: <b>${q.title}</b></td>
        <td>${q.week_number}</td>
        <td>${q.deadline}</td>
        <td>${q.question_count} Qs</td>
        <td>
          <button class="btn-small" onclick="viewQuizResults(${q.id})">Results</button>
          <button class="btn-small" style="background:red" onclick="deleteQuiz(${q.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

async function deleteQuiz(id) {
  if (!confirm("Are you sure?")) return;
  await fetch(`${API}/trainer/quiz/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadQuizzes();
}

async function viewQuizResults(id) {
  const res = await fetch(`${API}/trainer/quiz/${id}/results`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  let msg = "Quiz Results:\n\n";
  if (data.length === 0) msg += "No submissions yet.";
  else {
    data.forEach(r => {
      msg += `${r.student_name}: ${r.score}/${r.total} (${r.submitted_at})\n`;
    });
  }
  alert(msg);
}
/* ================= INTERNSHIPS ================= */
/* ================= INTERNSHIPS ================= */
let selectedInternshipId = null;
let editingTaskId = null;
let filterTaskId = null; // ✅ Global filter state

function openInternship(id, name) {
  selectedInternshipId = id;
  showSection("manageInternship");
  document.getElementById("internshipTitle").innerText = "Internship: " + name;
  switchInternTab('internshipTasks'); // Default tab
}

function switchInternTab(tabId) {
  document.querySelectorAll("#manageInternship .tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll("#manageInternship .tab").forEach(t => t.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  // Highlight active tab button logic (simple matching)
  const buttons = document.querySelectorAll("#manageInternship .tab");
  if (tabId === 'internshipTasks') buttons[0].classList.add("active");
  if (tabId === 'internshipSubmissions') {
    buttons[1].classList.add("active");
    loadInternshipSubmissions();
  } else {
    filterTaskId = null; // ✅ Reset filter when leaving Submissions tab
  }

  if (tabId === 'internshipResources') {
    buttons[2].classList.add("active");
    loadInternshipResources();
  }

  if (tabId === 'internshipTasks') loadInternshipTasks();
}

async function createInternTask() {
  const title = internTaskTitle.value;
  const due = internTaskDue.value;

  if (!title) return alert("Title is required");

  if (editingTaskId) {
    await fetch(`${API}/trainer/task/${editingTaskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, due_date: due })
    });
    alert("Task updated successfully");
  } else {
    const res = await fetch(`${API}/trainer/internship/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        internship_id: selectedInternshipId,
        title,
        due_date: due
      })
    });

    const data = await res.json();
    if (!res.ok) {
      // Handle database errors specifically if needed
      alert(data.error || "Failed to create task");
      return;
    }
    alert("Task assigned successfully");
  }

  cancelInternTaskEdit();
  loadInternshipTasks();
}

async function loadInternshipTasks() {
  const res = await fetch(`${API}/trainer/internship/${selectedInternshipId}/tasks`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return; // Fail silently or show empty

  const data = await res.json();
  const container = document.getElementById("internTaskTable");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<tr><td colspan='3'>No tasks yet</td></tr>";
    return;
  }

  data.forEach(t => {
    const safeTitle = (t.title || "").replace(/'/g, "\\'");
    container.innerHTML += `
      <tr>
        <td>Week ${t.week_number}: <b>${t.title}</b></td>
        <td>${t.due_date || "No Date"}</td>
        <td>
           <button onclick="editInternTask(${t.id}, '${safeTitle}', '${t.due_date}')" class="btn-small">Edit</button>
           <button onclick="deleteInternTask(${t.id})" class="btn-small">Delete</button>
           <button onclick="filterInternSubmissions(${t.id})" class="btn-small">Submissions</button>
        </td>
      </tr>
    `;
  });
}

function filterInternSubmissions(taskId) {
  filterTaskId = taskId;
  switchInternTab('internshipSubmissions');
}

function editInternTask(id, title, due) {
  editingTaskId = id;
  document.getElementById("internTaskTitle").value = title;
  document.getElementById("internTaskDue").value = due && due !== 'null' ? due : "";
  document.getElementById("saveInternTaskBtn").innerText = "Update Task";
  document.getElementById("cancelInternTaskEditBtn").style.display = "inline-block";
}

function cancelInternTaskEdit() {
  editingTaskId = null;
  document.getElementById("internTaskTitle").value = "";
  document.getElementById("internTaskDue").value = "";
  document.getElementById("saveInternTaskBtn").innerText = "Save Task";
  document.getElementById("cancelInternTaskEditBtn").style.display = "none";
}

async function deleteInternTask(id) {
  if (!confirm("Are you sure?")) return;
  await fetch(`${API}/trainer/task/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadInternshipTasks();
}

/* ================= INTERNSHIP SUBMISSIONS ================= */
async function loadInternshipSubmissions() {
  const res = await fetch(`${API}/trainer/internship/${selectedInternshipId}/submissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const container = document.getElementById("internSubmissionTable");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<tr><td colspan='6'>No submissions yet</td></tr>";
    return;
  }

  // ✅ Client-side filtering
  const filteredData = filterTaskId
    ? data.filter(s => s.task_id === filterTaskId)
    : data; // Show all if no filter

  if (filterTaskId && filteredData.length === 0) {
    container.innerHTML = "<tr><td colspan='6'>No submissions for this task</td></tr>";
    return;
  }

  filteredData.forEach(s => {
    container.innerHTML += `
      <tr>
        <td>${s.student_name}</td>
        <td>${s.task_title}</td>
        <td><a href="${API}/${s.file_url}" target="_blank">View File</a></td>
        <td><input value="${s.grade || ''}" id="grade-${s.submission_id}" style="width:50px"></td>
        <td><input value="${s.feedback || ''}" id="feed-${s.submission_id}"></td>
        <td>
          <span class="tag" style="background:${s.status === 'Completed' ? 'green' : (s.status === 'Rejected' ? 'red' : 'orange')}">${s.status}</span>
        </td>
        <td>
          <button class="btn-small" style="background:#22c55e" onclick="updateInternSubmission(${s.submission_id}, 'Completed')">Accept</button>
          <button class="btn-small" style="background:#ef4444" onclick="updateInternSubmission(${s.submission_id}, 'Rejected')">Reject</button>
          <button class="btn-small" onclick="updateInternSubmission(${s.submission_id}, 'Graded')">Save Grade</button>
        </td>
      </tr>
    `;
  });
}

async function updateInternSubmission(id, status = null) {
  const grade = document.getElementById(`grade-${id}`).value;
  const feedback = document.getElementById(`feed-${id}`).value;

  const payload = { submission_id: id, grade, feedback };
  if (status) payload.status = status;

  await fetch(`${API}/trainer/task_submission/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  alert("Submission Updated: " + (status || "Saved"));
  loadInternshipSubmissions(); // Refresh list to show new status
}

/* ================= INTERNSHIP RESOURCES ================= */
async function loadInternshipResources() {
  const res = await fetch(`${API}/trainer/internship/${selectedInternshipId}/resources`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const container = document.getElementById("internResourceTable");
  container.innerHTML = "";

  data.forEach(r => {
    container.innerHTML += `
          <tr>
              <td><a href="${API}/${r.url}" target="_blank">${r.title}</a></td>
              <td>${r.type}</td>
              <td><button onclick="deleteInternResource(${r.id})" class="btn-small" style="background:red">Delete</button></td>
          </tr>
      `;
  });
}

async function addInternResource() {
  const fileInput = document.getElementById("internResourceFile");
  const title = document.getElementById("internResourceTitle").value;

  if (!fileInput.files[0] || !title) return alert("File and Title required");

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("title", title);

  await fetch(`${API}/trainer/internship/${selectedInternshipId}/resource/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  alert("Resource Uploaded");
  document.getElementById("internResourceTitle").value = "";
  fileInput.value = "";
  loadInternshipResources();
}

async function deleteInternResource(id) {
  if (!confirm("Delete this resource?")) return;
  await fetch(`${API}/trainer/internship/resource/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadInternshipResources();
}


function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}