import { Area, Volume } from 'utils/space';

describe('space', () => {
  describe('Volume', () => {
    it('computes the extent', () => {
      const volume = new Volume({ x: 2, y: 1, z: -1 }, { x: 7, y: 8, z: 2 });
      expect(volume.getExtent()).toEqual({
        x: 6,
        y: 8,
        z: 4,
      });
    });

    it('determines whether the volume contains a point', () => {
      const volume = new Volume({ x: 2, y: 1, z: -1 }, { x: 7, y: 8, z: 2 });
      expect(volume.contains(4, 4, 0)).toBe(true);
      expect(volume.contains(1, 4, 0)).toBe(false);
      expect(volume.contains(2, 2, -2)).toBe(false);
    });

    it('determines whether the volume intersects another', () => {
      const volume = new Volume({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 });
      expect(
        volume.intersects({ x: 4, y: 4, z: 4 }, { x: 8, y: 8, z: 8 })
      ).toBe(true);
      expect(
        volume.intersects({ x: 6, y: 4, z: 4 }, { x: 10, y: 8, z: 8 })
      ).toBe(false);
      expect(
        volume.intersects({ x: -4, y: -4, z: -4 }, { x: 4, y: -1, z: 4 })
      ).toBe(false);
    });

    it('computes the index', () => {
      const volume = new Volume({ x: 0, y: 0, z: 0 }, { x: 1, y: 3, z: 7 });
      expect(volume.index(0, 0, 0)).toBe(0);
      expect(volume.index(1, 0, 0)).toBe(1);
      expect(volume.index(0, 1, 0)).toBe(2);
      expect(volume.index(1, 1, 0)).toBe(3);
      expect(volume.index(0, 0, 1)).toBe(8);
      expect(volume.index(1, 0, 1)).toBe(9);
      expect(volume.index(1, 1, 1)).toBe(11);
      expect(volume.index(0, 0, 2)).toBe(16);
    });

    it('iterates over positions', () => {
      const volume = new Volume({ x: 0, y: 0, z: 0 }, { x: 1, y: 3, z: 3 });
      let trueIndex = 0;
      let trueX = 0;
      let trueY = 0;
      let trueZ = 0;
      volume.forEach((pos, i) => {
        expect(pos).toEqual({ x: trueX, y: trueY, z: trueZ });
        expect(i).toBe(volume.index(pos.x, pos.y, pos.z));

        trueIndex++;
        trueX++;
        if (trueX > 1) {
          trueX = 0;
          trueY++;
          if (trueY > 3) {
            trueY = 0;
            trueZ++;
          }
        }
      });
    });

    it('iterates over xz-slices', () => {
      const volume = new Volume({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 2 });

      const columns = [];
      volume.forEachSlice({ x: 1, z: 1 }, (slice) =>
        columns.push([{ ...slice.min }, { ...slice.max }])
      );

      expect(columns).toMatchObject([
        [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
        ],
        [
          { x: 1, y: 0, z: 0 },
          { x: 1, y: 1, z: 0 },
        ],
        [
          { x: 0, y: 0, z: 1 },
          { x: 0, y: 1, z: 1 },
        ],
        [
          { x: 1, y: 0, z: 1 },
          { x: 1, y: 1, z: 1 },
        ],
        [
          { x: 0, y: 0, z: 2 },
          { x: 0, y: 1, z: 2 },
        ],
        [
          { x: 1, y: 0, z: 2 },
          { x: 1, y: 1, z: 2 },
        ],
      ]);
    });

    it('iterates over y-slices', () => {
      const volume = new Volume({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 });

      const planes = [];
      volume.forEachSlice({ y: 1 }, (slice) =>
        planes.push([{ ...slice.min }, { ...slice.max }])
      );

      expect(planes).toMatchObject([
        [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 2 },
        ],
        [
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 1, z: 2 },
        ],
        [
          { x: 0, y: 2, z: 0 },
          { x: 1, y: 2, z: 2 },
        ],
      ]);
    });

    it('iterates over 1-cell slices', () => {
      const volume = new Volume({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });

      const cells = [];
      volume.forEachSlice({ x: 1, y: 1, z: 1 }, (slice) =>
        cells.push([{ ...slice.min }, { ...slice.max }])
      );

      expect(cells).toMatchObject([
        [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 0 },
        ],
        [
          { x: 1, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
        ],
        [
          { x: 0, y: 1, z: 0 },
          { x: 0, y: 1, z: 0 },
        ],
        [
          { x: 1, y: 1, z: 0 },
          { x: 1, y: 1, z: 0 },
        ],
        [
          { x: 0, y: 0, z: 1 },
          { x: 0, y: 0, z: 1 },
        ],
        [
          { x: 1, y: 0, z: 1 },
          { x: 1, y: 0, z: 1 },
        ],
        [
          { x: 0, y: 1, z: 1 },
          { x: 0, y: 1, z: 1 },
        ],
        [
          { x: 1, y: 1, z: 1 },
          { x: 1, y: 1, z: 1 },
        ],
      ]);
    });
  });

  describe('Area', () => {
    it('computes the extent', () => {
      const area = new Area({ x: 2, y: -1 }, { x: 7, y: 8 });
      expect(area.getExtent()).toEqual({
        x: 6,
        y: 10,
      });
    });

    it('determines whether the area contains a point', () => {
      const area = new Area({ x: 2, y: 1 }, { x: 7, y: 8 });
      expect(area.contains(4, 4)).toBe(true);
      expect(area.contains(1, 4)).toBe(false);
      expect(area.contains(2, 2)).toBe(true);
      expect(area.contains(2, 0)).toBe(false);
    });

    it('determines whether the area intersects another', () => {
      const area = new Area({ x: 0, y: 0 }, { x: 5, y: 5 });
      expect(area.intersects({ x: 4, y: 4 }, { x: 8, y: 8 })).toBe(true);
      expect(area.intersects({ x: 6, y: 4 }, { x: 10, y: 8 })).toBe(false);
      expect(area.intersects({ x: -4, y: -4 }, { x: 4, y: -1 })).toBe(false);
    });

    it('computes the index', () => {
      const area = new Area({ x: 0, y: 0 }, { x: 1, y: 3 });
      expect(area.index(0, 0)).toBe(0);
      expect(area.index(1, 0)).toBe(1);
      expect(area.index(0, 1)).toBe(2);
      expect(area.index(1, 1)).toBe(3);
      expect(area.index(0, 2)).toBe(4);
    });

    it('iterates over positions', () => {
      const area = new Area({ x: 0, y: 0 }, { x: 1, y: 3 });
      let trueIndex = 0;
      let trueX = 0;
      let trueY = 0;
      area.forEach((pos, i) => {
        expect(pos).toEqual({ x: trueX, y: trueY });
        expect(i).toBe(area.index(pos.x, pos.y));

        trueIndex++;
        trueX++;
        if (trueX > 1) {
          trueX = 0;
          trueY++;
        }
      });
    });

    it('iterates over x-slices', () => {
      const area = new Area({ x: 0, y: 0 }, { x: 1, y: 1 });

      const slices = [];
      area.forEachSlice({ x: 1 }, (slice) =>
        slices.push([{ ...slice.min }, { ...slice.max }])
      );

      expect(slices).toMatchObject([
        [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
        [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      ]);
    });

    it('iterates over y-slices', () => {
      const area = new Area({ x: 0, y: 0 }, { x: 1, y: 2 });

      const slices = [];
      area.forEachSlice({ y: 1 }, (slice) =>
        slices.push([{ ...slice.min }, { ...slice.max }])
      );

      expect(slices).toMatchObject([
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        [
          { x: 0, y: 1 },
          { x: 1, y: 1 },
        ],
        [
          { x: 0, y: 2 },
          { x: 1, y: 2 },
        ],
      ]);
    });

    it('iterates over 1-cell slices', () => {
      const area = new Area({ x: 0, y: 0 }, { x: 1, y: 1 });

      const squares = [];
      area.forEachSlice({ x: 1, y: 1 }, (slice) =>
        squares.push([{ ...slice.min }, { ...slice.max }])
      );

      expect(squares).toMatchObject([
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        [
          { x: 1, y: 0 },
          { x: 1, y: 0 },
        ],
        [
          { x: 0, y: 1 },
          { x: 0, y: 1 },
        ],
        [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
      ]);
    });
  });
});
