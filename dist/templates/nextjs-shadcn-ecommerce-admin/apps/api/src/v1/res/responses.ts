export interface ApiResponseOk {
	message: string;
	data: unknown;
}

export interface ApiResponseError {
	message: string;
	data: null;
}

export const createApiResponse = {
	err: (message?: string): ApiResponseError => {
		return {
			message: message ?? "",
			data: null,
		};
	},

	ok: (data: unknown, message?: string): ApiResponseOk => {
		return {
			message: message ?? "",
			data,
		};
	},
};
