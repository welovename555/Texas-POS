// login.js

const SUPABASE_URL = 'https://vqmrdpewlxmodpsibkff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ใส่ตัวเต็มตามที่คุณมี

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.textContent = '';

  const employeeId = parseInt(document.getElementById('employee-id').value);

  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role')
    .eq('id', employeeId)
    .single();

  if (error || !data) {
    errorMessage.textContent = 'รหัสพนักงานไม่ถูกต้อง';
    return;
  }

  // เก็บข้อมูลลง LocalStorage
  localStorage.setItem('employee_id', data.id);
  localStorage.setItem('employee_name', data.name);
  localStorage.setItem('employee_role', data.role);

  // ไปหน้า index.html
  window.location.href = 'index.html';
});
