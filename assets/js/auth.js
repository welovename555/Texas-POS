document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const employeeCodeInput = document.getElementById('employee-code');
    const errorMessage = document.getElementById('error-message');
    const loginButton = loginForm.querySelector('button[type="submit"]');

    // If already logged in, redirect to pos.html
    if (localStorage.getItem('currentEmployee')) {
        window.location.href = 'pos.html';
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const employeeId = employeeCodeInput.value;
        if (!employeeId) return;

        loginButton.disabled = true;
        loginButton.textContent = 'กำลังตรวจสอบ...';
        errorMessage.textContent = '';

        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('id', employeeId)
                .single();

            if (error || !data) {
                throw new Error('ไม่พบรหัสพนักงานนี้ในระบบ');
            }

            // Store employee data in localStorage to act as a session
            localStorage.setItem('currentEmployee', JSON.stringify(data));
            
            // Redirect to the main POS page
            window.location.href = 'pos.html';

        } catch (error) {
            console.error('Login error:', error.message);
            errorMessage.textContent = error.message;
            loginButton.disabled = false;
            loginButton.textContent = 'เข้าสู่ระบบ';
        }
    });
});