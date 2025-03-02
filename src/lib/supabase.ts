import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhycggnqfxcfpykyyktb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoeWNnZ25xZnhjZnB5a3l5a3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4Nzc2NDcsImV4cCI6MjA1NjQ1MzY0N30.u-_jBxOlV1lbkou6VryrWAwTZbC4LRn3aAdHFtORMgE';

export const supabase = createClient(supabaseUrl, supabaseKey);