export const Stages = {
  getOverworldStagePosition,
};

function getOverworldStagePosition(stageIndex: number): Vector2D {
  /*
  Lay out stages in a clockwise outward rectangular spiral, starting at 0,0
    20 21 22 23 24
    19 6  7  8  9
    18 5  0  1  10
    17 4  3  2  11
    16 15 14 13 12
  */
  const shell = Math.ceil(Math.sqrt(stageIndex + 1)) - 1;
  const index = stageIndex - shell ** 2;
  if (shell % 2 === 0) {
    // upper-left shell
    if (index < shell) {
      // left side
      return {
        x: normalize(-shell / 2),
        y: normalize(shell / 2 - index),
      };
    } else {
      // top side
      return {
        x: normalize(-shell / 2 + index - shell),
        y: normalize(-shell / 2),
      };
    }
  } else {
    // lower-right shell
    if (index < shell) {
      // right side
      return {
        x: normalize((shell + 1) / 2),
        y: normalize((1 - shell) / 2 + index),
      };
    } else {
      // bottom side
      return {
        x: normalize((shell + 1) / 2 - index + shell),
        y: normalize((shell + 1) / 2),
      };
    }
  }
}
// Filter negative zeros
function normalize(n: number): number {
  if (n == 0) return 0;
  return n;
}
