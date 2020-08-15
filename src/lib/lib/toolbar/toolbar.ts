import { Observable, Subject, Subscription } from 'rxjs';

import { HighlightState } from './help';
import {
  AdditionalHandler,
  AdditionalViewer,
  Tool,
  ToolConfig,
  ToolFactory,
  ToolType
} from './toolkit/_api';
import { Editor } from '../editor';
import { Keymap } from '../viewer/input';
import { Renderer, TBSelection } from '../core/_api';
import { SelectionMatchDelta } from './matcher/matcher';
import { createKeymapHTML } from '../uikit/uikit';

export class Toolbar {
  elementRef = document.createElement('div');
  onAction: Observable<{ config: ToolConfig, instance: Tool, params: any }>;
  readonly tools: Array<{ config: ToolConfig, instance: Tool }> = [];

  private actionEvent = new Subject<{ config: ToolConfig, instance: Tool, params: any }>();
  private toolWrapper = document.createElement('div');
  private additionalWorktable = document.createElement('div');
  private additionalWorktableContent = document.createElement('div');
  private additionalWorktableClose = document.createElement('div');
  private additionalWorktableCloseBtn = document.createElement('button');
  private keymapPrompt = document.createElement('div');

  private currentAdditionalWorktableViewer: AdditionalViewer;

  private subs: Subscription[] = [];

  constructor(private context: Editor,
              private config: (ToolFactory | ToolFactory[])[]) {
    this.onAction = this.actionEvent.asObservable();
    this.elementRef.classList.add('textbus-toolbar');
    this.toolWrapper.classList.add('textbus-toolbar-wrapper');
    this.additionalWorktable.classList.add('textbus-toolbar-additional-worktable');
    this.additionalWorktableContent.classList.add('textbus-toolbar-additional-worktable-content');
    this.additionalWorktableClose.classList.add('textbus-toolbar-additional-worktable-close');
    this.additionalWorktableCloseBtn.innerHTML = '&times;';
    this.additionalWorktableCloseBtn.type = 'button';
    this.keymapPrompt.classList.add('textbus-toolbar-keymap-prompt');

    this.additionalWorktableClose.append(this.additionalWorktableCloseBtn);
    this.additionalWorktable.append(this.additionalWorktableContent, this.additionalWorktableClose);
    this.elementRef.append(this.toolWrapper, this.additionalWorktable, this.keymapPrompt);

    this.createToolbar(config);

    this.elementRef.addEventListener('mouseover', (ev) => {
      const keymap = this.findNeedShowKeymapHandler(ev.target as HTMLElement);
      if (keymap) {
        try {
          const config: Keymap = JSON.parse(keymap);
          this.keymapPrompt.innerHTML = '';
          this.keymapPrompt.append(...createKeymapHTML(config));
          this.keymapPrompt.classList.add('textbus-toolbar-keymap-prompt-show');
          return;
        } catch (e) {

        }
      }
      this.keymapPrompt.classList.remove('textbus-toolbar-keymap-prompt-show');
    })
    this.additionalWorktableCloseBtn.addEventListener('click', () => {
      this.currentAdditionalWorktableViewer.destroy();
      this.additionalWorktableContent.innerHTML = '';
      this.additionalWorktable.classList.remove('textbus-toolbar-additional-worktable-show');
    })
  }

  updateHandlerState(selection: TBSelection, renderer: Renderer, sourceCodeModal: boolean) {
    this.tools.forEach(tool => {
      let s: SelectionMatchDelta;
      if (typeof tool.instance.updateStatus === 'function') {
        s = sourceCodeModal && !tool.config.supportSourceCodeModel ? {
          srcStates: [],
          matchData: null,
          state: HighlightState.Disabled
        } : tool.config.matcher?.queryState(selection, renderer, this.context);
        if (s) {
          tool.instance.updateStatus(s);
        }
      }
    })
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private findNeedShowKeymapHandler(el: HTMLElement): string {
    if (el === this.elementRef) {
      return;
    }
    if (el.dataset.keymap) {
      return el.dataset.keymap;
    }
    return this.findNeedShowKeymapHandler(el.parentNode as HTMLElement);
  }

  private createToolbar(handlers: (ToolFactory | ToolFactory[])[]) {
    if (Array.isArray(handlers)) {
      handlers.forEach(handler => {
        const group = document.createElement('span');
        group.classList.add('textbus-toolbar-group');
        if (Array.isArray(handler)) {
          this.createHandlers(handler).forEach((el: Tool) => group.appendChild(el.elementRef));
        } else {
          group.appendChild(this.createHandler(handler).elementRef);
        }
        this.toolWrapper.appendChild(group);
      });
      this.listenUserAction();
    }
  }

  private createHandlers(handlers: ToolFactory[]): Tool[] {
    return handlers.map(handler => {
      return this.createHandler(handler);
    });
  }

  private createHandler(option: ToolFactory): Tool {
    let h: Tool;
    switch (option.type) {
      case ToolType.Button:
        h = option.factory();
        break;
      case ToolType.Select:
        h = option.factory(this.toolWrapper);
        break;
      case ToolType.Dropdown:
        h = option.factory(this.context, this.toolWrapper);
        break;
      case ToolType.ActionSheet:
        h = option.factory(this.toolWrapper);
        break;
      case ToolType.Additional:
        h = option.factory();
        this.subs.push((<AdditionalHandler>h).onShow.subscribe(viewer => {
          this.currentAdditionalWorktableViewer = viewer;
          this.additionalWorktableContent.innerHTML = '';
          this.additionalWorktable.classList.add('textbus-toolbar-additional-worktable-show');
          this.additionalWorktableContent.appendChild(viewer.elementRef);
        }));
        break;
      case ToolType.Group:
        const m = option.factory(this.context, this.toolWrapper);
        this.tools.push(...m.tools);
        h = m;
        break;
      default:
        throw new Error('未被支持的工具！');
    }
    if (h.keymapAction) {
      const keymaps = Array.isArray(h.keymapAction) ? h.keymapAction : [h.keymapAction];
      keymaps.forEach(k => {
        this.context.registerKeymap(k);
      });
    }
    this.tools.push({
      config: option.config,
      instance: h
    });
    return h;
  }

  private listenUserAction() {
    this.tools.forEach(item => {
      if (item.instance.onApply instanceof Observable) {
        item.instance.onApply.subscribe(params => {
          this.actionEvent.next({
            ...item,
            params
          });
        })
      }
    });
  }
}
