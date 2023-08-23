var utils = require('./utils');

class Context {
  constructor(bemxjst) {
    this._bemxjst = bemxjst;

    this.ctx = null;
    this.block = '';

    // Save current block until the next BEM entity
    this._currBlock = '';

    this.elem = null;
    this.mods = {};
    this.elemMods = {};

    this.position = 0;
    this._listLength = 0;
    this._notNewList = false;

    this.escapeContent = bemxjst.options.escapeContent !== false;
  }

  onError(context, e) {
    console.error('bem-xjst rendering error:', {
      block: context.ctx.block,
      elem: context.ctx.elem,
      mods: context.ctx.mods,
      elemMods: context.ctx.elemMods
    }, e);
  }

  isFirst() {
    return this.position === 1;
  }

  isLast() {
    return this.position === this._listLength;
  }

  generateId() {
    return utils.identify(this.ctx);
  }

  reapply(ctx) {
    return this._bemxjst.run(ctx);
  }

  isSimple(obj) {
    return utils.isSimple(obj);
  }

  isShortTag(tag) {
    return utils.isShortTag(tag);
  }

  extend(left, right) {
    return utils.extend(left, right);
  }

  xmlEscape(value) {
    return utils.xmlEscape(value);
  }

  attrEscape(value) {
    return utils.attrEscape(value);
  }

  jsAttrEscape(value) {
    return utils.jsAttrEscape(value);
  }

  identify(value, onlyGet) {
    return utils.identify(value, onlyGet);
  }
}

exports.Context = Context;

Context.prototype._flush = null;
