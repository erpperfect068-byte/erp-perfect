const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eGVxc2Z1eXZpc2ZrcXhkYXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTI0NjMsImV4cCI6MjEwNTgyODQ2M30.aXcDykVvTjH6Wnxd0b9BDJXLZWGt0CkF_oe5NYoYVJE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupAndTestBannedUser() {
  const email = `bannedtest${Date.now()}@gmail.com`;
  const password = 'TestPassword123!';

  console.log("1. Signing up test user:", email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error("SignUp error:", signUpError);
    return;
  }

  const userId = signUpData.user ? signUpData.user.id : null;
  console.log("2. Created User ID:", userId);
  console.log("USER_EMAIL:", email);
}

setupAndTestBannedUser();
