import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://vqmrdpewlxmodpsibkff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXJkcGV3bHhtb2Rwc2lia2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODg1NjUsImV4cCI6MjA2NTQ2NDU2NX0.jTKLkppvZGpGCrmQRezbOZEfpSL4c5Cp8CBRphuBgWg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM ELEMENTS ---
const employeeIdInput = document.getElementById('employee-id-input');
const loginButton = document.getElementById('login-button');

// --- EVENT LISTENERS ---
loginButton.addEventListener('click', handleLogin);

// --- FUNCTIONS ---
async function handleLogin() {
    const employeeId = employeeIdInput.value;

    // Check if input is empty
    if (!employeeId) {
        alert('กรุณาป้อนรหัสพนักงาน');
        return;
    }

    // Check the employee ID in the database
    let { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single(); // .single() gets one record, or null if not found

    if (error && error.code !== 'PGRST116') { // PGRST116 means "not found", which is not a real error for us
        console.error('Login Error:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } else if (employee) {
        // Employee found
        console.log('Login successful for:', employee);
        alert(`เข้าระบบสำเร็จ! ยินดีต้อนรับ, ${employee.name} (ระดับ: ${employee.role})`);
        // Here we will later add code to show the main app
    } else {
        // Employee not found
        console.log('Login failed for ID:', employeeId);
        alert('รหัสพนักงานไม่ถูกต้อง');
    }
}
