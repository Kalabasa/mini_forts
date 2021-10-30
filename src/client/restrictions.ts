import { Logger } from 'utils/logger';

export function checkRestrictions(
  restrictions: CSMRestrictions,
  checks: Partial<Record<keyof CSMRestrictions, string>>
): boolean {
  let pass = true;

  for (const [key, message] of Object.entries(checks)) {
    if (restrictions[key]) {
      Logger.error(`CSM '${key}' restricted!`, message);
      pass = false;
    }
  }

  return pass;
}
