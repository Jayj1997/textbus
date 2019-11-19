import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class ToggleBlockCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    // context.tagName = overlap ? 'p' : this.tagName;
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}