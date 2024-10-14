/**
 * @file gpb.js
 */

(function(_global) {

const log = {
  log: () => {},
};

/**
 * .material の material 記述
 */
class MaterialDesc {
  constructor() {
    this.name = '';
/**
 * 直接の派生元がある場合
 * @type {string}
 */
    this.superName = '';
/**
 * これまでの { の個数。} が来たら減らす
 */
    this._level = 0;

    // その他のプロパティを保持する
  }
}

/**
 * ノードクラス
 */
class GPBNode {
/**
 * コンストラクタ
 */
  constructor() {
/**
 * ノード(ノード)
 * @default 1
 */
    this.NODE_NODE = 1;
/**
 * ノード(ジョイント)
 * @default 2
 */
    this.NODE_JOINT = 2;
/**
 * ノードタイプ。<br />
 * 1: ノードノード<br />
 * 2: ジョイントノード
 * @type {number}
 */
    this.nodetype = + this.NODE_NODE;
/**
 * 16要素配列
 * @type {number[]}
 */
    this.matrix = [];
/**
 * 親ノード名(# つかない)
 * @default ""
 */
    this.parentname = '';
/**
 * カメラがあるか。ライトがあるか。
 */
    this.camlight = [0, 0];
/**
 * モデル名(メッシュ参照名、# で始まる)
 * @default ""
 */
    this.modelname = '';
/**
 * 1 だとスキンを持っている
 */
    this.isskin = 0;

/**
 * 子ノード
 * @type {GPBNode[]}
 */
    this.children = [];
/**
 * 材質配列(# つかない)
 * @type {string[]}
 */
    this.materials = [];
  }
}

class AnimationChannel {
  constructor() {
/**
 * @type {string}
 */
    this._targetId = '';
/**
 * @type {string}
 */
    this._targetAttrib = '';

    this._keytimes = [];
    this._values = [];
/**
 * @type {number[]}
 */
    this.tangentsIn = [];
/**
 * @type {number}
 */
    this.tangentsOut = [];
/**
 * @type {number[]}
 */
    this.interpolations = [];
  }
}

class Animation {
  constructor() {
    this.id = '';
/**
 * @type {AnimationChannel[]}
 */
    this.channels = [];
  }
}

/**
 * 1つの animations チャンク
 */
class Animations {
  constructor() {
    this.id = '';
/**
 * @type {Animation[]}
 */
    this.animations = [];
  }
}



class Node {
  constructor() {
    this.id = '';
    this.type = '';
    this.transform = [];
    /**
     * @type {Node[]}
     */
    this.children = [];

    /**
     * 読み取り個数
     */
    this._childnum = 0;
  }
}

class Joint extends Node {
  constructor() {
    super();

    this.type = 'JOINT';
  }
}

class Scene {
  constructor() {
    this.id = '';
/**
 * @type {Node[]}
 */
    this.nodes = [];

/**
 * @type {string}
 */
    this.cameraName = '';
/**
 * @type {number[]}
 */
    this.ambientColor = [0, 0, 0];
  }
}

class Vertex {
  constructor() {
    this.position = [0, 0, 0];
    this.normal = [0, 0, 1];
    this.uv = [0, 0];
    this.joints = [0, 0, 0, 0];
    this.weights = [1, 0, 0, 0];
  }
}

class VertexElement {
/**
 * usage
 */
  static POSITION = 'POSITION';
  static NORMAL = 'NORMAL';
  static UV0 = 'TEXCOORD0';
  static WEIGHTS = 'BLENDWEIGHTS';
  static INDICES = 'BLENDINDICES';
  constructor() {
/**
 * 用途
 */
    this.usage = 0;
/**
 * 値の個数
 */
    this.size = 0;
/**
 * この属性の数値を一直線に並べたもの
 */
    this.buf = new Float32Array(0);
  }
}

class Bounds {
  constructor() {
    this.max = [0, 0, 0];
    this.min = [0, 0, 0];
    this.center = [0, 0, 0];
    this.radius = 0;
  }
}

class Part {
/**
 * u16 面頂点の型
 * @default 0x1403
 */
  static GL_UNSIGNED_SHORT = 0x1403;

  static GL_TRIANGLES = 4;
  /**
   * 始点終点
   */
  static GL_LINES = 1;
  static GL_POINTS = 0;

  static primmap = {
    [Part.GL_POINTS]: 'GL_POINTS',
    [Part.GL_LINES]: 'GL_LINES',
    [Part.GL_TRIANGLES]: 'GL_TRIANGLES',
  };

  constructor() {
/**
 * 1つめ
 */
    this.primitiveType = Part.GL_TRIANGLES;
/**
 * 面頂点インデックスの要素型(u16 or u32)
 * @default {Part.GL_UNSIGNED_SHORT}
 */
    this.faceIndexElement = Part.GL_UNSIGNED_SHORT;
/**
 * 一直線の頂点インデックス
 * @type {number[]}
 */
    this.fis = [];
  }    
}

/**
 * 1つ分のメッシュ
 */
class Mesh {
  constructor() {
    this.id = '';
/**
 * 属性
 * @type {VertexElement[]}
 */
    this.attrs = [];

    this.bounds = new Bounds();

/**
 * @type {Part[]}
 */
    this.parts = [];
  }
}

/**
 * チャンクへの参照
 * https://dev.onionsoft.net/trac/openhsp/browser/trunk/hsp3dish/gameplay/src/Bundle.cpp
 */
class Reference {
  static SCENE = 1;
  static NODE = 2;
  static ANIMATIONS = 3;
  static MESH = 34;
  static FONT = 128;
  constructor() {
    this.xref = '';
    this.name = '';
    this.type = 0;
    this.offset = 0;
  }
}

class RefTable {
  constructor() {
/**
 * 参照を格納する
 * @type {Reference[]}
 */
    this.references = [];
  }
}


/**
 * .gpb パーサーにしたい
 */
class Model {

  /**
   * コンストラクター
   */
  constructor() {
    /**
     * @type {RefTable}
     */
    this._reftable = new RefTable();
    /**
     * @type {Mesh[]}
     */
    this._meshes = [];
    /**
     * @type {Scene}
     */
    this._scene = new Scene();
    /**
     * @type {Animations[]}
     */
    this._animations = [];



    this.creator = null;
    /**
     * ファイル全体の先頭からのオフセットカーソル位置
     * @type {number}
     */
    this.cur = 0;

    /**
     * 保持位置
     */
    this.markPos = 0;
  }

  /**
   * .material ファイルの解析をセットする
   * @param {*} creator 
   */
  setMaterials(creator) {
    this.creator = creator;
  }

  /**
   * UTF-8 とみなして文字列取り出す(not Shift_JIS)
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
    const src = new Uint8Array(p.buffer, this.cur, len);
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
    return this.cur;
  }

  mark() {
    this.markPos = + this.cur;
  }

  dumpMarkPos(...args) {
    let s = this.markPos.toString(16).padStart(4, '0');
    log.log(`hex: 0x${s}`, ...args);
    return this.markPos;
  }

  checkChunk(pos) {
    const num = this._reftable.references.length;
    const chunks = [];
    for (let i = 0; i < num; ++i) {
      const ref = this._reftable.references[i];
      if (ref.offset === pos) {
        log.log(`chunk match`, ref.name);
        return;
      }
      chunks.push({
        index: i,        
        ref,
      });
    }

    chunks.sort((a, b) => {
      return (a.ref.offset - b.ref.offset);
    });

    for (let i = 0; i < num; ++i) {
      const isOver = (chunks[i].ref.offset > pos);
      if (isOver || i === num - 1) {
        for (let j = (isOver ? 0 : 1); j < 2; ++j) {
          let index = i - 1 + j;
          if (index < 0 || num <= index) {
            continue;
          }
          const ref = chunks[index].ref;
          let s = ref.offset.toString(16).padStart(4, '0');
          log.log(`chunk no match, hex: 0x${s}`, ref.name);
        }
        return;
      }
    }

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
    gr.userData.hasFont = false;
    {
      { // マテリアル

      }

      { // ヘッダーとチャンク
        this.cur = 11;

        const chunkNum = this.r32s(p, 1)[0];
        log.log('chunkNum', chunkNum);
        for (let i = 0; i < chunkNum; ++i) {
          const ref = new Reference();
          Object.assign(ref, {
            name: this.rs(p),
            type: this.r32s(p, 1)[0],
            offset: this.r32s(p, 1)[0],
          });
          this._reftable.references.push(ref);

          if (ref.type === Reference.FONT) {
            gr.userData.hasFont = true;
          }
        }
      }

      if (gr.userData.hasFont) {
        return gr;
      }

      { // メッシュ
        this.mark();
        const meshNum = this.r32s(p, 1)[0];
        log.log('meshNum', meshNum);
        this.dumpMarkPos(`meshNum`, meshNum);

        for (let i = 0; i < meshNum; ++i) {
/**
 * オブジェクト
 */
          const gpbmesh = new Mesh();
          this._meshes.push(gpbmesh);

          const anum = this.r32s(p, 1)[0];
          let sum = 0;
          for (let j = 0; j < anum; ++j) {
            const ns = this.r32s(p, 2);
            const attr = new VertexElement();
            attr.usage = ns[0];
            attr.size = ns[1];
            gpbmesh.attrs.push(attr);

            sum += attr.size;
          }
          log.log('attr数', anum, sum);

          const vtxbyte = this.r32s(p, 1)[0];
          const vtxnum = vtxbyte / (sum * 4);
          {
            for (let k = 0; k < anum; ++k) {
              const at = gpbmesh.attrs[k];
              at.buf = new Float32Array(at.size * vtxnum);
            }

            for (let j = 0; j < vtxnum; ++j) {
              const vtx = this.rfs(p, sum);
              let offset = 0;

              for (let k = 0; k < anum; ++k) {
                const at = gpbmesh.attrs[k];

                const num = at.size;
                for (let l = 0; l < num; ++l) {
                  at.buf[j * num + l] = vtx[offset];
                  offset ++;
                }
              }
            }
            log.log('vtxnum', vtxnum);
          }

// 範囲と半径
          const ranges = this.rfs(p, 10);
//                    log.log('ranges', ranges);
          const bounds = new Bounds();
          gpbmesh.bounds = bounds;
          {
            bounds.min = [ranges[0], ranges[1], ranges[2]];
            bounds.max = [ranges[3], ranges[4], ranges[5]];
            bounds.center = [ranges[6], ranges[7], ranges[8]];
            bounds.radius = ranges[9];
            console.log('bounds', bounds);
          }

          log.log('partnum pos', -1);

          const partnum = this.r32s(p, 1)[0];
          log.log('partnum', partnum);
// TODO: ここ!!
          for (let j = 0; j < partnum; ++j) {
            const part = new Part();

            const fiattr = this.r32s(p, 3);
            log.log('0x', fiattr[0].toString(16), fiattr[1].toString(16));

            let fis = [];
            if (fiattr[1] === Part.GL_UNSIGNED_SHORT) {
              fis = this.r16s(p, fiattr[2] / 2);
              log.log('fis16', fis);
            } else {
              fis = this.r32s(p, fiattr[2] / 4);
              log.log('fis32', fis);
            }

            const indexmax = Math.max(...fis);
            log.log('indexmax', indexmax); // 範囲チェック向け

            part.primitiveType = fiattr[0];
            part.faceIndexElement = fiattr[1];
            part.fis = fis;
            gpbmesh.parts.push(part);
          }
        }
      }

      this.mark();
      const blockNum = this.r32s(p, 1)[0];
      this.dumpMarkPos('ブロック数', blockNum);
      { // シーン
        const gpbscene = new GPB.Scene();

        gr.userData.gpbscene.nodes = [];

        this.checkChunk(this.cur);
        this.mark();
        const cnum = this.r32s(p, 1)[0];
        this.dumpMarkPos(`シーン, 子個数`, cnum);
        for (let i = 0; i < cnum; ++i) {
          const node = this.readNode(p);

          gr.userData.gpbscene.nodes.push(node);
        }

        const cameraName = this.rs(p);
        gpbscene.cameraName = cameraName;
        const acs = this.rfs(p, 3);
        gpbscene.ambientColor = acs;
      }
      this.dumpPos('シーン終了anim前');

      if (blockNum >= 2) { // アニメ
        log.log('animation chunk');
        this.checkChunk(this.cur);

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
            } else if (targetobj.attr === 16) {
              const minnum = Math.min(numtime, Math.floor(valnum / 7));
              let ft = 0;
              for (let k = 0; k < minnum; ++k) {
                const pqs = {
                  time: targetobj.times[k],
                  q: [vals[ft+0], vals[ft+1], vals[ft+2], vals[ft+3]],
                  p: [vals[ft+4], vals[ft+5], vals[ft+6]],
                };
                ft += 7;
                targetobj.keys.push(pqs);
              }
            }

            const numin = this.r32s(p, 1)[0];
            targetobj.tangentsin = this.rfs(p, numin);
            const numout = this.r32s(p, 1)[0];
            targetobj.tangentsout = this.rfs(p, numout);
            const numip = this.r32s(p, 1)[0];
            targetobj.interpolations = this.r32s(p, numip);
          }
        }
      }

      console.log('ファイル最終位置', this.cur, '/', p.byteLength);
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
    const curPos = this.dumpPos();
    this.checkChunk(curPos);

    const node = {
      children: [],
      materials: [],
    };

    node.nodetype = this.r32s(p, 1)[0];
    node.matrix = this.rfs(p, 16);
    node.parentname = this.rs(p);

    this.mark();
    const cnum = this.r32s(p, 1)[0];
    node._childnum = cnum;
    this.dumpMarkPos(`ノード子個数`, cnum);
    for (let i = 0; i < cnum; ++i) {
      const cnode = this.readNode(p);
      node.children.push(cnode);
    }

    this.mark();
    node.camlight = this.r8s(p, 2); // カメラ、ライト
    this.dumpMarkPos('カメラライト', node.camlight);

    this.mark();
    node.modelname = this.rs(p);

    if (node.modelname !== '') {
      this.dumpMarkPos('モデル名', node.modelname);

      this.mark();
      node.isskin = this.r8s(p, 1)[0]; // スキン
      if (node.isskin > 0) {
        this.dumpMarkPos('スキンあるよ');

        this.rfs(p, 16);

        const jointnum = this.r32s(p, 1)[0];
        for (let i = 0; i < jointnum; ++i) {
          const jointname = this.rs(p);
          log.log('参照ジョイント名 for 行列', 'jointname', jointname);
        }

        this.mark();
        const bpnum = this.r32s(p, 1)[0];
        const ok = (jointnum * 16 === bpnum);
        this.dumpMarkPos(`逆行列成分数`, bpnum, ok ? '一致' : '不一致');
        for (let i = 0; i < jointnum; ++i) {
          const jmatrix = this.rfs(p, 16);
          const _translate = [jmatrix[12], jmatrix[13], jmatrix[14]];
          log.log('平行移動成分', _translate);
        }

      }

      this.mark();
      const mtlnum = this.r32s(p, 1)[0];
      this.dumpMarkPos('mtlnum', mtlnum);
      for (let i = 0; i < mtlnum; ++i) {
        const mtlname = this.rs(p);
        node.materials.push(mtlname);

        log.log('参照材質', 'mtlname', mtlname);
      }
    }

    log.log('readNode leave', node);
    return node;
  }


  /**
   * 
   * @param {ArrayBuffer} ab 
   */
  parseGPB(ab) {
    const p = new DataView(ab);
    const gr = this.parse(p, (arg) => {
      console.warn('error fire', arg);
    });
    return gr;
  }

  /**
   * 
   * @param {string} instr 
   */
  parseMaterial(instr) {
    const ret = {
      materials: [],
    };
    const lines = instr.split('\n');
    const rematerial = /material\s+(?<name>\S+)(?<rest>.*$)?/;
    let cur = new MaterialDesc();
    for (let line of lines) {
      if (cur.level === 0) { // 外側にいる
        if (!cur.name) {
          const m = rematerial.exec(line);
          if (m) {
            cur.name = m.groups['name'].trim();
            const rest = m.groups['rest'];
            // : があったらその手前で区切って派生元とする
            if (rest.includes(':')) {
              cur.superName = rest.split(':')[0].trim();
            }
          }
        }

      }

      if (!cur.name) { // まだ名前が見つかっていないので次の行へ
        continue;
      }

      // material 名発見後
        // 同一行に2つ以上には非対応
        const l = line.indexOf('{');
        const r = line.lastIndexOf('}');

        if (r >= 0) {
          cur.level -= 1;
          if (cur.level === 0) {
            ret.materials.push(cur);
            cur = new MaterialDesc();
          }
        }

    }
    return ret;
  }

  /**
   * 
   * @param {(...args)=>void} f 
   */
  setLog(f) {
    log.log = f;
  }
}

_global.GPB = _global.GPB || {};
_global.GPB = {
  Vertex,
  VertexElement,
  AnimationChannel,
  Animation,
  Animations,
  Node,
  Joint,
  Mesh,
  Scene,
  Reference,
  RefTable,
  Model,
};

} )(globalThis);

