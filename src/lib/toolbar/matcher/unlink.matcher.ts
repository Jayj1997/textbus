import { FormatMatcher } from './format.matcher';
import { SelectionMatchState } from './matcher';
import { TBSelection } from '../../core/_api';
import { HighlightState } from '../../toolbar/help';

export class UnlinkMatcher extends FormatMatcher {
  queryState(selection: TBSelection): SelectionMatchState {
    const r = super.queryState(selection);
    if (r.state === HighlightState.Normal) {
      r.state = HighlightState.Disabled;
    }
    return r;
  }
}
