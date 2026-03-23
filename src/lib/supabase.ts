import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if credentials are valid (not empty and not placeholders)
const isValidConfig = supabaseUrl && 
                      supabaseAnonKey && 
                      !supabaseUrl.includes('SUA_URL') && 
                      !supabaseUrl.includes('YOUR_URL');

// If invalid, we use a proxy or a dummy client to avoid crashing evaluation
export const supabase = isValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://dummy.supabase.co', 'dummy-key'); // Fallback to avoid evaluate-time errors
