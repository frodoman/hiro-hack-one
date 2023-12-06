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
    name: "keys-07-buy: Ensure that keys supply is updated after buying.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;
        let wallet_1 = accounts.get("wallet_1")!.address;

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
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], deployer),
           Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(300)], wallet_1),
        ]);

        // call get supply function
        const funCallAfter = chain.callReadOnlyFn(
            'keys',
            'get-keys-supply',
            [types.principal(deployer)],
            deployer
        );
        funCallAfter.result.expectUint(500)
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
        const funCallBefore = chain.callReadOnlyFn('keys', readFunName, [], deployer );
        funCallBefore.result.expectUint(200)

        // update the fee
        chain.mineBlock([
           Tx.contractCall('keys', 'set-protocol-fee-percent', [types.uint(500)], deployer)
        ]);

        // call get-price function
        const funCallAfter = chain.callReadOnlyFn('keys',readFunName,[], deployer);
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

        // verify
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

        // verify
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

        // balance after buying
        const balanceAfter = chain.getAssetsMaps().assets["STX"][deployer];

        assertNotEquals(balanceAfter, balanceBefore);
        assertEquals(balanceAfter - balanceBefore, 200);
    },
});

Clarinet.test({
    name: "keys-12-sell: Ensure that tx-sender's STX balance is updated correctly after selling a key.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;
        let wallet_1 = accounts.get("wallet_1")!.address;
        const sellAmount = types.uint(100);
        const protocolFee = 200

        // buy some keys 
        chain.mineBlock([
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(500)], deployer), 
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(200)], wallet_1), 
        ]);

        // wallet_1's balance before selling
        const balanceBefore = chain.getAssetsMaps().assets["STX"][wallet_1];

        // check the selling price 
        const funCall = chain.callReadOnlyFn('keys','get-sell-price',[types.principal(deployer), sellAmount],deployer);
        const sellPrice = funCall.result;

        // sell some keys 
        chain.mineBlock([
           Tx.contractCall('keys', 'sell-keys', [types.principal(deployer), types.uint(100)], wallet_1), 
        ]);

        // balance after selling
        const balanceAfter = chain.getAssetsMaps().assets["STX"][wallet_1];

        assertNotEquals(balanceAfter, balanceBefore);
        assertEquals(types.uint(balanceAfter - balanceBefore + protocolFee), sellPrice);
    },
});


Clarinet.test({
    name: "keys-13-sell: Ensure that supply is updated correctly after selling.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        const deployer = accounts.get("deployer")!.address;
        let wallet_1 = accounts.get("wallet_1")!.address;

        // buy some keys 
        const block1 = chain.mineBlock([
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(300)], deployer), 
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(100)], wallet_1), 
        ]);
        block1.receipts[0].result.expectOk()

        // sell some keys 
        const block2 = chain.mineBlock([
           Tx.contractCall('keys', 'sell-keys', [types.principal(deployer), types.uint(100)], wallet_1),
        ]);
        block2.receipts[0].result.expectOk()

        // get supply 
        const funCall = chain.callReadOnlyFn('keys', 'get-keys-supply', [types.principal(deployer)], deployer);
        console.log("Supply after selling: ", funCall.result);
        assertEquals(funCall.result, types.uint(300));
    },
});

Clarinet.test({
    name: "keys-14-sell: Ensure that keys balance is updated correctly after selling.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        const deployer = accounts.get("deployer")!.address;
        const deployerPrincipal = types.principal(deployer);
        let wallet_1 = accounts.get("wallet_1")!.address;

        // buy some keys 
        const block1 = chain.mineBlock([
            Tx.contractCall('keys', 'buy-keys', [deployerPrincipal, types.uint(300)], deployer), 
            Tx.contractCall('keys', 'buy-keys', [deployerPrincipal, types.uint(200)], wallet_1), 
        ]);
        block1.receipts[0].result.expectOk()

        // sell some keys 
        const block2 = chain.mineBlock([
           Tx.contractCall('keys', 'sell-keys', [deployerPrincipal, types.uint(100)], wallet_1),
        ]);
        block2.receipts[0].result.expectOk();

        const funCall = chain.callReadOnlyFn(
            'keys', 
            'get-keys-balance', 
            [deployerPrincipal, types.principal(wallet_1)], 
            wallet_1);
            
        assertEquals(funCall.result, types.uint(100));
        
    },
});

Clarinet.test({
    name: "keys-15-sell: Ensure that selling more than in the balance is not allowed.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        let deployer = accounts.get("deployer")!.address;
        let wallet_1 = accounts.get("wallet_1")!.address;
        const buyAmount = types.uint(200);
        const sellAmount = types.uint(210);

        // buy some keys 
        chain.mineBlock([
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), types.uint(500)], deployer), 
            Tx.contractCall('keys', 'buy-keys', [types.principal(deployer), buyAmount], wallet_1), 
        ]);

        // sell some keys 
        const block = chain.mineBlock([
           Tx.contractCall('keys', 'sell-keys', [types.principal(deployer), sellAmount], wallet_1), 
        ]);

        // balance after selling
        block.receipts[0].result.expectErr().expectUint(3);
    },
});

Clarinet.test({
    name: "keys-16-sell: Ensure that selling is not allowed if no supply.",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // deployer address
        const deployer = accounts.get("deployer")!.address;
        const deployerPrincipal = types.principal(deployer);
        let wallet_1 = accounts.get("wallet_1")!.address;

        // buy some keys 
        const block1 = chain.mineBlock([
            Tx.contractCall('keys', 'buy-keys', [deployerPrincipal, types.uint(300)], deployer), 
            Tx.contractCall('keys', 'buy-keys', [deployerPrincipal, types.uint(100)], wallet_1), 
        ]);
        block1.receipts[0].result.expectOk()

        // sell some keys 
        const block2 = chain.mineBlock([
           Tx.contractCall('keys', 'sell-keys', [deployerPrincipal, types.uint(300)], deployer),
           Tx.contractCall('keys', 'sell-keys', [deployerPrincipal, types.uint(100)], wallet_1),
        ]);
        block2.receipts[0].result.expectErr().expectUint(1);
    },
});

