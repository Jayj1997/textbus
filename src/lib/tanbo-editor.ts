import { Core } from './lib/core';
import { boldHandler } from './lib/formats/bold';
import { italicHandler } from './lib/formats/italic';
import { strikeThroughHandler } from './lib/formats/strike-through';
import { underlineHandler } from './lib/formats/underline';
import { hHandler } from './lib/formats/h';
import { blockquoteHandler } from './lib/formats/blockquote';
import { codeHandler } from './lib/formats/code';
import { olHandler } from './lib/formats/ol';
import { ulHandler } from './lib/formats/ul';
import { superscriptHandler } from './lib/formats/superscript';
import { subscriptHandler } from './lib/formats/subscript';
import { backgroundHandler } from './lib/formats/background';
import { colorHandler } from './lib/formats/color';
import { fontFamilyHandler } from './lib/formats/font-family';

export * from './public-api';

export function createEditor(selector: string | HTMLElement) {
  return new Core(selector, {
    handlers: [
      hHandler, [
        boldHandler,
        italicHandler,
        strikeThroughHandler,
        underlineHandler,
      ], [
        blockquoteHandler,
        codeHandler
      ], [
        olHandler,
        ulHandler
      ], [
        superscriptHandler,
        subscriptHandler
      ], [
        backgroundHandler,
        colorHandler
      ], fontFamilyHandler
    ]
  });
}
