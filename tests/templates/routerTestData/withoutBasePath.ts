import { MockAssetFetcher, createMockEntrypoint } from './utils';

export const assetsFetcher = new MockAssetFetcher({
	'/404.html': { data: '<html>404</html>', type: 'text/html' },
	'/500.html': { data: '<html>500</html>', type: 'text/html' },
	'/favicon/favicon-16x16.png': {
		data: 'favicon 16x16 png',
		type: 'image/png',
	},
	'/grid.svg': { data: '<svg><path /></svg>', type: 'image/svg+xml' },
	'/_next/static/chunks/app/not-found/[categorySlug]/page-8c70b576d0ac4d2c.js':
		{
			data: '// not-found/[categorySlug]/page',
			type: 'application/javascript',
		},
	'/_next/static/chunks/app/route-groups/(marketing)/blog/page-5e83de55ff919a3f.js':
		{
			data: '// /route-groups/(marketing)/blog',
			type: 'application/javascript',
		},
	'/__next_data_catchall.json': {
		data: JSON.stringify({}),
		type: 'application/json; charset=utf-8',
	},
});

export const vercelBuildOutput: VercelBuildOutput = {
	'/404.html': {
		type: 'override',
		path: '/404.html',
		contentType: 'text/html; charset=utf-8',
	},
	'/500.html': {
		type: 'override',
		path: '/500.html',
		contentType: 'text/html; charset=utf-8',
	},
	'/favicon/favicon-16x16.png': { type: 'static' },
	'/grid.svg': { type: 'static' },
	'/_next/static/chunks/app/not-found/[categorySlug]/page-8c70b576d0ac4d2c.js':
		{ type: 'static' },
	'/_next/static/chunks/app/route-groups/(marketing)/blog/page-5e83de55ff919a3f.js':
		{ type: 'static' },
	'/__next_data_catchall.json': {
		type: 'override',
		path: '/__next_data_catchall.json',
		contentType: 'application/json',
	},
	'/index': {
		type: 'function',
		entrypoint: createMockEntrypoint('/index'),
		matchers: [{ regexp: '^/$' }],
	},
	'/': {
		type: 'function',
		entrypoint: createMockEntrypoint('/index'),
		matchers: [{ regexp: '^/$' }],
	},
	'/not-found/[categorySlug]': {
		type: 'function',
		entrypoint: createMockEntrypoint('/not-found/[categorySlug]'),
		matchers: [
			{
				regexp: '^/not\\-found/(?<categorySlug>[^/]+?)$',
			},
		],
	},
	'/route-groups/blog': {
		type: 'function',
		entrypoint: createMockEntrypoint('/route-groups/blog'),
		matchers: [
			{
				regexp: '^/route\\-groups/blog$',
			},
		],
	},
	'/404': {
		type: 'override',
		path: '/404.html',
		contentType: 'text/html; charset=utf-8',
	},
	'/500': {
		type: 'override',
		path: '/500.html',
		contentType: 'text/html; charset=utf-8',
	},
	'/__next_data_catchall': {
		type: 'override',
		path: '/__next_data_catchall.json',
		contentType: 'application/json',
	},
	middleware: {
		type: 'middleware',
		entrypoint: createMockEntrypoint('middleware'),
		matchers: [
			{
				regexp:
					'^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/about-middleware(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(.json)?[\\/#\\?]?$',
			},
		],
	},
};

