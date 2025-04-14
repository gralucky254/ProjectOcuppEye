document.getElementById('register-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    // Get form values
    const fullName = document.getElementById('full-name').value;
    const phoneNumber = document.getElementById('phone-number').value;
    const email = document.getElementById('email').value;
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    try {
        const response = await fetch('http://localhost:3000/register', {  // ✅ Corrected path
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, phoneNumber, email, username, password, confirmPassword })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('register-success-message').style.display = 'block';
            document.getElementById('register-error-message').style.display = 'none';

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            document.getElementById('register-error-message').textContent = data.message;
            document.getElementById('register-error-message').style.display = 'block';
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('register-error-message').textContent = "Registration failed. Please try again.";
        document.getElementById('register-error-message').style.display = 'block';
    }
});
