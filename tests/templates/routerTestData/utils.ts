export const createMockEntrypoint = (
	file = 'unknown'
): Promise<EdgeFunction> => {
	return Promise.resolve({
		default: (request: Request) => {
			const params = Array.from(new URL(request.url).searchParams.entries());

			return Promise.resolve(
				new Response(JSON.stringify({ file, params }), { status: 200 })
			);
		},
	});
};

type Asset = { data: string; type: string };
export class MockAssetFetcher {
	private assets: Record<string, Asset>;

	constructor(assets: Record<string, Asset> = {}) {
		this.assets = assets;
	}

	public fetch = (req: Request) => {
		const { pathname } = new URL(req.url);

		const asset = this.assets[pathname];
		if (!asset) {
			throw new Error(`Asset not found: ${pathname}`);
		}

		return Promise.resolve(
			new Response(asset.data, {
				status: 200,
				headers: { 'content-type': asset.type },
			})
		);
	};
}
