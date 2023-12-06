import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.6/index.ts';
import { assertEquals, assertNotEquals, assertStringIncludes } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "keys-01: Ensure that deployer is not key holder after deployment.",
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
    name: "keys-02: Ensure that logic to calculate price is correct.",
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
    name: "keys-03-buy: Ensure that deployer can buy keys for himself.",
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
    name: "keys-04-buy: Ensure that others can not buy keys before deployer buys.",
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

Clarinet.test({
    name: "keys-05-buy: Ensure that amount is bigger than 0 for buying keys",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!.address;

        // act: perform actions related to the current test
        let block = chain.mineBlock([
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(0)], deployer)
        ]);

        const result = block.receipts[0].result;
        result.expectErr().expectUint(0);
    },
});

Clarinet.test({
    name: "keys-06-buy: Ensure that balance is updated after buying a key.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;

        chain.mineEmptyBlockUntil(1)

        // call get-price function
        const funCallBefore = chain.callReadOnlyFn(
            'keys',
            'get-keys-balance',
            [types.principal(deployer), types.principal(deployer)],
            deployer
        );
        //balance should be u0 before buying
        funCallBefore.result.expectUint(0)

        // buy some keys 
        chain.mineBlock([
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], deployer)
        ]);

        // call get-price function
        const funCallAfter = chain.callReadOnlyFn(
            'keys',
            'get-keys-balance',
            [types.principal(deployer), types.principal(deployer)],
            deployer
        );
        funCallAfter.result.expectUint(200)
    },
});

Clarinet.test({
    name: "keys-07-buy: Ensure that kyes supply is updated after buying.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;

        chain.mineEmptyBlockUntil(1)

        // call get-price function
        const funCallBefore = chain.callReadOnlyFn(
            'keys',
            'get-keys-supply',
            [types.principal(deployer)],
            deployer
        );
        //balance should be u0 before buying
        funCallBefore.result.expectUint(0)

        // buy some keys 
        chain.mineBlock([
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], deployer)
        ]);

        // call get-price function
        const funCallAfter = chain.callReadOnlyFn(
            'keys',
            'get-keys-supply',
            [types.principal(deployer)],
            deployer
        );
        funCallAfter.result.expectUint(200)
    },
});

Clarinet.test({
    name: "keys-08-fee: Ensure that protocol fee can be updated.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;
        const readFunName = 'get-protocol-fee-percent'

        chain.mineEmptyBlockUntil(1)

        // fee should be u200 by default
        const funCallBefore = chain.callReadOnlyFn(
            'keys',
            readFunName,
            [],
            deployer
        );
        funCallBefore.result.expectUint(200)

        // update the fee
        chain.mineBlock([
           Tx.contractCall('keys', 'set-protocol-fee-percent', [types.uint(500)], deployer)
        ]);

        // call get-price function
        const funCallAfter = chain.callReadOnlyFn(
            'keys',
            readFunName,
            [],
            deployer
        );
        funCallAfter.result.expectUint(500)
    },
});

Clarinet.test({
    name: "keys-09-fee: Ensure that only the deployer can update protocol fee.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let wallet_1 = accounts.get("wallet_1")!.address;

        // update the fee
        const block = chain.mineBlock([
           Tx.contractCall('keys', 'set-protocol-fee-percent', [types.uint(500)], wallet_1)
        ]);

        // call get-price function
        const result = block.receipts[0].result;
        result.expectErr().expectUint(4)
    },
});


Clarinet.test({
    name: "keys-10-fee: Ensure that protocol fee can not be set to u0.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;

        // update the fee
        const block = chain.mineBlock([
           Tx.contractCall('keys', 'set-protocol-fee-percent', [types.uint(0)], deployer)
        ]);

        // call get-price function
        const result = block.receipts[0].result;
        result.expectErr().expectUint(5)
    },
});

Clarinet.test({
    name: "keys-11-fee: Ensure that deployer receive the fee after another user buying a key.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;
        let wallet_1 = accounts.get("wallet_1")!.address;

        chain.mineBlock([
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], deployer), 
        ]);

        // deployer balance before wallet_1 buys a key
        const balanceBefore = chain.getAssetsMaps().assets["STX"][deployer];

        // buy some keys 
        chain.mineBlock([
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(300)], wallet_1), 
        ]);

        // call get-price function
        const balanceAfter = chain.getAssetsMaps().assets["STX"][deployer];

        assertNotEquals(balanceAfter, balanceBefore);
        assertEquals(balanceAfter - balanceBefore, 200);
    },
});

