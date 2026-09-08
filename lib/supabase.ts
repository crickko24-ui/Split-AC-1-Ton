import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btuefaookejloyoezjyr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dWVmYW9va2VqbG95b2V6anlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTA5MzksImV4cCI6MjEwNDQyNjkzOX0.F7tg8Nk11UQr4isRQDGD4q0LQqYsksOSmJsUQsJAGzU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
