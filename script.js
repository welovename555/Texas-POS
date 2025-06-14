// Import the Supabase client library
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- CONNECTION TO SUPABASE ---
const SUPABASE_URL = 'https://vqmrdpewlxmodpsibkff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXJkcGV3bHhtb2Rwc2lia2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODg1NjUsImV4cCI6MjA2NTQ2NDU2NX0.jTKLkppvZGpGCrmQRezbOZEfpSL4c5Cp8CBRphuBgWg';

// Create a single Supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- TEST CONNECTION ---
console.log('Supabase Initialized:', supabase);

async function testConnection() {
    let { data: products, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error connecting to Supabase:', error.message);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับฐานข้อมูล! โปรดตรวจสอบ Console F12');
    } else {
        console.log('Successfully connected to Supabase! Found products:', products);
        alert('เชื่อมต่อฐานข้อมูลสำเร็จ!');
    }
}

testConnection();
