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
      this.width = 512;
      this.height = 512;

      this.firsttarget = [0, 0, 0];
      this.firstpos = [0, 0, 1];
      this.axisSize = 10;

      this.near = 0.02;
      this.far = 1000;

      this._initElements(parent);
    }

    async _initElements(/** @type {HTMLElement} */ parent) {
      console.log('_initElements');
/**
 * @type {HTMLCanvasElement}
 */
      const canvas = document.createElement('canvas');
      canvas.id = 'main';
      canvas.width = this.width;
      canvas.height = this.height;
      parent.appendChild(canvas);

      {
        const url = document.body.getAttribute('data-url');
        const res = await fetch(url || '');
        const ab = await res.arrayBuffer();
        const u8buf = new Uint8Array(ab);
        const hasFont = await this.reset(u8buf);
        if (hasFont) {
          const font = new Font();
          font.init(URL.createObjectURL(new Blob([ab])));
          return;
        }

        this.initGL(canvas);
        this.update();
      }
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
      const maxRange = Math.max(rads[0], rads[1]);

      const ang = fovdeg * Math.PI * 0.5 / 180;
      const radius = maxRange * 1.25 / Math.tan(ang) + rads[2];
      const pos = new THREE.Vector3(
        target.x,
        target.y,
        target.z + radius,
      );

      this.firsttarget = target.toArray();
      this.firstpos = pos.toArray();
      this.far = radius * 4;
      this.near = radius / 256.0;
      //this.axisSize = 100;

      const el = document.querySelector('.text0');
      if (el) {
        //el.textContent = `${ang}, ${target.y} ${target.z} ${pos.z}`;
      }

      this.control.target0.copy(target);
      this.control.position0.copy(pos);
      this.control.reset();

      console.log('adjustCamera', target, pos, fovdeg, ang);
    }

/**
 *
 */
    async reset(val) {
      let text = `text1, `;
      {
        try {
          const model = new GPB.Model();
          model.setLog((...args) => {
            console.log(...args);
          });
          const parsedGr = model.parseGPB(val.buffer);

          const hasFont = model._reftable.references.some(ref => {
            return ref.type === GPB.Reference.FONT;
          });
          if (hasFont) {
            return true;
          }

          console.log('%cparsed', 'color:deepskyblue',
            model, parsedGr);

          const maker = new GPB.Maker();
          const gr = maker.makeModel(model);
          this.gr = gr;
          this.scene?.add(gr);

          this.adjustCamera(
            gr?.userData?.cover,
            this.fovdeg,
          );

          text += `, ${'success'}, ${window.devicePixelRatio}`;
        } catch(e) {
          text += `, ${e.message}`;
        }

        const q = document.querySelector('.text1');
        if (q) {
          //q.textContent = text;
        }

      }
      return false;
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
      { // スタイル反映無し
        renderer.setSize(this.width, this.height, false);
      }

      const scene = new THREE.Scene();
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(this.fovdeg,
        this.width / this.height,
        this.near, this.far);
      this.camera = camera;
      {
        const pos = new THREE.Vector3(...this.firstpos);
        // 中心
        const target = new THREE.Vector3(...this.firsttarget);

        camera.position.copy(pos);
        camera.lookAt(target);

        const control = new THREE.OrbitControls(camera, canvas);
        this.control = control;
        control.target = target;

        const axes = new THREE.AxesHelper(this.axisSize);
        scene.add(axes);
      }

      {
        const light = new THREE.AmbientLight(0xcccccc);
        scene.add(light);
      }

      if (this.gr) { // 先にグループが生成されていたら追加する
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

