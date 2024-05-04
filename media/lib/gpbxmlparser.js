/**
 * @file gpbxmlparser.js
 */

(function(_global) {

/**
 * 文字列をスペースで分解して，数値になった分だけ配列として返す．
 * 1つしか無い場合は数値を返す．
 * @param {string} s 
 * @returns {number[] | number}
 */
const toFloats = (s) => {
  const ss = s.trim().split(' ');
  const ret = [];
  for (const val of ss) {
    const f = Number.parseFloat(val);
    if (Number.isFinite(f)) {
      ret.push(f);
    }
  }
  if (ret.length === 1) {
    return ret[0];
  }

  return ret;
};


class XMLParser extends _global.GPB.Model {
  constructor() {
  }

/**
 * 
 * @param {HTMLElement} innode 
 * @returns 
 */
  parseRefTable(innode) {
    const ret = {
      references: []
    };
    for (const refnode of innode.children) {
      const ref = {};
      console.log('reference', refnode);
      for (const node of refnode.children) {
        const name = node.nodeName.toLowerCase();
        const val = node.textContent;
        ref[name] = (name === 'xref') ? val : Number.parseInt(val);
      }
      ret.references.push(ref);
    }
    return ret;
  }

/**
 * 
 * @param {HTMLElement}
 * @returns 
 */
  parseMesh(innode) {
    const ret = {
      vertexelements: [],
      vertices: [],
    };
    ret.id = innode.id;
    for (const node of innode.children) {
      const name = node.nodeName.toLowerCase();
      switch(name) {
      case 'vertexelement':
        {
          const ve = {};
          for (const node2 of node.children) {
            const name2 = node2.nodeName.toLowerCase();
            const val2 = node2.textContent;
            ve[name2] = (name2 === 'usage') ? val2 : Number.parseInt(val2);
          }
          ret.vertexelements.push(ve);
        }
        break;
      case 'vertices':
        {
          const val = node.textContent;
          const lines = val.split('\n');
          console.log('lines num', lines.length);
          for (const line of lines) {
            if (line == '') {
              continue;
            }
            if (line.startsWith('//')) {
              continue;
            }
            const fs = toFloats(line);
            console.log(fs);
            break;
          }
        }
        break;
      case 'bounds':
        {
          const bound = {};
          for (const node2 of node.children) {
            const name2 = node2.nodeName.toLowerCase();
            const val2 = node2.textContent;
            bound[name2] = toFloats(val2);
          }
          ret.bounds = bound;
        }
        break;
      case 'meshpart':
        break;
      }
    }

    return ret;
  }

/**
 * 
 * @param {HTMLElement} node 
 */
  parseNode(node) {
    const ret = {};
    return ret;
  }

/**
 * 
 * @param {HTMLElement} node 
 * @returns 
 */
  parseScene(node) {
    const ret = {};
    return ret;
  }

/**
 * 
 * @param {HTMLElement} innode 
 * @returns 
 */
  parseAnimations(innode) {
    const ret = {};
    ret.id = innode.id;
    return ret;
  }

/**
 * API. xml の内容をパースする。
 * @param {string} xmltext 
 */
  parseXML(xmltext) {
    const el = document.createElement('div');
    el.innerHTML = xmltext;
    let root = null;
    for (const node of el.children) {
      const type = node.nodeName.toLowerCase();
      if (type === 'root') {
        root = node;
        break;
      }
    }
    if (!root) {
      return;
    }

    let reftable = null;
    let meshes = [];
    let scene = null;
    let anims = null;
    for (const node of root.children) {
      const type = node.nodeName.toLowerCase();
      switch(type) {
      case 'reftable':
        {
          const result = this.parseRefTable(node);
          reftable = result;
          console.log('reftable', reftable);
        }
        break;
      case 'mesh':
        {
          const result = this.parseMesh(node);
          meshes.push(result);
          console.log('mesh', result);
        };
        break;
      case 'scene':
        {
          const result = this.parseScene(node);
          scene = node;
        }
        break;
      case 'animations':
        {
          const result = this.parseAnimations(node);
          anims = node;
        }
        break;
      }
      console.log(node);
    }

  }
}

_global.GPB = _global.GPB || {};
_global.GPB.XMLParser = XMLParser;

})(globalThis);



