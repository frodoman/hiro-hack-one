import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.6/index.ts';
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "keys-001: Ensure that deployer is not key holder after deployment.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer wallet address
        let deployer = accounts.get("deployer")!.address;
        let deployerParams = types.principal(deployer)

        // act: perform actions related to the current test
        chain.mineBlock([
        ]);

        
        const funCall = chain.callReadOnlyFn(
            'keys',
            'is-keyholder',
            [deployerParams, deployerParams],
            deployer
        );

        const result = funCall.result;
        result.expectBool(false);
    },
});

Clarinet.test({
    name: "keys-002: Ensure that logic to calculate price is correct.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer wallet address
        let deployer = accounts.get("deployer")!.address;

        // act: perform actions related to the current test
        chain.mineBlock([

        ]);
        // call get-price function
        const funCall = chain.callReadOnlyFn(
            'keys',
            'get-price',
            [types.uint(0), types.uint(200)],
            deployer
        );

        const result = funCall.result;
        result.expectUint(80010);
    },
});

Clarinet.test({
    name: "keys-003: Ensure that deployer can buy keys for himself.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!.address;

        // act: perform actions related to the current test
        let block = chain.mineBlock([
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], deployer)
        ]);

        // ensure function call is ok
        const result = block.receipts[0].result;
        result.expectOk().expectBool(true);

        // ensure contract has got the STX
        const assetsMaps = chain.getAssetsMaps()
        const contractBalance = assetsMaps.assets["STX"][`${deployer}.keys`]
        assertEquals(contractBalance, 80010)
    },
});


Clarinet.test({
    name: "keys-003: Ensure that others can not buy keys before deployer buys.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!.address;
        let wallet_1 = accounts.get("wallet_1")!.address;

        // act: perform actions related to the current test
        let block = chain.mineBlock([
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], wallet_1)
        ]);

        const result = block.receipts[0].result;
        result.expectErr().expectUint(1);
    },
});

