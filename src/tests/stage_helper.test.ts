import { Stages } from 'server/world/stage_helper';

const { getOverworldStagePosition } = Stages;

describe('getOverworldStagePosition', () => {
  it('is correct', () => {
    /*
        20 21 22 23 24
        19 6  7  8  9
        18 5  0  1  10
        17 4  3  2  11
        16 15 14 13 12
      */
    expect(getOverworldStagePosition(0)).toEqual({ x: 0, y: 0 });
    expect(getOverworldStagePosition(1)).toEqual({ x: 1, y: 0 });
    expect(getOverworldStagePosition(2)).toEqual({ x: 1, y: 1 });
    expect(getOverworldStagePosition(3)).toEqual({ x: 0, y: 1 });
    expect(getOverworldStagePosition(4)).toEqual({ x: -1, y: 1 });
    expect(getOverworldStagePosition(5)).toEqual({ x: -1, y: 0 });
    expect(getOverworldStagePosition(6)).toEqual({ x: -1, y: -1 });
    expect(getOverworldStagePosition(7)).toEqual({ x: 0, y: -1 });
    expect(getOverworldStagePosition(8)).toEqual({ x: 1, y: -1 });
    expect(getOverworldStagePosition(20)).toEqual({ x: -2, y: -2 });
    expect(getOverworldStagePosition(22)).toEqual({ x: 0, y: -2 });
    expect(getOverworldStagePosition(25)).toEqual({ x: 3, y: -2 });
    expect(getOverworldStagePosition(27)).toEqual({ x: 3, y: 0 });
    expect(getOverworldStagePosition(33)).toEqual({ x: 0, y: 3 });
  });
});
