import { createClient } from '@supabase/supabase-js';

// Reemplazarás estos valores con los de tu proyecto de Supabase más adelante
const supabaseUrl = 'https://nfncjospnhgjatutqydv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbmNqb3NwbmhnamF0dXRxeWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MjQ4MzcsImV4cCI6MjEwMDUwMDgzN30.AR75_1pc8EVWgxnNV85l8mfune6knWAmGxxiZfz69C8';

export const supabase = createClient(supabaseUrl, supabaseKey);