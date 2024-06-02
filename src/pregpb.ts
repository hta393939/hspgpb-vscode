
const log = {
  log: (...args: unknown[]) => {
    console.log(...args);
  }
};

class Part {
/**
 * u16 面頂点の型
 * @default 0x1403
 */
  static GL_UNSIGNED_SHORT = 0x1403;

  foo: number = 0;
  fis: number[] = [];
}

class Mesh {
  attrs: VertexElement[] = [];
  bounds: Bounds = new Bounds();
  parts: Part[] = [];
}

class VertexElement {
  usage: number = 0;
  size: number = 0;
  buf: Float32Array = new Float32Array();
}

class Bounds {
  min: [number, number, number] = [0, 0, 0];
  max: [number, number, number] = [0, 0, 0];
  center: [number, number, number] = [0, 0, 0];
  radius: number = 0;
}

class Scene {

}

const GPB = {
  Scene: Scene
};



class Reference {
  static TYPE_FONT = 128;
  xref: string = '';
  type: number = 0;
  offset: number = 0;
}

class RefTable {
  references: Reference[] = [];
}

export class PreGpb {
  cur = 0;
  _reftable = new RefTable();
  constructor() {}

/**
 * UTF-8 とみなして文字列取り出す(not Shift_JIS)
 * @param {DataView} p 
 * @param {number} inc 
 * @returns {string}
 */
  rs(p: DataView) {
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
  rfs(p: DataView, num: number) {
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
  r8s(p: DataView, num: number) {
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
  r16s(p: DataView, num: number) {
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
  r32s(p: DataView, num: number) {
    const ret = new Int32Array(num);
    for (let i = 0; i < num; ++i) {
      ret[i] = p.getInt32(this.cur, true);
      this.cur += 4;
    }
    return ret;
  }

  skip(one: number, num: number) {
    this.cur += one * num;
  }

  parse(p: DataView, onErr: (...args: unknown[]) => void) {
    const gr = {
      userData: {
        hasFont: false,
        max: [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
        min: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        center: [0, 0, 0],
      }
    };
  {
    { // ヘッダーとチャンク
      this.cur = 11;

      const chunkNum = this.r32s(p, 1)[0];
      log.log('chunkNum', chunkNum);
      for (let i = 0; i < chunkNum; ++i) {
        const ref = new Reference();
        Object.assign(ref, {
          xref: this.rs(p),
          type: this.r32s(p, 1)[0],
          offset: this.r32s(p, 1)[0],
        });
        if (ref.type === Reference.TYPE_FONT) {
          gr.userData.hasFont = true;
        }

        this._reftable.references.push(ref);
      }
    }

    { // メッシュ
      const meshNum = this.r32s(p, 1)[0];
      log.log('meshNum', meshNum);

      for (let i = 0; i < meshNum; ++i) {
/**
* オブジェクト
*/
        const gpbmesh = new Mesh();
        //this._meshes.push(gpbmesh);

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

        const bounds = new Bounds();
        gpbmesh.bounds = bounds;
        {
          bounds.min = [ranges[0], ranges[1], ranges[2]];
          bounds.max = [ranges[3], ranges[4], ranges[5]];
          bounds.center = [ranges[6], ranges[7], ranges[8]];
          bounds.radius = ranges[9];

          for (let j = 0; j < 3; ++j) {
            gr.userData.max[j] = Math.max(gr.userData.max[j], bounds.max[j]);
            gr.userData.min[j] = Math.min(gr.userData.min[j], bounds.min[j]);
          } // 更新
          log.log('bounds', bounds);
        }

        const partnum = this.r32s(p, 1)[0];
        log.log('partnum', partnum);

        for (let j = 0; j < partnum; ++j) {
          //const part = new Part();

          const fiattr = this.r32s(p, 3);
          log.log('0x', fiattr[0].toString(16), fiattr[1].toString(16));

          //let fis: Uint16Array | Int32Array | Array<number> = [];
          if (fiattr[1] === Part.GL_UNSIGNED_SHORT) {
            //fis = this.r16s(p, fiattr[2] / 2);
            this.skip(2, fiattr[2] / 2);
          } else {
            //fis = this.r32s(p, fiattr[2] / 4);
            this.skip(4, fiattr[2] / 4);
          }

          //const indexmax = Math.max(...fis);
          //log.log('indexmax', indexmax); // 範囲チェック向け
        }
      }
    }

    for (let j = 0; j < 3; ++j) {
      gr.userData.center[j] = (gr.userData.min[j] + gr.userData.max[j]) * 0.5;
    }

  }
  return gr;
}

  parseGPB(ab: ArrayBuffer) {
    const p = new DataView(ab);
    const gr = this.parse(p, (...args: unknown[]) => {
      console.warn('error fire', ...args);
    });
    return gr;
  }

}

