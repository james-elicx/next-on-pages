export const applyHeaders = (
	resp: Response,
	headers: Record<string, string>
) => {
	for (const [key, value] of Object.entries(headers)) {
		resp.headers.set(key, value);
	}
};

export const applyStatusCode = (resp: Response, status: number) => {
	return new Response(resp.body, { ...resp, status });
};
