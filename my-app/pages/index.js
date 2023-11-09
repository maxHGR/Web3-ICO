import Head from 'next/head';
import image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { BigNumber, Contract, utils, providers } from "ethers";
import {
    TOKEN_CONTRACT_ABI,
    TOKEN_CONTRACT_ADDRESS,
    NFT_CONTRACT_ABI,
    NFT_CONTRACT_ADDRESS
} from "../constants";

export default function Home() {

  const zero = BigNumber.from(0)
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();
  const [tokensMinted, setTokensMinted] = useState(zero);
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  const [tokenAmount, setTokenAmount] = useState(zero);
  const [loading, setLoading] = useState(false);
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    // wraps the provider you have (i.e. MetaMask) inside a
    // web3provider class, where you can call functions on it
    // i.e. "getNetwork()" "getSigner()"
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Change Network to Goerli");
      throw new Error("Change the network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error)
    }
  };

  const getTokensToBeClaimed = async () => {
    try {
       const provider = await getProviderOrSigner();
       const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      const balance = await nftContract.balanceOf(address);

      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        // keeps track of unclaimed tokens
        var amount = 0;

        for(let i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i)
          const claimed = await tokenContract.tokenIdsClaimed(tokenId)
          if(!claimed) {
            amount++;
          }
        }
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (error) {
      console.error;
      setTokensToBeClaimed(zero);
    }
  };

  const getBalanceOfCryptoDevTokens = async () => {
    try {
      // for contract instance you need provider
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // for owner address you need signer
      const signer = await getProviderOrSigner(true);
      const address = signer.getAddress();
      const balance = await tokenContract.balanceOf(address);
      setBalanceOfCryptoDevTokens(balance);

    } catch (error) {
      console.error(error)
    }
  }

  const getTotalTokenMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (error) {
      console.error(error)
    }
  }

  const mintCryptoDevToken = async(amount) => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
          TOKEN_CONTRACT_ADDRESS,
          TOKEN_CONTRACT_ABI,
          signer
      );

      const value = 0.001*amount;
      const tx = await tokenContract.mint(amount, {
        value: utils.parseEther(value.toString()),
        // js sees amount as a number instead of a BigNumber
        // so we first need to convert value into a string
      });

      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted Crypto Dev Token");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokenMinted();
      await getTokensToBeClaimed();

    } catch (error) {
      console.error(error)
    }
  }

  const claimCryptoDevTokens = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim()
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted Crypto Dev Token");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokenMinted();
      await getTokensToBeClaimed();
    } catch (error) {
      console.error(error)
    }
  }

  useEffect( () => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal ({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false
      });
      connectWallet();
      getBalanceOfCryptoDevTokens();
      getTotalTokenMinted();
      getTokensToBeClaimed();
    }
  }, [walletConnected]);
  
  const renderButton = () => {
    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // If tokens to be claimed are greater than 0, Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title> Crypto Devs ICO </title>
        <meta name="description" content="ICO dApp" />
        <link rel="icon" href="./favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}> Welcome to Crypto Devs ICO </h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
            <div className={styles.description}>
              You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens
            </div>
              <div className={styles.description}>
                Overall {utils.formatEther(tokensMinted)} / 10000 have been minted
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
            I C O
      </footer>
    </div>
  )
}
