/**
 * @file gpbreplacer.js
 */

(function(_global) {

const log = {
    log: console.log.bind(null),
};

/**
 * .gpb アニメ入れ替え
 */
class Replacer extends _global.GPB.Model {
/**
 * コンストラクター
 */
    constructor() {
        this.cl = this.constructor.name;

        this.creator = null;
/**
 * ファイル全体の先頭からのオフセットカーソル位置
 * @type {number}
 */
        this.cur = 0;
    }

/**
 * .material ファイルの解析をセットする
 * @param {*} creator 
 */
    setMaterials(creator) {
        this.creator = creator;
    }

/**
 * 文字列取り出す
 * @param {DataView} p 
 * @param {number} inc 
 * @returns {string}
 */
    rs(p) {
        const len = p.getUint32(this.cur, true);
        if (len >= 65536) {
            throw new Error('Over 65536');
        }

        this.cur += 4;

        const ab = new Uint8Array(len);
        const src = new Uint8Array(p.buffer, this.cur, len);
//        ab.set(src);

        this.cur += len;

        return new TextDecoder().decode(src);
    }

/**
 * float 32bit 複数読み出し
 * @param {DataView} p 
 * @param {number} num 
 * @returns {Float32Array}
 */
    rfs(p, num) {
        const ret = new Float32Array(num);
        for (let i = 0; i < num; ++i) {
            ret[i] = p.getFloat32(this.cur, true);
            this.cur += 4;
        }
        return ret;
    }

/**
 * 8bit 符号無し整数複数読み出し
 * @param {DataView} p 
 * @returns {Uint8Array}
 */
    r8s(p, num) {
        const ret = new Uint8Array(num);
        for (let i = 0; i < num; ++i) {
            ret[i] = p.getUint8(this.cur);
            this.cur += 1;
        }
        return ret;
    }

/**
 * 16bit 符号無し整数複数読み出し
 * @param {DataView} p 
 * @returns {Uint16Array}
 */
    r16s(p, num) {
        const ret = new Uint16Array(num);
        for (let i = 0; i < num; ++i) {
            ret[i] = p.getUint16(this.cur, true);
            this.cur += 2;
        }
        return ret;
    }

/**
 * 32bit 符号在り整数複数読み出し
 * @param {DataView} p 
 * @param {number} 個数
 * @returns {Int32Array}
 */
    r32s(p, num) {
        const ret = new Int32Array(num);
        for (let i = 0; i < num; ++i) {
            ret[i] = p.getInt32(this.cur, true);
            this.cur += 4;
        }
        return ret;
    }

/**
 * 現在カーソルのダンプ
 */
    dumpPos(...args) {
        let s = this.cur.toString(16).padStart(4, '0');
        log.log(`hex: 0x${s}`, ...args);
    }

/**
 * 
 * @param {DataView} p 
 * @param {Function} onErr 
 * @returns {Object}
 */
    parse(p, onErr) {
        const gr = { userData: {} };
        gr.userData.gpbscene = {};
        gr.userData.anims = [];
        {

            const model = {
                chunks: [],
                meshes: [],
            };

            let c = 0;
            { // マテリアル

            }

            { // ヘッダーとチャンク
                this.cur = 11;

                const chunkNum = this.r32s(p, 1)[0];
                log.log('chunkNum', chunkNum);
                for (let i = 0; i < chunkNum; ++i) {
                    const obj = {
                        name: this.rs(p),
                        type: this.r32s(p, 1)[0],
                        offset: this.r32s(p, 1)[0],
                    };
                    model.chunks.push(obj);
                }
            }
            { // メッシュ
                const meshNum = this.r32s(p, 1)[0];
                log.log('meshNum', meshNum);

                for (let i = 0; i < meshNum; ++i) {
/**
 * オブジェクト
 */
                    const mesh = {
                        attrs: [],

                        geo: new THREE.BufferGeometry(),
                        mtl: new THREE.MeshStandardMaterial(),            
                    };
                    model.meshes.push(mesh);

                    const anum = this.r32s(p, 1)[0];
                    let sum = 0;
                    for (let j = 0; j < anum; ++j) {
                        const ns = this.r32s(p, 2);
                        const at = {
                            usage: ns[0],
                            size: ns[1],
                            threeattr: this.usagetoattrname[ns[0]],
                        };
                        mesh.attrs.push(at);

                        sum += at.size;
                    }
                    log.log('attr数', anum, sum);

                    const vtxbyte = this.r32s(p, 1)[0];
                    const vtxnum = vtxbyte / (sum * 4);
                    if (true) {
                        for (let k = 0; k < anum; ++k) {
                            const at = mesh.attrs[k];
                            at.buf = new Float32Array(at.size * vtxnum);
                        }

                        for (let j = 0; j < vtxnum; ++j) {
                            const vtx = this.rfs(p, sum);
                            let offset = 0;

                            for (let k = 0; k < anum; ++k) {
                                const at = mesh.attrs[k];

                                const num = at.size;
                                for (let l = 0; l < num; ++l) {
                                    at.buf[j * num + l] = vtx[offset];
                                    offset ++;
                                }
                            }
                        }
                        log.log('vtxnum', vtxnum);

                        for (let k = 0; k < anum; ++k) {
                            const at = mesh.attrs[k];
                            mesh.geo.setAttribute(at.threeattr, new THREE.BufferAttribute(at.buf, at.size));
                        }

                    } else {
                        this.cur += vtxbyte; // 読まずにスキップする場合
                    }

// 範囲と半径
                    const ranges = this.rfs(p, 10);
//                    log.log('ranges', ranges);
                    {
                        log.log('最小', [ranges[0], ranges[1], ranges[2]]);
                        log.log('最大', [ranges[3], ranges[4], ranges[5]]);
                        log.log('中心', [ranges[6], ranges[7], ranges[8]]);
                        log.log('半径', ranges[9]);
                    }

                    log.log('partnum pos', -1);

                    const partnum = this.r32s(p, 1)[0];
                    log.log('partnum', partnum);

                    for (let j = 0; j < partnum; ++j) {
                        const fiattr = this.r32s(p, 3);
                        log.log('0x', fiattr[0].toString(16), fiattr[1].toString(16));

                        let fis = [];
                        if (fiattr[1] === this.GL_UNSIGNED_SHORT) {
                            fis = this.r16s(p, fiattr[2] / 2);
                            log.log('fis16', fis);
                        } else {
                            fis = this.r32s(p, fiattr[2] / 4);
                            log.log('fis32', fis);
                        }
                        mesh.geo.setIndex(new THREE.BufferAttribute(fis, 1));

                        const indexmax = Math.max(...fis);
                        log.log('indexmax', indexmax); // 範囲チェック向け
                    }

                    //gr.add(mesh.mesh); // TODO: 違う方法で追加すること
                }
            }
            const blockNum = this.r32s(p, 1)[0];
            this.dumpPos('blockNum 後 シーン前', blockNum);
            { // シーン
                gr.userData.gpbscene.nodes = [];

                const cnum = this.r32s(p, 1)[0];
                for (let i = 0; i < cnum; ++i) {
                    const node = this.readNode(p);

                    gr.userData.gpbscene.nodes.push(node);
                }

                const cameraName = this.rs(p);
                const acs = this.rfs(p, 3);

                gr.userData.gpbscene.cameraName = cameraName;
                gr.userData.gpbscene.ambientColors = acs;
            }
            this.dumpPos('シーン終了anim前');

            if (blockNum >= 2) { // アニメ
                log.log('animation chunk');

                const numanim = this.r32s(p, 1)[0];
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

                        const b = this.r32s(p, 1)[0];
                        targetobj.bs = this.rfs(p, b);
                        const c = this.r32s(p, 1)[0];
                        targetobj.cs = this.rfs(p, c);
                        const d = this.r32s(p, 1)[0];
                        targetobj.ds = this.rfs(p, d);
                    }
                }
            }

            console.log('ファイル最終位置', this.cur, '/', p.byteLength);

            log.log('model', model);
        }
        return gr;
    }

/**
 * ノード読み込み
 * @param {DataView} p 
 * @returns {GPBNode}
 */
    readNode(p) {
        log.log('readNode called');
        this.dumpPos();

        const node = {
            children: [],
            materials: [],
        };

        node.nodetype = this.r32s(p, 1)[0];
        node.matrix = this.rfs(p, 16);
        node.parentname = this.rs(p);

        const cnum = this.r32s(p, 1)[0];
        for (let i = 0; i < cnum; ++i) {
            const cnode = this.readNode(p);
            node.children.push(cnode);
        }

        node.camlight = this.r8s(p, 2); // カメラ、ライト

        node.modelname = this.rs(p);

        if (node.modelname !== '') {
            console.log('モデル名', node.modelname);

            node.isskin = this.r8s(p, 1)[0]; // スキン
            if (node.isskin > 0) {
                console.log('スキンあるよ');

                this.rfs(p, 16);

                const jointnum = this.r32s(p, 1)[0];
                for (let i = 0; i < jointnum; ++i) {
                    const jointname = this.rs(p);
                    console.log('参照ジョイント名 for 行列', 'jointname', jointname);
                }

                const bpnum = this.r32s(p, 1)[0];
                this.rfs(p, bpnum);
            }

            const mtlnum = this.r32s(p, 1)[0];
            this.dumpPos('mtlnum', mtlnum);
            for (let i = 0; i < mtlnum; ++i) {
                const mtlname = this.rs(p);
                node.materials.push(mtlname);

                console.log('参照材質', 'mtlname', mtlname);
            }
        }

        log.log('readNode leave', node);
        return node;
    }

/**
 * API. 
 * @param {string} inurl 
 * @param {Function} onLoad 
 * @param {Function} onProgress 
 * @param {Function} onErr 
 */
    load(inurl, onLoad, onProgress, onErr) {
        const f_ = async () => {
            const res = await fetch(inurl);
            const ab = await res.arrayBuffer();

            const p = new DataView(ab);

            const gr = this.parse(p, onErr);
            onLoad(gr);
        };
        f_();
    }

/**
 * 
 * @param {ArrayBuffer} infile 
 * @param {{}[]} anims 
 * @returns {(ArrayBuffer | Blob)[]}
 */
    replace(infile, anims) {
        const p = new DataView(infile);

// アニメーションの部分を作る
// アニメーションのところを書き換えたい

        return [null, null];
    }

}

_global.GPB = _global.GPB || {};
_global.GPB.Replacer = Replacer;

} )(globalThis);


