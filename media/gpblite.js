// @ts-check

// レンダラ(webview)で動作するスクリプト
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

/**
 * 編集機能は持たない
 */
  class GpbLite {
    constructor( /** @type {HTMLElement} */ parent) {
      this._initElements(parent);
    }

    _initElements(/** @type {HTMLElement} */ parent) {
/**
 * @type {HTMLCanvasElement}
 */
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      parent.appendChild(canvas);

      {
        const c = canvas.getContext('2d');
        if (c) {
          c.fillStyle = 'red';
          c.fillRect(5, 5, 800, 400);
          c.fillStyle = 'gray';
          c.fillText('gpblite \u{1f527} gpblite', 480, 270);
        }
      }

      parent.addEventListener('mousedown', () => {
        return;
      });

      document.body.addEventListener('mouseup', async () => {
        return;
      });

      parent.addEventListener('mousemove', e => {
      });
    }

    _redraw() {

      return;
    }

/**
 *
 */
    async reset(val) {
      let text = `${typeof val}, ${val}`;
      vscode.window.showInformationMessage(text);
      console.log('val', val);

      //const model = new GPB.Model();
      //model.parse();

      this._redraw();
    }
  }

  const editor = new GpbLite(document.querySelector('.drawing-canvas'));

  // メッセージ処理 from the extension
  window.addEventListener('message', async e => {
    const { type, body } = e.data;
    switch (type) {
      case 'init':
            // 既存のバイナリで初期化
        await editor.reset(body.value);
        return;
    }
  });

  // レンダラプロセスが準備できたことをメインプロセスへ通知する
  vscode.postMessage({ type: 'ready' });
}());

