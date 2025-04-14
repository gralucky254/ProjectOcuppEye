document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const errorMessage = document.getElementById("error-message");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!username || !password) {
                return showError("Username and password are required.");
            }

            // Clear previous errors
            showError("");

            try {
                // Show loading indicator (Optional)

                const response = await fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",  // Ensures cookies (JWT) are sent & received
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Invalid credentials.");
                }
                if (!response.ok) {
                    console.warn("Authentication failed. Redirecting to login...");
                    window.location.href = "login.html";
                }
                

                console.log("Login successful:", data);

                // Redirect user after successful login
                window.location.href = "index.html";
            } catch (error) {
                console.error("Login Error:", error);
                showError(error.message || "Server error, please try again.");
            } finally {
                // Restore button state
                loginForm.querySelector("button").textContent = "Login";
                loginForm.querySelector("button").disabled = false;
            }
        });
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = message ? "block" : "none";
        }
    }
});
