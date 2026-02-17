import { createClient } from "@supabase/supabase-js";
import { config } from "@/config";
import { EnvironmentError } from "@/v1/res/errors";

function init() {
	const url = config.supabase.url;
	const key = config.supabase.key;

	if (!url || !key) {
		throw new EnvironmentError("SUPABASE_URL o SUPABASE_KEY");
	}

	return createClient(url, key);
}

const supabaseClient = init();

export { supabaseClient as supabase };
