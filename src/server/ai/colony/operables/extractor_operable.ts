import { Operable } from 'server/ai/colony/operable';
import { TaskPriority } from 'server/ai/colony/task';
import { ExtractorDef } from 'server/block/extractor/def';

export class ExtractorOperable extends Operable<typeof ExtractorDef> {
  shouldOperate(): TaskPriority | undefined {
    return this.blockRef.getData().ripeExtractor
      ? TaskPriority.Low
      : undefined;
  }
}
