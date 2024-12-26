import { WalletName } from './Wallet';

export const initListWallet = [
  {
    wallet: WalletName.Keplr,
    logo: 'https://ping.pub/logos/keplr-logo.svg',
  },
  {
    wallet: WalletName.Leap,
    logo: 'https://assets.leapwallet.io/logos/leap-cosmos-logo.svg',
  },
  // {
  //   wallet: WalletName.Metamask,
  //   logo: 'https://ping.pub/logos/metamask.png',
  // },
];

export enum ERROR_MESSAGE {
  INVALID_CHAIN = 'invalid chain id',
  NO_CHAIN = 'no chain',
  NO_CHAIN_TITAN_TESTNET = 'titan_18889-1',
  NO_CHAIN_TITAN_MAIN = 'titan_18888-1',
  INSTALL_KEPLR = 'install keplr',
  ENDPOINT_NOT_SET = 'Endpoint does not set',
}
