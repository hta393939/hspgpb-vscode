/**
 * @file renderer.js
 */
// need threejs

(function(_global) {

class Renderer {
    constructor() {

    }

    async init(param) {
        const renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true,
            canvas: param.canvas,
        });
        this.renderer = renderer;

        const scene = new THREE.Scene();
        this.scene = scene;

        { // hgimg4 のデフォルトは fov 45度
            const camera = new THREE.PerspectiveCamera(45, 1.5, 0.5, 768);
            this.camera = camera;
            camera.position.set(1, 2, 5);
            camera.lookAt(new THREE.Vector3(0, 1, 0));
        }

        { // object, dom
            const control = new THREE.OrbitControls(this.camera, renderer.domElement);
            this.control = control;
        }

        {
            const light = new THREE.DirectionalLight();
            scene.add(light);
        }
        
        if (false) { // object, dom
            const control = new THREE.TrackballControls(this.camera, param.canvas);
            this.control = control;
        }

        {
            const grid = new THREE.GridHelper(20, 10);
            grid.name = 'grid';
            scene.add(grid);
        }
    }

/**
 * 外部から呼ぶ
 */
    update() {
        if (this.control) {
            this.control.update();
        }

        if (this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

}

_global.Renderer = Renderer;

})(globalThis);


