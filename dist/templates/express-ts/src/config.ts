const {
	API_URL,
	SECRETS_ENDPOINT,
	SECRET_KEY,
	DATABASE_URL,
	BASIC_AUTH_USER,
	BASIC_AUTH_PWD,
	REDIS_URL,
	SUPABASE_URL,
	SUPABASE_KEY,
	MP_PUBLIC_KEY,
	MP_ACCESS_TOKEN,
} = process.env;

export const config = {
	port: 3001,
	api_url: API_URL,
	secret: SECRET_KEY,
	secrets_endpoint: SECRETS_ENDPOINT,
	db: {
		url: DATABASE_URL,
	},
	supabase: {
		url: SUPABASE_URL,
		key: SUPABASE_KEY,
	},
	basicAuth: {
		user: BASIC_AUTH_USER,
		pwd: BASIC_AUTH_PWD,
	},
	redis: {
		url: REDIS_URL,
	},
	mercado_pago: {
		public_key: MP_PUBLIC_KEY,
		access_token: MP_ACCESS_TOKEN,
	},
};
