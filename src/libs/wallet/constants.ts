import { WalletName } from './Wallet';

export const initListWallet = [
  {
    wallet: WalletName.Leap,
    logo: 'https://assets.leapwallet.io/logos/leap-cosmos-logo.svg',
  },
  {
    wallet: WalletName.Metamask,
    logo: 'https://ping.pub/logos/metamask.png',
  },
  {
    wallet: WalletName.Keplr,
    logo: 'https://ping.pub/logos/keplr-logo.svg',
  },
];

export enum ERROR_MESSAGE {
  INVALID_CHAIN = 'Invalid chain id',
  ENDPOINT_NOT_SET = 'Endpoint does not set',
}
