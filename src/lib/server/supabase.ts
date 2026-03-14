import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

// Service-role client — server-side only, never expose to the browser.
// SUPABASE_URL and SUPABASE_SERVICE_KEY are only set in production (Vercel env vars).
export function getSupabase() {
	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
		throw new Error('Supabase env vars not set — are you running locally?');
	}
	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
		auth: { persistSession: false }
	});
}
