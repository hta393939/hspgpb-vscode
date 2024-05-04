/**
 * @file gpbthree.js
 */
// need threejs
// threejs が必要
// gpb.js が必要

(function(_global) {

const log = {
  log: console.log.bind(null),
};

/**
 * threejs モデルを生成する
 */
class Maker {
/**
 * コンストラクター
 */
  constructor() {
  }

/**
 * 
 * @param {number} usage 
 * @returns {string}
 */
  attrtothree(usage) {
    const usagetoattrname = [
      '0', 'position', 'normal', 'color',
      '4', '5', 'skinWeight', 'skinIndices',
      'uv', '9', '10', '11',
      '12', '13', '14', '15',
    ];
    return usagetoattrname[usage];
  }

/**
 * GPB.Model から threejs グループを生成する
 * @param {GPB.Model}
 * @returns {THREE.Group}
 */
  makeModel(inmodel) {
    const gr = new THREE.Group();
    gr.userData.gpbmodel = inmodel;
    gr.userData.parts = [];
    {
      { // メッシュ
        const meshNum = inmodel._meshes.length;
        log.log('meshNum', meshNum);

        for (let i = 0; i < meshNum; ++i) {
          const gpbmesh = inmodel._meshes[i];
/**
 * 1メッシュの1ジオメトリ。
 * 複数のパートから参照される可能性がある。
 */
          const geo = new THREE.BufferGeometry();
          for (const attr of gpbmesh.attrs) {
            geo.setAttribute(this.attrtothree(attr.usage),
              new THREE.BufferAttribute(attr.buf, attr.size));
          }

// 範囲と半径
          const ranges = gpbmesh.bounds;
//                    log.log('ranges', ranges);
          {
            log.log('最小', ranges.min);
            log.log('最大', ranges.max);
            log.log('中心', ranges.center);
            log.log('半径', ranges.radius);
          }

          for (const part of gpbmesh.parts) {
            const onegeo = geo.clone();
            onegeo.setIndex(new THREE.BufferAttribute(part.fis, 1));
            const mtl = new THREE.MeshStandardMaterial();
            const m = new THREE.Mesh(onegeo, mtl);

            //gr.userData.parts.push(m);
            gr.add(m);
          }
        }
      }

      { // シーン 非実装
      }

      if (false && inmodel._animations) { // アニメ 非実装
        log.log('animation chunk');
        for (let i = 0; i < numanim; ++i) {
          const obj = {};
          gr.userData.anims.push(obj);

          const name = this.rs(p);
          obj.name = name;
          obj.targets = [];

          const num = this.r32s(p, 1)[0];
          for (let j = 0; j < num; ++j) {
            const targetobj = {};
            obj.targets.push(targetobj);

            targetobj.targetname = this.rs(p);

            targetobj.attr = this.r32s(p, 1)[0];
            const numtime = this.r32s(p, 1)[0];
            targetobj.times = this.r32s(p, numtime);
            //console.log('targetname', targetobj.targetname);

            const valnum = this.r32s(p, 1)[0];
            const vals = this.rfs(p, valnum);
            targetobj.vals = vals;
            targetobj.keys = [];
            if (targetobj.attr === 17) {
              const minnum = Math.min(numtime, Math.floor(valnum / 10));
              let ft = 0;
              for (let k = 0; k < minnum; ++k) {
                const pqs = {
                  time: targetobj.times[k],
                  scale: [vals[ft], vals[ft+1], vals[ft+2]],
                  q: [vals[ft+3], vals[ft+4], vals[ft+5], vals[ft+6]],
                  p: [vals[ft+7], vals[ft+8], vals[ft+9]],
                };
                ft += 10;
                targetobj.keys.push(pqs);
              }
            }
          }
        }
      }

      console.log('makeModel end');
    }
    return gr;
  }

}

_global.GPB = _global.GPB || {};
_global.GPB.Maker = Maker;

} )(globalThis);


