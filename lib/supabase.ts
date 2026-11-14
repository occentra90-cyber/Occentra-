import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Browser-safe Supabase client. Keep row-level security enabled on all
 * customer data tables. Never use a secret or service-role key here.
 */
export function getSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase public environment variables are not configured.');
  }
  return createClient(supabaseUrl, supabasePublishableKey);
}
