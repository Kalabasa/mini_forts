import { floorDiv, randomInt } from 'utils/math';

export type ID = string & { _id: never };

const pcgRandom = PcgRandom(randomInt(0, 1e20));

export function createIDGenerator(
  namespace: string,
  objectTypeName: string
): () => ID {
  const n = namespace.substring(0, 1).toUpperCase();
  const o = objectTypeName.substring(0, 2).toUpperCase();
  const no = n + o;

  return () => {
    const time = minetest.get_us_time();
    const randomBytes = String.fromCharCode(
      ...[
        97 + (floorDiv(time, 26 ** 3) % 26), // 1
        97 + (floorDiv(time, 26 ** 2) % 26), // 2
        97 + (floorDiv(time, 26) % 26), // 3
        97 + (time % 26), // 4
        pcgRandom.next(97, 122), // 5
        pcgRandom.next(97, 122), // 6
        pcgRandom.next(97, 122), // 7
        pcgRandom.next(97, 122), // 8
        pcgRandom.next(97, 122), // 9
        pcgRandom.next(97, 122), // 10
        pcgRandom.next(97, 122), // 11
        pcgRandom.next(97, 122), // 12
        pcgRandom.next(97, 122), // 13
        pcgRandom.next(97, 122), // 14
        pcgRandom.next(97, 122), // 15
        pcgRandom.next(97, 122), // 16
        pcgRandom.next(97, 122), // 17
        pcgRandom.next(97, 122), // 18
        pcgRandom.next(97, 122), // 19
        pcgRandom.next(97, 122), // 20
      ]
    );
    return (no + randomBytes) as ID;
  };
}
