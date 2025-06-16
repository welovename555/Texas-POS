// assets/js/supabase-client.js (เวอร์ชันสมบูรณ์)

const SUPABASE_URL = 'https://nmlcduawkcaaglcdlhgv.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGNkdWF3a2NhYWdsY2RsaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM3MDUsImV4cCI6MjA2NTUwOTcwNX0.1NnKZ0begtYSPF7mjDip0lYoR7w1_4qHu5aeDWLWVJY';

// โค้ดส่วนที่เหลือเหมือนเดิม ไม่ต้องแก้ไข
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase URL and Anon Key are not configured.");
    alert("ยังไม่ได้ตั้งค่า Supabase!");
}

const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
