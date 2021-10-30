import { Logger } from 'utils/logger';

export function throwError(message: string, ...data: any[]): never {
  Logger.error(message, ...data);
  throw message;
}

export function unreachableCase(value: never): never {
  throw undefined;
}
