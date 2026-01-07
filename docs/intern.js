const navLinks=document.querySelectorAll(".nav");
const pages=document.querySelectorAll(".page");

// Display welcome message
document.addEventListener('DOMContentLoaded', () => {
    const internName = localStorage.getItem('name');
    const welcomeMessageElement = document.getElementById('welcome-message');
    if (internName && welcomeMessageElement) {
        welcomeMessageElement.textContent = `Welcome ${internName} 👋`;
    }
});

navLinks.forEach(link=>{
 link.onclick=()=>{
  navLinks.forEach(l=>l.classList.remove("active"));
  link.classList.add("active");
  pages.forEach(p=>p.classList.remove("show"));
  document.getElementById(link.dataset.target).classList.add("show");

  if (link.dataset.target === 'internships') {
    loadInternships();
  }
 };
});

// Logout functionality
const logoutLink = document.getElementById('logout-link');
logoutLink.addEventListener('click', logoutUser);

function logoutUser() {
    // Remove token from local storage
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    // Redirect to login page
    window.location.href = 'index.html';
}

// Internship functionality
async function loadInternships() {
    const internshipList = document.querySelector('.internship-list');
    internshipList.innerHTML = 'Loading internships...';

    try {
        const response = await fetch('/internships'); // Assuming /internships is the endpoint
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const internships = await response.json();

        internshipList.innerHTML = ''; // Clear loading message
        if (internships.length === 0) {
            internshipList.innerHTML = '<p>No internships available at the moment.</p>';
            return;
        }

        internships.forEach(internship => {
            const internshipCard = `
                <div class="card pastel-blue">
                    <h3>${internship.intern_name}</h3>
                    <p>Mentor: ${internship.mentor_name}</p>
                    <p>Duration: ${internship.duration}</p>
                </div>
            `;
            internshipList.innerHTML += internshipCard;
        });

    } catch (error) {
        console.error('Error fetching internships:', error);
        internshipList.innerHTML = '<p>Failed to load internships. Please try again later.</p>';
    }
}

new Chart(dash1,{type:"line",data:{labels:[1,2,3,4],datasets:[{data:[2,3,5,6],borderColor:"#6366f1",tension:.4}]},options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
new Chart(dash2,{type:"bar",data:{labels:["M","T","W","T","F"],datasets:[{data:[5,4,4,3,4],backgroundColor:"#8b5cf6"}]},options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
new Chart(dash3,{type:"doughnut",data:{datasets:[{data:[72,28],backgroundColor:["#22c55e","#e5e7eb"],cutout:"70%"}]},options:{plugins:{legend:{display:false}}}});
new Chart(weeklyChart,{type:"line",data:{labels:["Week 1","Week 2","Week 3","Week 4"],datasets:[{data:[60,72,85,90],fill:true,backgroundColor:"rgba(99,102,241,.2)",borderColor:"#6366f1",tension:.4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100}}}});
