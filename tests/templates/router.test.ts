import { describe, expect, suite, test } from 'vitest';
import { router } from '../../templates/_worker.js/utils/router';
import {
	vercelBuildOutput as withoutBasePathOutput,
	vercelConfig as withoutBasePathConfig,
	assetsFetcher as withoutBasePathAssetsFetcher,
} from './routerTestData/withoutBasePath';

type TestCase = {
	name: string;
	paths: string[];
	headers?: Record<string, string>;
	expected: {
		status: number;
		data: string;
		headers?: Record<string, string>;
	};
};

const testCases: TestCase[] = [
	{
		name: '`/` + `/index` returns the `/index` page',
		paths: ['/', '/index'],
		expected: {
			status: 200,
			data: JSON.stringify({ file: 'index', data: { params: [] } }),
			headers: { 'x-matched-path': '/' },
		},
	},
	{
		name: '`/_next/data/.../index.json` with `x-nextjs-data` header returns the `/index` page',
		paths: ['/_next/data/iJgI1dhNzKWmpXhfhPItf/index.json'],
		headers: { 'x-nextjs-data': 'true' },
		expected: {
			status: 200,
			data: JSON.stringify({ file: 'index', data: { params: [] } }),
			headers: { 'x-matched-path': '/' },
		},
	},
	{
		name: 'invalid route + `/404` returns the 404 error page',
		paths: ['/invalid-route', '/404', '/not-found/test'],
		expected: {
			status: 404,
			data: '<html>404</html>',
			headers: {
				'x-matched-path': '/404',
				'content-type': 'text/html; charset=utf-8',
			},
		},
	},
	{
		name: '`/500` returns the 500 error page',
		paths: ['/500'],
		expected: {
			status: 500,
			data: '<html>500</html>',
			headers: {
				'x-matched-path': '/500',
				'content-type': 'text/html; charset=utf-8',
			},
		},
	},
];

suite.skip('router', () => {
	describe('without base path', () => {
		const routes = router(
			withoutBasePathConfig,
			withoutBasePathOutput,
			withoutBasePathAssetsFetcher,
			{} as ExecutionContext
		);

		testCases.forEach(testCase => {
			test(testCase.name, async () => {
				const { paths, headers, expected } = testCase;

				const urls = paths.map(p => `http://localhost${p}`);
				for (const url of urls) {
					const res = await routes.match(new Request(url, { headers }));

					expect(res.status).toEqual(expected.status);
					await expect(res.text()).resolves.toEqual(expected.data);
					expect(Object.entries(res.headers)).toEqual(expected.headers || {});
				}
			});
		});
	});
});
