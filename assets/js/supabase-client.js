// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; 
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.error("Supabase URL and Anon Key are not configured. Please update assets/js/supabase-client.js");
    alert("ยังไม่ได้ตั้งค่า Supabase! กรุณาตรวจสอบไฟล์ supabase-client.js");
}

const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);