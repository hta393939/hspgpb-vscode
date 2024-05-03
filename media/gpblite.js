// @ts-check

// This script is run within the webview itself
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

/**
 * 編集機能は持たない
 */
  class GpbLite {
    constructor( /** @type {HTMLElement} */ parent) {
      this.ready = false;
      this._initElements(parent);
    }

    _initElements(/** @type {HTMLElement} */ parent) {
      const colorButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.drawing-controls button'));
      for (const colorButton of colorButtons) {
        colorButton.addEventListener('click', e => {
          e.stopPropagation();
          colorButtons.forEach(button => button.classList.remove('active'));
          colorButton.classList.add('active');
          this.drawingColor = colorButton.dataset['color'];
        });
      }

      this.wrapper = document.createElement('div');
      this.wrapper.style.position = 'relative';
      parent.append(this.wrapper);

      this.initialCanvas = document.createElement('canvas');
      this.initialCtx = this.initialCanvas.getContext('2d');
      this.wrapper.append(this.initialCanvas);

      this.drawingCanvas = document.createElement('canvas');
      this.drawingCanvas.style.position = 'absolute';
      this.drawingCanvas.style.top = '0';
      this.drawingCanvas.style.left = '0';
      this.drawingCtx = this.drawingCanvas.getContext('2d');
      this.wrapper.append(this.drawingCanvas);

      parent.addEventListener('mousedown', () => {
        return;
      });

      document.body.addEventListener('mouseup', async () => {
        return;
      });

      parent.addEventListener('mousemove', e => {
        if (!isDrawing || !this.ready || !this.editable) {
          return;
        }
        const rect = this.wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
      });
    }

    _redraw() {
      return;
    }

    /**

     */
    async reset() {
      this._redraw();
    }
  }

  const editor = new GpbLite(document.querySelector('.drawing-canvas'));

  // メッセージ処理 from the extension
  window.addEventListener('message', async e => {
    const { type, body } = e.data;
    switch (type) {
      case 'init':
        {
          if (body.untitled) { // 初期バイナリで初期化
            await editor.resetUntitled();
            return;
          } else {
            // 既存のバイナリで初期化
            await editor.reset(body.value);
            return;
          }
        }
    }
  });

  // レンダラプロセスが準備できたことをメインプロセスへ通知する
  vscode.postMessage({ type: 'ready' });
}());

