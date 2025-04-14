document.getElementById('upload-profile-picture-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('profile-picture-upload');
    const formData = new FormData();
    formData.append('profilePicture', fileInput.files[0]);
    
    try {
        const response = await fetch('/upload-profile-picture', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        // Handle response
    } catch (error) {
        console.error('Upload error:', error);
    }
});