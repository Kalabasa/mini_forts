import { throwError } from 'utils/error';
import { GameData } from 'server/game/game';
import { globals } from 'common/globals';

export const Serializer = {
  serializeGameData,
  deserializeGameData,
};

/** @noSelf */
function serializeGameData(storage: StorageDef, data: GameData) {
  storage.set_string(globals.metaKeys.gameData, minetest.serialize(data));
}

/** @noSelf */
function deserializeGameData(storage: StorageDef): GameData | undefined {
  const serializedData = storage.get_string(globals.metaKeys.gameData);
  if (serializedData.length === 0) {
    return undefined;
  }

  const data = minetest.deserialize<GameData>(serializedData);
  if (data == undefined) {
    throwError('Invalid serialized game data: ', serializedData);
  }
  return data;
}
