import type { MatchPCREResult } from './pcre';
import { applyPCREMatches, matchPCRE } from './pcre';

type HasFieldProps = {
	url: URL;
	cookies: Record<string, string>;
	headers: Headers;
};

/**
 * Check if a Vercel source route's `has` record conditions match a request.
 *
 * @param has The `has` record conditions to check against the request.
 * @param param.url The URL object.
 * @param param.cookies The cookies object.
 * @param param.headers The headers object.
 * @returns Whether the request matches the `has` record conditions.
 */
export const hasField = (
	has: NonNullable<VercelSource['has']>[0],
	{ url, cookies, headers }: HasFieldProps
): boolean => {
	switch (has.type) {
		case 'host': {
			return url.hostname === has.value;
		}
		case 'header': {
			if (has.value !== undefined) {
				return !!headers.get(has.key)?.match(has.value);
			}

			return headers.has(has.key);
		}
		case 'cookie': {
			const cookie = cookies[has.key];

			if (has.value !== undefined) {
				return !!cookie?.match(has.value);
			}

			return cookie !== undefined;
		}
		case 'query': {
			if (has.value !== undefined) {
				return !!url.searchParams.get(has.key)?.match(has.value);
			}

			return url.searchParams.has(has.key);
		}
	}
};
type FindMatchingRouteProps = {
	req: Request;
	cookies: Record<string, string>;
	requiredStatus?: number;
};

type CheckRouteMatchProps = {
	url: URL;
	cookies: Record<string, string>;
	headers: Headers;
	method: string;
	requiredStatus?: number;
};

const checkRouteMatch = (
	route: VercelSource,
	currentPath: string,
	{ url, cookies, headers, method, requiredStatus }: CheckRouteMatchProps
): MatchPCREResult | undefined => {
	const srcMatch = matchPCRE(route.src, currentPath, route.caseSensitive);
	if (!srcMatch.match) return undefined;

	// One of the HTTP `methods` conditions must be met - skip if not met.
	if (route.methods && !route.methods.includes(method)) {
		return undefined;
	}

	// All `has` conditions must be met - skip if one is not met.
	if (route.has?.find(has => !hasField(has, { url, cookies, headers }))) {
		return undefined;
	}

	// All `missing` conditions must not be met - skip if one is met.
	if (route.missing?.find(has => hasField(has, { url, cookies, headers }))) {
		return undefined;
	}

	// Required status code must match (i.e. for error routes) - skip if not met.
	if (requiredStatus && route.status !== requiredStatus) {
		return undefined;
	}

	return srcMatch;
};

export const findMatchingRoute = (
	routeSet: VercelSource[],
	{ req, cookies, requiredStatus }: FindMatchingRouteProps
): VercelSource | undefined => {
	const url = new URL(req.url);
	const headers = req.headers;

	let currentPath = url.pathname || '/';
	let finalStatus: number | undefined;
	let finalHeaders = new Headers();

	for (const route of routeSet) {
		const { match, captureGroupKeys = [] } =
			checkRouteMatch(route, currentPath, {
				url,
				cookies,
				headers,
				method: req.method,
				requiredStatus,
			}) ?? {};
		if (!match) continue;

		// If this route overrides, replace the response headers and status.
		if (route.override) {
			finalStatus = undefined;
			finalHeaders = new Headers();
		}

		// Update final headers with the ones from this route.
		if (route.headers) {
			for (const [key, value] of Object.entries(route.headers)) {
				finalHeaders.set(
					key.toLowerCase(),
					applyPCREMatches(value, match, captureGroupKeys)
				);
			}
		}

		// Update the status code if this route has one.
		if (route.status) {
			finalStatus = route.status;
		}

		// Update the path with the new destination. Fallback to the current path.
		currentPath = route.dest
			? applyPCREMatches(route.dest, match, captureGroupKeys)
			: currentPath;

		// If we found a match and shouldn't continue finding matches, break out of the loop.
		if (!route.continue) {
			break;
		}
	}

	return undefined;
};
