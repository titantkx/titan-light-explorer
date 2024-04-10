export interface ValidatorRewardParam {
  params: {
    rate: string;
    authority: string;
  };
}

export interface ValidatorRewardPool {
  pool: Array<{ denom: string; amount: string }>;
}
