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
      this.gr = null;

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

      this.initGL(canvas);
      this.update();
    }

/**
 *
 */
    async reset(val) {
      {
        const q = document.querySelector('.text0');
        if (q) {
          q.textContent = `${val}, ${val.length}, ${val.byteLength}`;
        }
      }

      let text = `text1, `;
      {
        try {
          const model = new GPB.Model();
          model.parseGPB(val.buffer);

          const maker = new GPB.Maker();
          const gr = maker.makeModel(model);
          this.gr = gr;
          this.scene?.add(gr);

          text += `, ${'success'}`;
        } catch(e) {
          text += `, ${e.message}`;
        }

        const q = document.querySelector('.text1');
        if (q) {
          q.textContent = text;
        }

      }

      //vscode.window.showInformationMessage(text);
      text = `${window.THREE ? true : false}, ${window.THREE?.OrbitControls ? true : false}`;
      //vscode.window.showInformationMessage(text);
      {
        const q = document.querySelector('.text2');
        if (q) {
          q.textContent = text;
        }
      }


      this._redraw();
    }

    update() {
      requestAnimationFrame(() => {
        this.update();
      });

      this.control?.update();
      this.renderer?.render(this.scene, this.camera);
    }

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 */
    initGL(canvas) {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        preserveDrawingBuffer: true,
      });
      this.renderer = renderer;
      {
        renderer.setSize(960, 540);
      }

      const scene = new THREE.Scene();
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(45,
        4 / 3,
        0.02, 1000);
      this.camera = camera;
      {
        camera.position.set(1, 1, 5);
        camera.lookAt(new THREE.Vector3(0, 1, 0));
      }

      {
        const light = new THREE.AmbientLight(0xcccccc);
        scene.add(light);
      }

      {
        const axes = new THREE.AxesHelper(10);
        scene.add(axes);
      }

      const control = new THREE.OrbitControls(camera, canvas);
      this.control = control;

      if (this.gr) {
        scene.add(this.gr);
      }
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

