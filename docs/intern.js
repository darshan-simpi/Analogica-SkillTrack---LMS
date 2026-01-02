const navLinks=document.querySelectorAll(".nav");
const pages=document.querySelectorAll(".page");

navLinks.forEach(link=>{
 link.onclick=()=>{
  navLinks.forEach(l=>l.classList.remove("active"));
  link.classList.add("active");
  pages.forEach(p=>p.classList.remove("show"));
  document.getElementById(link.dataset.target).classList.add("show");
 };
});

new Chart(dash1,{type:"line",data:{labels:[1,2,3,4],datasets:[{data:[2,3,5,6],borderColor:"#6366f1",tension:.4}]},options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
new Chart(dash2,{type:"bar",data:{labels:["M","T","W","T","F"],datasets:[{data:[5,4,4,3,4],backgroundColor:"#8b5cf6"}]},options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
new Chart(dash3,{type:"doughnut",data:{datasets:[{data:[72,28],backgroundColor:["#22c55e","#e5e7eb"],cutout:"70%"}]},options:{plugins:{legend:{display:false}}}});
new Chart(weeklyChart,{type:"line",data:{labels:["Week 1","Week 2","Week 3","Week 4"],datasets:[{data:[60,72,85,90],fill:true,backgroundColor:"rgba(99,102,241,.2)",borderColor:"#6366f1",tension:.4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100}}}});
