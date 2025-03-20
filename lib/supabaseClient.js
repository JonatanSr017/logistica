import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ezbrfwboctduqnjdeljb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6YnJmd2JvY3RkdXFuamRlbGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5MDYzOTMsImV4cCI6MjAyMDQ4MjM5M30.lVmlHtXt37iLKWAj4YtrCRjGgPbdZB6T5ylhJO9w-xI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
