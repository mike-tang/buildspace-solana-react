/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import twitterLogo from './assets/twitter-logo.svg'
import './App.css'
import { 
  Connection, 
  PublicKey, 
  clusterApiUrl 
} from '@solana/web3.js'
import { 
  Program, 
  Provider, 
  web3 
} from '@project-serum/anchor'
import idl from './config/idl.json'
import kp from './config/keypair.json'

// SystemProgram is a reference to the Solana runtime
const { SystemProgram, Keypair } = web3

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file
const programID = new PublicKey(idl.metadata.address)

// Set our network to devnet
const network = clusterApiUrl('devnet')

// These options control how we want to acknowledge when a transaction is done
const opts = {
  preflightCommitment: 'processed'
}

// Constants
const TWITTER_HANDLE = 'miketang';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  // Initiate walletAddress state
  const [walletAddress, setWalletAddress] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [gifList, setGifList] = useState([])
  
  // Check if a Phantom Wallet is connected or not
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window
      
      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom Wallet found!')

          /*
          * The solana object gives us a function that will allow us to connect
          * directly with the user's wallet!
          */
          const response = await solana.connect({ onlyIfTrusted: true })
          const publicKey = response?.publicKey.toString()
          console.log(
            'Connected with Public Key:',
            publicKey
          )

          // Set the user's publicKey in state to be used later
          setWalletAddress(publicKey)

        }
      } else {
        alert('Solana object not found! Get Phantom Wallet')
      }
    } catch (error) {
      console.log(error)
    }
  }

  // Connect to Phantom Wallet
  const connectWallet = async () => {
    const { solana } = window

    if (solana) {
      const response = await solana.connect()
      const publicKey = response?.publicKey.toString()
      console.log('Connected with Public Key: ', publicKey)
    }
  }

  const onInputChange = (event) => {
    const { value } = event.target
    setInputValue(value)
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment)
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment
    )
    return provider
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      console.log('ping')
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [baseAccount]
      })
      console.log('Created a new BaseAccount w/ address:', baseAccount.publicKey.toString())
      await getGifList()
    } catch (error) {
      console.log('Error creating BaseAccount account:', error)
    }
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given!')
      return
    }
    setInputValue('')
    console.log('Gif link: ', inputValue)

    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey
        }
      })
      console.log('GIF successfully sent to program', inputValue)
      
      await getGifList()
    } catch (error) {
      console.log('Error sending GIF: ', error)
    }
    
  }

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect Wallet
    </button>
  )

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button 
            type="submit" 
            className="cta-button submit-gif-button"
            onClick={createGifAccount}  
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendGif()
            }}
          >
            <input 
              type="text" 
              placeholder="Enter gif link!" 
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} alt={item.gifLink} />
                <p style={{color: 'white'}}>{item.userAddress.toString()}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

  }

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected()
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  const getGifList = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey)

      console.log('Got the account', account)
      setGifList(account.gifList)
    } catch (error) {
      console.log('Error in getGifList: ', error)
      setGifList(null)
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...')
      getGifList()
    }
  }, [walletAddress])

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">Novadex</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          
          {/* If no walletAddress, render the Connect Wallet button */}
          {!walletAddress && renderNotConnectedContainer()}

          {/* If walletAddress, show gifs */}
          {walletAddress && renderConnectedContainer()}

        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
