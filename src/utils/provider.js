import { ethers } from 'ethers';
import { config } from '../config.js';

let _provider = null;
let _wallet = null;

export function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.BASE_RPC_URL);
  }
  return _provider;
}

export function getWallet() {
  if (!_wallet) {
    _wallet = new ethers.Wallet(config.PRIVATE_KEY, getProvider());
  }
  return _wallet;
}
