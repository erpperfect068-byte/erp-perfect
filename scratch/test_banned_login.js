const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBannedUserLogin() {
  console.log("Attempting sign in with banned test user...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test_banned_user@test.com',
    password: 'TestPassword123!'
  });

  console.log("\n=== SUPABASE AUTH BANNED ERROR OBJECT ===");
  console.log("Error instance:", error);
  if (error) {
    console.log("error.name:", error.name);
    console.log("error.message:", error.message);
    console.log("error.status:", error.status);
    console.log("error.code:", error.code);
    console.log("JSON.stringify(error):", JSON.stringify(error, null, 2));
  } else {
    console.log("No error returned, data:", data);
  }
}

testBannedUserLogin();
