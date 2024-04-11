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
  {
    wallet: WalletName.Metamask,
    logo: 'https://ping.pub/logos/metamask.png',
  },
];

export enum ERROR_MESSAGE {
  INVALID_CHAIN = 'invalid chain',
  NO_CHAIN = 'no chain',
  INSTALL_KEPLR = 'install keplr',
  ENDPOINT_NOT_SET = 'Endpoint does not set',
}
