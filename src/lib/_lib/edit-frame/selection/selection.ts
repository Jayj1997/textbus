import { Cursor } from './cursor';
import { RootElement } from '../parser/root-element';
import { fromEvent } from 'rxjs';


export class TBSelection {
  cursorElementRef: HTMLElement;
  inputNode: Node;
  private cursor: Cursor;

  private selection: Selection;

  constructor(private context: Document, private doc: RootElement) {
    this.cursor = new Cursor(context);
    this.cursorElementRef = this.cursor.elementRef;
    fromEvent(context, 'selectstart').subscribe(() => {
      this.selection = context.getSelection();
    });

    fromEvent(context, 'selectionchange').subscribe(() => {
      if (this.selection.isCollapsed) {
        this.cursor.show(this.selection.getRangeAt(0).getBoundingClientRect());
      } else {
        this.cursor.hide();
      }
    });
  }
}