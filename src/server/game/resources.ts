export enum ResourceType {
  Wood = 'w',
  Stone = 'r',
  Metal = 'm',
  Spore = 's',
}

export type Resource = {
  type: ResourceType;
  amount: number;
};
