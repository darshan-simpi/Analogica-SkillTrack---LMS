// 🔑 Get token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

const msg = document.getElementById("message");

if (!token) {
  msg.style.color = "red";
  msg.innerText = "Invalid or missing reset token";
}

// 👁 Toggle password visibility
function togglePassword() {
  const p1 = document.getElementById("newPassword");
  const p2 = document.getElementById("confirmPassword");

  const type = p1.type === "password" ? "text" : "password";
  p1.type = type;
  p2.type = type;
}

// 🔐 Reset password
function resetPassword() {
  const password = document.getElementById("newPassword").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!password || !confirm) {
    msg.style.color = "red";
    msg.innerText = "Please fill all fields";
    return;
  }

  if (password !== confirm) {
    msg.style.color = "red";
    msg.innerText = "Passwords do not match";
    return;
  }

  fetch("http://127.0.0.1:5005/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token: token,
      password: password
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log("RESET RESPONSE:", data); // 🔥 DEBUG

      if (data.message) {
        msg.style.color = "green";
        msg.innerText = "Password reset successful. Redirecting to login...";

        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);
      } else {
        msg.style.color = "red";
        msg.innerText = data.error || "Reset failed";
      }
    })
    .catch(err => {
      console.error(err);
      msg.style.color = "red";
      msg.innerText = "Server error. Try again later.";
    });
}
