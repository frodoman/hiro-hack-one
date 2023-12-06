import React, { ReactElement, useState } from 'react';
import { StacksDevnet } from '@stacks/network';
import {
  callReadOnlyFunction,
  makeStandardSTXPostCondition,
  makeContractCall,
  getAddressFromPublicKey,
  uintCV,
  cvToValue,
  principalCV
} from '@stacks/transactions';
import {
  AppConfig,
  FinishedAuthData,
  showConnect,
  UserSession,
  openSignatureRequestPopup
} from '@stacks/connect';
import { verifyMessageSignatureRsv } from '@stacks/encryption';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from './external-link';
import { ArrowRight } from 'lucide-react';
import { truncateAddress } from './lib/utils';

function App(): ReactElement {
  const [address, setAddress] = useState('');
  const [isSignatureVerified, setIsSignatureVerified] = useState(false);
  const [hasFetchedReadOnly, setHasFetchedReadOnly] = useState(false);
  const [isKeyHolder, setIsKeyHolder] = useState(false);

  // Initialize your app configuration and user session here
  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  const message = 'Hello, Hiro Hacks!';
  const network = new StacksDevnet();

  // Define your authentication options here
  const authOptions = {
    userSession,
    appDetails: {
      name: 'My App',
      icon: 'src/favicon.svg'
    },
    onFinish: (data: FinishedAuthData) => {
      // Handle successful authentication here
      let userData = data.userSession.loadUserData();
      setAddress(userData.profile.stxAddress.mainnet); // or .testnet for testnet
    },
    onCancel: () => {
      // Handle authentication cancellation here
    },
    redirectTo: '/'
  };

  const connectWallet = () => {
    showConnect(authOptions);
  };

  const disconnectWallet = () => {
    if (userSession.isUserSignedIn()) {
      userSession.signUserOut('/');
      setAddress('');
    }
  };

  const fetchReadOnly = async (senderAddress: string) => {
    // Define your contract details here
    const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const contractName = 'keys';
    const functionName = 'get-protocol-fee-percent';

    const functionArgs = []

    try {
      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderAddress
      });
      setHasFetchedReadOnly(true);
      console.log('fetchReadyOnly Result: ', cvToValue(result), typeof(cvToValue(result)));
    } catch (error) {
      console.error('fetchReadyOnly Error:', error);
    }
  };

  const checkIsKeyHolder = async (senderAddress: string) => {
    // Define your contract details here
    const contractAddress = senderAddress;
    const contractName = 'keys';
    const functionName = 'is-keyholder';

    const functionArgs = [principalCV(contractAddress), principalCV(contractAddress)];

    try {
      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderAddress
      });
      setHasFetchedReadOnly(true);
      console.log('fetchReadyOnly Result: ', cvToValue(result));
      return cvToValue(result);

    } catch (error) {
      console.error('fetchReadyOnly Error:', error);
    }
  };

  const signMessage = () => {
    if (userSession.isUserSignedIn()) {
      openSignatureRequestPopup({
        message,
        network,
        onFinish: async ({ publicKey, signature }) => {
          // Verify the message signature using the verifyMessageSignatureRsv function
          const verified = verifyMessageSignatureRsv({
            message,
            publicKey,
            signature
          });
          if (verified) {
            // The signature is verified, so now we can check if the user is a keyholder
            setIsSignatureVerified(true);
            const addr = getAddressFromPublicKey(publicKey, network.version);
            const isKeyHolder = await checkIsKeyHolder(addr)

            setAddress(addr)
            setIsKeyHolder(isKeyHolder);

            // TODO: - show chat room later
            if(isKeyHolder) {
              console.log('Showing chatroom...');
            }

            console.log(
              'Address derived from public key', addr, 'Is Key holder: ', isKeyHolder
            );
          }
        }
      });
    }
  };
  /*
  depositContract 
  Call the buy-keys function from the keys contract to initialise the process.

  NOTE: Haven't fully tested this function yet, still working in progress. 
  */
  const depositContract = async (senderAddress: string) => {
    // Define your contract details here
    const contractAddress = senderAddress;
    const contractName = 'keys';
    const functionName = 'buy-keys';

    const functionArgs = [principalCV(contractAddress), uintCV(500)];

    const txOptions = {
      contractAddress: senderAddress,
      contractName: 'keys',
      functionName: 'buy-keys',
      functionArgs: functionArgs,
      senderKey: '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601',
      validateWithAbi: true,
      sponsored: true,
    };

    try {
      const result = await makeContractCall(txOptions);
      console.log('deposit contract result: ', cvToValue(result));
      return cvToValue(result);

    } catch (error) {
      console.error('fetchReadyOnly Error:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-lg border bg-background p-8">
          <h1 className="mb-2 text-lg font-semibold">Welcome to Hiro Hacks!</h1>
          <p className="leading-normal text-muted-foreground">
            This is an open source starter template built with{' '}
            <ExternalLink href="https://docs.hiro.so/stacks.js/overview">
              Stacks.js
            </ExternalLink>{' '}
            and a few integrations to help kickstart your app:
          </p>

          <div className="mt-4 flex flex-col items-start space-y-2">
            {userSession.isUserSignedIn() ? (
              <div className="flex justify-between w-full">
                <Button
                  onClick={disconnectWallet}
                  variant="primary"
                  className="h-auto p-0 text-base"
                >
                  1. Disconnect wallet
                  <ArrowRight size={15} className="ml-1" />
                </Button>
                {address && <span>{truncateAddress(address)}</span>}
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                variant="primary"
                className="h-auto p-0 text-base"
              >
                1. Connect your wallet
                <ArrowRight size={15} className="ml-1" />
              </Button>
            )}
            <div className="flex justify-between w-full">
              <Button
                onClick={signMessage}
                variant="link"
                className="h-auto p-0 text-base text-neutral-500"
              >
                2. Sign a message
                <ArrowRight size={15} className="ml-1" />
              </Button>
              {isSignatureVerified && <span>{message}</span>}
            </div>

            {userSession.isUserSignedIn() ? (
              // User has signed in
              <div className="flex justify-between w-full">
                <Button
                  onClick={() => fetchReadOnly(address)}
                  variant="link"
                  className="h-auto p-0 text-base"
                >
                  3. Read from a smart contract
                  <ArrowRight size={15} className="ml-1" />
                </Button>
                {hasFetchedReadOnly && (
                  <span>
                    <Badge className="text-orange-500 bg-orange-100">
                      Success
                    </Badge>
                  </span>
                )}

                <Button
                  onClick={() => depositContract(address)}
                  variant="success"
                >
                  4. Buy 500 mSTX keys
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>


            ) : (
              // User not signed in
              <div className="flex justify-between w-full">
                <Button
                  variant="link"
                  className="disabled h-auto p-0 text-base"
                >
                  3. Read from a smart contract
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="text-center">
  //     <h1 className="text-xl">Friend.tech</h1>
  //     <div>
  //       <button onClick={disconnectWallet}>Disconnect Wallet</button>
  //     </div>
  //     <div>
  //       <p>
  //         {address} is {isKeyHolder ? '' : 'not'} a key holder
  //       </p>
  //       <div>
  //         <input
  //           type="text"
  //           id="address"
  //           name="address"
  //           placeholder="Enter address"
  //         />
  //         <button onClick={() => checkIsKeyHolder(address)}>
  //           Check Key Holder
  //         </button>
  //         <div>
  //           <p>Key Holder Check Result: {isKeyHolder ? 'Yes' : 'No'}</p>
  //         </div>
  //       </div>
  //     </div>
  //     <div>
  //       Sign this message: <button onClick={signMessage}>Sign</button>
  //     </div>
  //   </div>
  // );
}

export default App;
