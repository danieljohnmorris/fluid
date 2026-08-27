import { createRenderer } from './renderer';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const notice = document.getElementById('notice') as HTMLElement;

if (!('gpu' in navigator)) {
  notice.hidden = false;
} else {
  createRenderer({ canvas });
}
