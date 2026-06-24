import { GameScene } from './GameScene';
import { keepFieldUiReadable } from '../game/readableCamera';

export class ChapterOneFieldScene extends GameScene {
  create(): void {
    super.create();
    keepFieldUiReadable(this);
  }
}
