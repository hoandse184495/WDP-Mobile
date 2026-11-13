import runtime from '../../../../assets/models/viewer-runtime.json';
import type { SurfaceLocation } from './surface-location';
export function viewerHtml(
  model: string,
  channel: string,
  marker: SurfaceLocation | null,
  canPick: boolean,
) {
  const config = JSON.stringify({ model, channel, marker, canPick }).replace(/</g, '\\u003c');
  return (
    '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; connect-src data: blob:;"><style>html,body{height:100%;margin:0;background:#f3f6f5;font:13px system-ui;color:#182e29}#canvas{height:calc(100% - 92px);touch-action:none}#bar{height:56px;display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap}button{background:#fff;border:1px solid #cbd9cf;border-radius:7px;padding:8px 7px;color:#14745b}button[aria-pressed=true]{background:#e1d6ff}#status{height:32px;text-align:center;padding:2px 8px;font-size:11px}canvas{display:block}</style></head><body><div id="canvas"></div><div id="bar"><button data-view="overview">Tổng thể</button><button data-view="left">Trái</button><button data-view="right">Phải</button><button data-view="front">Trước</button><button data-view="back">Sau</button><button id="mark" aria-pressed="false">Đánh dấu vị trí</button></div><div id="status">Đang tải mô hình…</div><script>window.__HORSE_CONFIG__=' +
    config +
    ';<\/script><script>' +
    runtime.script.replace(/<\/script/gi, '<\\/script') +
    '<\/script></body></html>'
  );
}
