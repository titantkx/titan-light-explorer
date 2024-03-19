import { Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';

import type { Transaction } from '../utils/type';
import { KeplerWallet } from './wallets/KeplerWallet';
import { LeapWallet } from './wallets/LeapWallet';
import { MetamaskWallet } from './wallets/MetamaskWallet';

export enum WalletName {
  Keplr = 'Keplr',
  Metamask = 'Metamask',
  Leap = 'Leap',
  Address = 'Address',
  NameService = 'Nameservice',
}

export interface ConnectedWallet {
  wallet: WalletName;
  cosmosAddress: string;
  hdPath?: string;
}

export interface Account {
  address: string;
  algo: string;
  pubkey: Uint8Array;
}

export interface WalletArgument {
  chainId?: string;
  hdPath?: string;
  address?: string;
  name?: string;
  transport?: string;
  prefix?: string;
}

export interface AbstractWallet {
  name: WalletName;
  /**
   * The the accounts from the wallet (addresses)
   */
  getAccounts(): Promise<Account[]>;
  supportCoinType(coinType?: string): Promise<boolean>;
  sign(transaction: Transaction): Promise<any>;
}

export const DEFAULT_HDPATH = "m/44'/118/0'/0/0";

export function keyType(chainId: string) {
  switch (true) {
    case chainId.search(/\w+_\d+-\d+/g) > -1: // ethermint like chain: evmos_9002-1
      return '/ethermint.crypto.v1.ethsecp256k1.PubKey';
    case chainId.startsWith('injective'):
      return '/injective.crypto.v1beta1.ethsecp256k1.PubKey';
    default:
      return '/cosmos.crypto.secp256k1.PubKey';
  }
}

export function readWallet(hdPath?: string) {
  return JSON.parse(
    localStorage.getItem(hdPath || DEFAULT_HDPATH) || '{}'
  ) as ConnectedWallet;
}
export function writeWallet(connected: ConnectedWallet, hdPath?: string) {
  localStorage.setItem(hdPath || DEFAULT_HDPATH, JSON.stringify(connected));
}

export function removeWallet(hdPath?: string) {
  localStorage.removeItem(hdPath || DEFAULT_HDPATH);
}

export function extractChainId(chainId: string) {
  const start = chainId.indexOf('_');
  const end = chainId.indexOf('-');
  if (end > start && start > 0) {
    return Number(chainId.substring(start + 1, end));
  }
  return 0;
}

export function createWallet(
  name: WalletName,
  arg: WalletArgument,
  registry?: Registry
): AbstractWallet {
  const reg = registry || new Registry(defaultRegistryTypes);
  switch (name) {
    case WalletName.Keplr:
      return new KeplerWallet(arg, reg);
    case WalletName.Leap:
      return new LeapWallet(arg, reg);
    case WalletName.Metamask:
      return new MetamaskWallet(arg, reg);
  }
  throw new Error('No wallet connected');
}