export const vercelConfig: ProcessedVercelConfig = {
	version: 3,
	routes: {
		none: [
			{
				src: '^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$',
				headers: { Location: '/$1' },
				status: 308,
				continue: true,
			},
			{
				src: '/_next/__private/trace',
				dest: '/404',
				status: 404,
				continue: true,
			},
			{
				src: '/404/?',
				status: 404,
				continue: true,
				missing: [{ type: 'header', key: 'x-prerender-revalidate' }],
			},
			{ src: '/500', status: 500, continue: true },
			{
				src: '^\\/about-middleware(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?[\\/#\\?]?$',
				middlewarePath: 'middleware',
				continue: true,
				override: true,
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/(.*).json',
				dest: '/$1',
				override: true,
				continue: true,
				has: [{ type: 'header', key: 'x-nextjs-data' }],
			},
			{
				src: '^/index(?:/)?',
				has: [{ type: 'header', key: 'x-nextjs-data' }],
				dest: '/',
				override: true,
				continue: true,
			},
			{
				src: '^(?!/_next)/about(?:/)?$',
				headers: { Location: '/' },
				status: 308,
			},
			{
				continue: true,
				src: '^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/about-middleware(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(.json)?[\\/#\\?]?$',
				missing: [
					{
						type: 'header',
						key: 'x-prerender-revalidate',
						value: '968b9e58128b8dcc2ddeda8a996ae834',
					},
				],
				middlewarePath: 'middleware',
				override: true,
			},
			{
				src: '^/some-page(?:/)?$',
				dest: '/somewhere-else?overrideMe=$overrideMe',
				has: [{ type: 'query', key: 'overrideMe' }],
				continue: true,
				override: true,
			},
			{
				src: '^/$',
				has: [{ type: 'header', key: 'x-nextjs-data' }],
				dest: '/_next/data/iJgI1dhNzKWmpXhfhPItf/index.json',
				continue: true,
				override: true,
			},
			{
				src: '^/((?!_next/)(?:.*[^/]|.*))/?$',
				has: [{ type: 'header', key: 'x-nextjs-data' }],
				dest: '/_next/data/iJgI1dhNzKWmpXhfhPItf/$1.json',
				continue: true,
				override: true,
			},
			{
				src: '^/',
				has: [{ type: 'header', key: 'rsc' }],
				dest: '/index.rsc',
				headers: { vary: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch' },
				continue: true,
				override: true,
			},
			{
				src: '^/((?!.+\\.rsc).+?)(?:/)?$',
				has: [{ type: 'header', key: 'rsc' }],
				dest: '/$1.rsc',
				headers: { vary: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch' },
				continue: true,
				override: true,
			},
		],
		filesystem: [
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/(.*).json',
				dest: '/$1',
				continue: true,
				has: [{ type: 'header', key: 'x-nextjs-data' }],
			},
			{
				src: '^/index(?:/)?',
				has: [{ type: 'header', key: 'x-nextjs-data' }],
				dest: '/',
				continue: true,
			},
			{ src: '^/non-existent(?:/)?$', dest: '/somewhere-else', check: true },
		],
		miss: [
			{
				src: '/_next/static/(?:[^/]+/pages|pages|chunks|runtime|css|image|media)/.+',
				status: 404,
				check: true,
				dest: '$0',
			},
		],
		rewrite: [
			{
				src: '^/$',
				has: [{ type: 'header', key: 'x-nextjs-data' }],
				dest: '/_next/data/iJgI1dhNzKWmpXhfhPItf/index.json',
				continue: true,
			},
			{
				src: '^/((?!_next/)(?:.*[^/]|.*))/?$',
				has: [{ type: 'header', key: 'x-nextjs-data' }],
				dest: '/_next/data/iJgI1dhNzKWmpXhfhPItf/$1.json',
				continue: true,
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/not\\-found/(?<categorySlug>[^/]+?)(?:\\.rsc)(?:/)?.json$',
				dest: '/not-found/[categorySlug].rsc?categorySlug=$categorySlug',
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/not\\-found/(?<categorySlug>[^/]+?)(?:/)?.json$',
				dest: '/not-found/[categorySlug]?categorySlug=$categorySlug',
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/route\\-groups/(?<categorySlug>[^/]+?)(?:\\.rsc)(?:/)?.json$',
				dest: '/route-groups/[categorySlug].rsc?categorySlug=$categorySlug',
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/route\\-groups/(?<categorySlug>[^/]+?)(?:/)?.json$',
				dest: '/route-groups/[categorySlug]?categorySlug=$categorySlug',
			},
			{
				src: '^/not\\-found/(?<categorySlug>[^/]+?)(?:\\.rsc)(?:/)?$',
				dest: '/not-found/[categorySlug].rsc?categorySlug=$categorySlug',
			},
			{
				src: '^/not\\-found/(?<categorySlug>[^/]+?)(?:/)?$',
				dest: '/not-found/[categorySlug]?categorySlug=$categorySlug',
			},
			{
				src: '^/route\\-groups/(?<categorySlug>[^/]+?)(?:\\.rsc)(?:/)?$',
				dest: '/route-groups/[categorySlug].rsc?categorySlug=$categorySlug',
			},
			{
				src: '^/route\\-groups/(?<categorySlug>[^/]+?)(?:/)?$',
				dest: '/route-groups/[categorySlug]?categorySlug=$categorySlug',
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/(.*).json',
				headers: { 'x-nextjs-matched-path': '/$1' },
				continue: true,
				override: true,
			},
			{
				src: '^/_next/data/iJgI1dhNzKWmpXhfhPItf/(.*).json',
				dest: '__next_data_catchall',
			},
		],
		resource: [
			{
				src: '^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
				dest: 'https://my-old-site.com/$1',
				check: true,
			},
			{ src: '/.*', status: 404 },
		],
		hit: [
			{
				src: '/_next/static/(?:[^/]+/pages|pages|chunks|runtime|css|image|media|iJgI1dhNzKWmpXhfhPItf)/.+',
				headers: { 'cache-control': 'public,max-age=31536000,immutable' },
				continue: true,
				important: true,
			},
			{
				src: '/index',
				headers: { 'x-matched-path': '/' },
				continue: true,
				important: true,
			},
			{
				src: '/((?!index$).*)',
				headers: { 'x-matched-path': '/$1' },
				continue: true,
				important: true,
			},
		],
		error: [
			{ src: '/.*', dest: '/404', status: 404 },
			{ src: '/.*', dest: '/500', status: 500 },
		],
	},
	overrides: {
		'404.html': { path: '404', contentType: 'text/html; charset=utf-8' },
		'500.html': { path: '500', contentType: 'text/html; charset=utf-8' },
		'__next_data_catchall.json': {
			path: '__next_data_catchall',
			contentType: 'application/json',
		},
	},
};
