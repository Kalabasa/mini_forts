// TSTL Polyfill
($range as Omit<typeof $range, '__luaRangeFunctionBrand'>) = function* (
  start: number,
  limit: number,
  step: number = 1
) {
  for (let i = start; i <= limit; i += step) {
    yield i as number;
  }
};
 