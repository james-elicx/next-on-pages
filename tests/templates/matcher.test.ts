import { describe, test, expect } from 'vitest';
import { hasField, findMatchingRoute } from '../../templates/_worker.js/utils';
import { parse } from 'cookie';

type HasFieldTestCase = {
	name: string;
	has: VercelHasFields[0];
	expected: boolean;
};
const hasFieldTestCases: HasFieldTestCase[] = [
	{
		name: 'host: valid host returns true',
		has: { type: 'host', value: 'test.com' },
		expected: true,
	},
	{
		name: 'host: invalid host returns false',
		has: { type: 'host', value: 'test2.com' },
		expected: false,
	},
	{
		name: 'header: has with key+value match returns true',
		has: { type: 'header', key: 'headerWithValue', value: 'value' },
		expected: true,
	},
	{
		name: 'header: has with key+value mismatch returns false',
		has: { type: 'header', key: 'headerWithValue', value: 'value2' },
		expected: false,
	},
	{
		name: 'header: has with key match returns true',
		has: { type: 'header', key: 'headerWithoutValue' },
		expected: true,
	},
	{
		name: 'cookie: has with key+value match returns true',
		has: { type: 'cookie', key: 'foo', value: 'bar' },
		expected: true,
	},
	{
		name: 'cookie: has with key+value mismatch returns false',
		has: { type: 'cookie', key: 'foo', value: 'bar2' },
		expected: false,
	},
	{
		name: 'cookie: has with key match returns true',
		has: { type: 'cookie', key: 'bar' },
		expected: true,
	},
	{
		name: 'query: has with key+value match returns true',
		has: { type: 'query', key: 'foo', value: 'bar' },
		expected: true,
	},
	{
		name: 'query: has with key+value mismatch returns false',
		has: { type: 'query', key: 'foo', value: 'bar2' },
		expected: false,
	},
	{
		name: 'query: has with key match returns true',
		has: { type: 'query', key: 'bar' },
		expected: true,
	},
];

describe('hasField', () => {
	const req = new Request('https://test.com/index?foo=bar&bar=', {
		headers: {
			headerWithValue: 'value',
			headerWithoutValue: undefined as unknown as string,
			cookie: 'foo=bar; bar=',
		},
	});
	const url = new URL(req.url);
	const cookies = parse(req.headers.get('cookie') ?? '');

	hasFieldTestCases.forEach(testCase => {
		test(testCase.name, () => {
			const result = hasField(testCase.has, {
				url,
				cookies,
				headers: req.headers,
			});
			expect(result).toEqual(testCase.expected);
		});
	});
});

describe('findMatchingRoute', () => {});
