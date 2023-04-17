import { parse } from 'cookie';
import { findMatchingRoute } from './matcher';
import { applyHeaders, applyStatusCode } from './response';

export const router = (
	{ routes }: ProcessedVercelConfig,
	output: VercelBuildOutput,
	assets: Fetcher,
	ctx: ExecutionContext
) => {
	let cookies: Record<string, string> = {};

	let responseStatus: number | undefined = undefined;
	let responseHeaders: Record<string, string> = {};
	responseStatus = 0;
	responseHeaders = {};

	const findPath = (path: string): VercelBuildOutputItem | undefined => {
		return output[path];
	};

	const serveItem = async (
		item: VercelBuildOutputItem,
		path: string,
		req: Request
	): Promise<Response> => {
		let resp: Response | undefined = undefined;

		switch (item?.type) {
			case 'static':
				resp = await assets.fetch(path);
				break;
			case 'override':
				resp = await assets.fetch(
					// TODO: search params
					new Request(new URL(item.path ?? path, req.url).toString(), req)
				);
				applyHeaders(resp, { 'content-type': item.contentType });
				break;
			case 'function': {
				resp = await (await item.entrypoint).default(req, ctx);
				break;
			}
		}

		if (responseHeaders) applyHeaders(resp, responseHeaders);
		if (responseStatus) resp = applyStatusCode(resp, responseStatus);

		return resp;
	};

	const match = async (req: Request): Promise<Response> => {
		const { pathname, searchParams } = new URL(req.url);
		cookies = parse(req.headers.get('cookie') || '');

		let finalMatch: VercelSource | undefined = undefined;
		let foundItem: VercelBuildOutputItem | undefined = undefined;

		if (!foundItem) {
			responseStatus = 404;
			finalMatch = findMatchingRoute(routes.error, {
				req,
				cookies,
				requiredStatus: 404,
			});
			foundItem = finalMatch ? findPath(finalMatch.dest) : undefined;
		}

		return foundItem
			? await serveItem(foundItem, pathname, req)
			: new Response('Not Found', { status: 404 });
	};

	return {
		match,
	};
};
