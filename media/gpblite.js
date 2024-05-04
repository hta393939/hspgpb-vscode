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
      this.fovdeg = 45;

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

    adjustCamera(cover, fovdeg) {
      if (!cover) {
        return;
      }

      const target = new THREE.Vector3().fromArray([0, 1, 2].map(
          index => (cover.max[index] + cover.min[index]) * 0.5
      ));
      const rads = [0, 1, 2].map(index => {
        return (cover.max[index] - cover.min[index]) * 0.5;
      });

      const ang = fovdeg * Math.PI * 0.5 / 180;
      const pos = new THREE.Vector3(
        target.x,
        target.y,
        target.z + rads[1] / Math.tan(ang) + rads[2]
      );

// 軸長さ評価するか??
        //axisSize = 100;

      const el = document.querySelector('.text0');
      if (el) {
        el.textContent = `${ang}, ${target.y} ${target.z} ${pos.z}`;
      }

      this.control.target0.copy(target);
      this.control.position0.copy(pos);
      this.control.reset();
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

          this.adjustCamera(
            gr?.userData?.cover,
            this.fovdeg,
          );

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

      const camera = new THREE.PerspectiveCamera(this.fovdeg,
        4 / 3,
        0.02, 1000);
      this.camera = camera;
      {
        let axisSize = 10;
        const pos = new THREE.Vector3(1, 1, 5);
        // 中心
        const target = new THREE.Vector3(0, 1, 0);

        camera.position.copy(pos);
        camera.lookAt(target);

        const control = new THREE.OrbitControls(camera, canvas);
        this.control = control;
        control.target = target;

        const axes = new THREE.AxesHelper(axisSize);
        scene.add(axes);
      }

      {
        const light = new THREE.AmbientLight(0xcccccc);
        scene.add(light);
      }

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

