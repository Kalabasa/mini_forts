//

// Node groups are used to tag blocks with certain information, e.g., 'Ghost' group contains nodes that are ghosts.
// Node groups are used because they are also sent to the client

const schema = {
  Ghost: {
    True: 1,
  },
  BuildStyle: {
    Single: 1,
    Multi: 2,
  },
  PhysicsAttachment: {
    Down: 1,
    DiagonalDown: 2,
  },
  PhysicsSupport: {
    All: 1,
  },
  Operable: {
    True: 1,
  },
  Use: {
    Script: 1,
    OpenDenMenu: 2,
    OpenBallistaMenu: 3,
  },
  PassableDoor: {
    True: 1,
  },
  BreakableBuilding: {
    True: 1,
  },
} as const;

const nameConstants = Object.fromEntries(
  Object.keys(schema).map((n) => [n, n])
) as {
  [T in BlockTag.TagName]: T;
};

// evil typescript dark magic
type ValueOf<O> = O extends Record<any, infer K> ? K : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
const valueConstants = Object.fromEntries(
  Object.keys(schema).flatMap((n) =>
    Object.keys(schema[n]).map((v) => [`${n}${v}`, schema[n][v]])
  )
) as UnionToIntersection<
  ValueOf<
    UnionToIntersection<
      {
        [T in BlockTag.TagName]: {
          [V in BlockTag.ValueName<T>]: {
            [K in `${T}${V}`]: BlockTag.CodeValue<T, V>;
          };
        };
      }[BlockTag.TagName]
    >
  >
>;

type NodeGroups =
  | Partial<
      {
        [T in BlockTag.TagName]: BlockTag.Code<T>;
      }
    >
  | undefined;

type Schema = typeof schema;

type GroupsDefinition = { groups?: Record<string, number> };

function getGroups(def: GroupsDefinition): NodeGroups {
  return def.groups;
}

function getTag<T extends BlockTag.TagName>(
  def: GroupsDefinition,
  name: T
): BlockTag.Code<T> | undefined {
  return getGroups(def)?.[name] as unknown as BlockTag.Code<T> | undefined;
}

function defineGroups(
  tags: { [T in BlockTag.TagName]?: BlockTag.Code<T> }
): NodeGroups {
  return tags;
}

export namespace BlockTag {
  export type TagName = string & keyof Schema;
  export type ValueName<T extends TagName> = string & keyof Schema[T];
  export type Code<T extends TagName> = Schema[T][ValueName<T>];
  export type CodeValue<
    T extends TagName,
    V extends ValueName<T>
  > = Schema[T][V];
}

export const BlockTag = {
  ...nameConstants,
  ...valueConstants,
  get: getTag,
  defineGroups,
};
