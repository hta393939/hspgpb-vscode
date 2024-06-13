(function(_global) {

class Font {
  static TYPE_FONT = 128;

  constructor() {
    this.c = 0;

    this.major = 1;
    this.minor = 5;
  }
  async init(url) {
    console.log('init', url);
    const res = await fetch(url);
    const buf = await res.arrayBuffer();

    this.parse(buf);
  }

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {DataView} p 
 * @param {number} offset 
 * @param {number} w
 * @param {number} h
 */
  draw(canvas, p, offset, w, h) {
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    const data = c.getImageData(0, 0, w, h);
    for (let y = 0; y < h; ++y) {
      for (let x = 0; x < w; ++x) {
        let soffset = x + w * y;
        const doffset = soffset * 4;
        let lv = p.getUint8(offset + soffset);

        data.data[doffset  ] = lv; // r
        data.data[doffset+1] = lv;
        data.data[doffset+2] = lv;
        data.data[doffset+3] = 255; // a
      }
    }
    c.putImageData(data, 0, 0);
  }

/**
 * 
 * @param {DataView} p 
 */
  i32(p) {
    const val = p.getInt32(this.c, true); // little endian
    this.c += 4;
    return val;
  }

  f32(p) {
    const val = p.getFloat32(this.c, true); // little endian
    this.c += 4;
    return val; 
  }

/**
 * 
 * @param {DataView} p 
 */
  u8(p) {
    const val = p.getUint8(this.c);
    this.c += 1;
    return val;
  }

/**
 * 
 * @param {DataView} p 
 * @returns 
 */
  str(p) {
    const num = p.getInt32(this.c, true);
    this.c += 4;
    const buf = new Uint8Array(num);
    for (let i = 0; i < num; ++i) {
      buf[i] = p.getUint8(this.c);
      this.c += 1;
    }
    return new TextDecoder().decode(buf.buffer);
  }

/**
 * 
 * @param {ArrayBuffer} inbuf  
 */
  parse(inbuf) {
    const p = new DataView(inbuf);
    this.c = 0;

    this.c += 9;
    this.major = this.u8(p);
    this.minor = this.u8(p);

    let fontOffset = -1;
    const num = this.i32(p);
    for (let i = 0; i < num; ++i) {
      this.str(p);
      const type = this.i32(p);
      const offset = this.i32(p);

      if (type === Font.TYPE_FONT) {
        fontOffset = offset;
        break;
      }
    }

    if (fontOffset < 0) {
      const el = document.getElementById('info');
      el.textContent = 'Not font';

      const canvas = document.getElementById('main');
      canvas.remove();
      return;
    }

    this.c = fontOffset;
    this.parseFont(p);
  }

/**
 * 
 * @param {DataView} p 
 */
  parseFont(p) {
    console.log('parseFont');

    const el = document.getElementById('info');
    let str = '';
    // family
    this.name = this.str(p); // "Arial" など
    const style = this.i32(p);

    let fontSizeCount = 1;
    if (this.major >= 1 && this.minor >= 4) {
      fontSizeCount = this.i32(p);
    }

    const size = this.i32(p);
    const charset = this.str(p);
    const glyphnum = this.i32(p);

    for (let i = 0; i < glyphnum; ++i) {
      this.i32(p); // code
      this.i32(p); // width
      if (this.major >= 1 && this.minor >= 5) {
        this.i32(p); // bearingX
        this.i32(p); // advance
      }
      this.f32(p);
      this.f32(p);
      this.f32(p);
      this.f32(p);
    }

    const w = this.i32(p);
    const h = this.i32(p);
    const bytenum = this.i32(p);
    console.log('bitmap', w, h, bytenum);

    str = `${this.name}, style ${style}, size ${size}, ${glyphnum} glyph`;
    el.textContent = str;

    const canvas = document.getElementById('main');
    this.draw(canvas, p, this.c, w, h);
  }
}


if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = Font;
  }
  exports.Font = Font;
} else {
  _global.Font = Font;
}

})(globalThis);

