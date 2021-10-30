import {
  AbstractBlockPropertiesConstructor,
  BlockProperties,
  BlockScript,
  BlockScriptConstructor,
} from 'server/block/block';

type DamagedNode = Readonly<{
  name: string;
  maxHealth: number;
  nodeDefinition: NodeDefinition;
}>;

type DamagedNodes = readonly DamagedNode[];

function makeDamagedNodes(
  damagedNodeDefinition: DamagedNodes
): Record<string, NodeDefinition> {
  const damagedNodes: Record<string, NodeDefinition> = {};
  for (const def of damagedNodeDefinition) {
    damagedNodes[def.name] = def.nodeDefinition;
  }
  return damagedNodes;
}

export function createDamagedBlockProperties<
  D extends DamagedNodes,
  P extends BlockProperties
>({
  damagedNodes,
  base,
}: {
  damagedNodes: D;
  overrideStates?: string[];
  base?: AbstractBlockPropertiesConstructor<P>;
}) {
  abstract class DamagedBlockProperties extends (base ?? BlockProperties) {
    readonly damagedNodes: DamagedNodes = [...damagedNodes].sort(
      (a, b) => b.maxHealth - a.maxHealth
    );
    readonly damagedStatesOverride: string[] = ['default'];

    nodeDefinition = this.defineNodes(makeDamagedNodes(damagedNodes));
  }

  return DamagedBlockProperties as AbstractBlockPropertiesConstructor<
    P & DamagedBlockProperties
  >;
}

type PropertiesInstance = InstanceType<
  ReturnType<typeof createDamagedBlockProperties>
>;

export function createDamagedBlockScript<
  P extends PropertiesInstance,
  S extends BlockScript<P>
>({ base }: { base: BlockScriptConstructor<S> }) {
  const Base = base ?? BlockScript;

  // @ts-ignore-next-line
  class DamagedBlockScript extends Base {
    override damage(amount, source): void {
      super.damage(amount, source);

      // skip if block already destroyed
      if (!this.valid) return;

      const { damagedNodes, damagedStatesOverride: overrideStates } =
        this.properties;
      const currentState = this.getState();
      if (
        overrideStates.includes(currentState) ||
        damagedNodes.some((d) => d.name === currentState)
      ) {
        const health = this.getHealth();
        let nextState: string | undefined;
        for (const damagedNode of damagedNodes) {
          if (damagedNode.maxHealth >= health) {
            nextState = damagedNode.name;
          }
        }
        if (nextState && nextState !== currentState) {
          this.changeState(nextState);
        }
      }
    }
  }

  return DamagedBlockScript as BlockScriptConstructor<S & DamagedBlockScript>;
}
