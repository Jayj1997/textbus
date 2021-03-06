import { Observable, Subscription } from 'rxjs';
import { forwardRef, Inject, Injectable, Injector } from '@tanbo/di';

import {
  AbstractComponent, BackboneAbstractComponent, BranchAbstractComponent,
  DivisionAbstractComponent,
  LeafAbstractComponent, TBRangePosition,
  TBSelection,
  BrComponent
} from '../core/_api';
import { Dialog } from './dialog';
import { FileUploader } from '../uikit/forms/help';
import { EditorController } from '../editor-controller';
import { EDITOR_OPTIONS } from '../inject-tokens';
import { EditorOptions } from '../editor-options';
import { createElement } from '../uikit/uikit';
import { Tab } from './tab';

export interface ComponentCreator {
  example: string | HTMLElement;
  name: string;
  category?: string;

  factory(dialog: Dialog, delegate: FileUploader): AbstractComponent | Promise<AbstractComponent> | Observable<AbstractComponent>;
}

@Injectable()
export class ComponentStage {
  elementRef: HTMLElement;

  private set expand(b: boolean) {
    this._expand = b;
    b ?
      this.elementRef.classList.add('textbus-component-stage-expand') :
      this.elementRef.classList.remove('textbus-component-stage-expand');
  }

  private _expand = false;
  private selection: TBSelection;
  private subs: Subscription[] = [];

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              @Inject(forwardRef(() => Dialog)) private dialogManager: Dialog,
              private fileUploader: FileUploader,
              private editorController: EditorController) {

    const categories = this.classify(this.options.componentLibrary || []);
    const tab = new Tab();
    tab.show(categories.map(item => {
      const view = createElement('div', {
        classes: ['textbus-component-stage-list']
      });
      item.libs.forEach(i => view.appendChild(this.addExample(i)))
      return {
        label: item.categoryName,
        view
      }
    }))
    this.elementRef = createElement('div', {
      classes: ['textbus-component-stage'],
      children: [
        tab.elementRef
      ]
    })

    this.subs.push(editorController.onStateChange.subscribe(status => {
      this.expand = status.expandComponentLibrary;
    }));
  }

  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private classify(libs: ComponentCreator[]) {
    const categories = new Map<string, ComponentCreator[]>();
    libs.forEach(item => {
      const categoryName = item.category || '默认';
      if (!categories.has(categoryName)) {
        categories.set(categoryName, []);
      }
      const list = categories.get(categoryName);
      list.push(item);
    })
    return Array.from(categories).map(value => {
      return {
        categoryName: value[0],
        libs: value[1]
      }
    });
  }

  private insertComponent(component: AbstractComponent) {
    if (this.editorController.readonly || !this.selection.rangeCount) {
      return;
    }
    const firstRange = this.selection.firstRange;
    const startFragment = firstRange.startFragment;
    const parentComponent = startFragment.parentComponent;
    if (component instanceof LeafAbstractComponent && !component.block) {
      startFragment.insert(component, firstRange.endIndex);
    } else {
      if (parentComponent instanceof DivisionAbstractComponent) {
        const parentFragment = parentComponent.parentFragment;
        if (!parentFragment) {
          startFragment.insert(component, firstRange.startIndex);
          return;
        }
        const firstContent = startFragment.getContentAtIndex(0);
        parentFragment.insertAfter(component, parentComponent);
        if (!firstContent || startFragment.length === 1 && firstContent instanceof BrComponent) {
          const index = parentFragment.indexOf(parentComponent);
          parentFragment.cut(index, index + 1);
        }
      } else if (parentComponent instanceof BranchAbstractComponent &&
        startFragment.length === 1 &&
        startFragment.getContentAtIndex(0) instanceof BrComponent) {
        startFragment.clean();
        startFragment.append(component);
      } else {
        startFragment.insert(component, firstRange.endIndex);
      }
    }
    let position: TBRangePosition;
    if (component instanceof DivisionAbstractComponent) {
      position = firstRange.findFirstPosition(component.slot);
    } else if (component instanceof BranchAbstractComponent) {
      position = firstRange.findFirstPosition(component.slots[0]);
    } else if (component instanceof BackboneAbstractComponent) {
      position = firstRange.findFirstPosition(component.getSlotAtIndex(0))
    } else {
      position = {
        fragment: component.parentFragment,
        index: component.parentFragment.indexOf(component)
      }
    }
    firstRange.setStart(position.fragment, position.index);
    firstRange.collapse();
    // this.selection.removeAllRanges(true);
  }

  private addExample(example: ComponentCreator) {
    const {wrapper, card} = ComponentStage.createViewer(example.example, example.name);
    card.addEventListener('click', () => {
      const t = example.factory(this.dialogManager, this.fileUploader);
      if (t instanceof AbstractComponent) {
        this.insertComponent(t);
      } else if (t instanceof Promise) {
        t.then(instance => {
          this.insertComponent(instance);
        });
      } else if (t instanceof Observable) {
        const sub = t.subscribe(instance => {
          this.insertComponent(instance);
          sub.unsubscribe();
        })
      }
    });
    return wrapper;
  }

  private static createViewer(content: string | HTMLElement, name: string) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('textbus-component-example-item');
    const card = document.createElement('div');
    card.classList.add('textbus-component-example');

    const exampleContent = document.createElement('div');
    exampleContent.classList.add('textbus-component-example-content');

    if (typeof content === 'string') {
      exampleContent.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      exampleContent.appendChild(content);
    }

    card.appendChild(exampleContent);

    const mask = document.createElement('div');
    mask.classList.add('textbus-component-example-mask');
    card.appendChild(mask);

    wrapper.appendChild(card);
    const nameWrapper = document.createElement('div');
    nameWrapper.classList.add('textbus-component-example-name');
    nameWrapper.innerText = name || '';
    wrapper.appendChild(nameWrapper);
    return {
      wrapper,
      card
    };
  }
}
