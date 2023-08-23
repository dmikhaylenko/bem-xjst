var utils = require('./utils');


class Template {
  constructor(predicates, body) {
    this.predicates = predicates;

    this.body = body;
  }

  wrap() {
    var body = this.body;
    for (var i = 0; i < this.predicates.length; i++) {
      var pred = this.predicates[i];
      body = pred.wrapBody(body);
    }
    this.body = body;
  }

  clone() {
    return new Template(this.predicates.slice(), this.body);
  }
}
exports.Template = Template;


class MatchBase {
  constructor() {
  }

  wrapBody(body) {
    return body;
  }
}
exports.MatchBase = MatchBase;

class Item {
  constructor(tree, children) {
    this.conditions = [];
    this.children = [];

    for (var i = children.length - 1; i >= 0; i--) {
      var arg = children[i];
      if (arg instanceof MatchBase)
        this.conditions.push(arg);
      else if (arg === tree.boundBody)
        this.children[i] = tree.queue.pop();
      else
        this.children[i] = arg;
    }
  }
}


class WrapMatch extends MatchBase {
  constructor(refs) {
    super();
    this.refs = refs;
  }

  wrapBody(body) {
    var _applyCtx = this.refs._applyCtx;

    if (typeof body !== 'function') {
      return function () {
        return _applyCtx(body);
      };
    }

    return function () {
      return _applyCtx(body.call(this, this, this.ctx));
    };
  }
}
exports.WrapMatch = WrapMatch;

class ReplaceMatch extends MatchBase {
  constructor(refs) {
    super();
    this.refs = refs;
  }

  wrapBody(body) {
    var applyCtx = this.refs.applyCtx;

    if (typeof body !== 'function') {
      return function () {
        return applyCtx(body, { position: this.position - 1 });
      };
    }

    return function () {
      return applyCtx(body.call(this, this, this.ctx),
        { position: this.position - 1 });
    };
  }
}
exports.ReplaceMatch = ReplaceMatch;

class ExtendMatch extends MatchBase {
  constructor(refs) {
    super();
    this.refs = refs;
  }

  wrapBody(body) {
    var refs = this.refs;
    var applyCtx = refs.applyCtx;

    if (typeof body !== 'function') {
      return function () {
        var changes = {};

        var keys = Object.keys(body);
        for (var i = 0; i < keys.length; i++)
          changes[keys[i]] = body[keys[i]];

        return applyCtx(this.ctx, changes);
      };
    }

    return function () {
      var changes = {};

      var obj = body.call(this, this, this.ctx);
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++)
        changes[keys[i]] = obj[keys[i]];

      return applyCtx(this.ctx, changes);
    };
  }
}
exports.ExtendMatch = ExtendMatch;

class AddMatch extends MatchBase {
  constructor(mode, refs) {
    super();
    this.mode = mode;
    this.refs = refs;
  }

  wrapBody(body) {
    return this[this.mode + 'WrapBody'](body);
  }

  appendContentWrapBody(body) {
    var apply = this.refs.apply;

    if (typeof body !== 'function') {
      return function () {
        return [apply('content'), body];
      };
    }

    return function () {
      return [apply('content'), body.call(this, this, this.ctx)];
    };
  }

  prependContentWrapBody(body) {
    var apply = this.refs.apply;

    if (typeof body !== 'function') {
      return function () {
        return [body, apply('content')];
      };
    }

    return function () {
      return [body.call(this, this, this.ctx), apply('content')];
    };
  }

  mixWrapBody(body) {
    var apply = this.refs.apply;

    if (typeof body !== 'function') {
      return function () {
        var ret = apply('mix');
        /* istanbul ignore else */
        if (!Array.isArray(ret)) ret = [ret];
        return ret.concat(body);
      };
    }

    return function () {
      var ret = apply('mix');
      if (!Array.isArray(ret)) ret = [ret];
      return ret.concat(body.call(this, this, this.ctx));
    };
  }

  attrsWrapBody(body) {
    return this._wrapBodyFor("attrs", body);
  }

  jsWrapBody(body) {
    return this._wrapBodyFor("js", body);
  }

  modsWrapBody(body) {
    return this._wrapBodyFor("mods", body);
  }

  elemModsWrapBody(body) {
    return this._wrapBodyFor("elemMods", body);
  }

  _wrapBodyFor(method, body) {
    var apply = this.refs.apply;

    return typeof body !== 'function' ?
      function () {
        return (this[method] = utils.extend(apply(method) || {}, body));
      } :
      function () {
        return (this[method] = utils.extend(apply(method) || {},
          body.call(this, this, this.ctx)));
      };
  }
}
exports.AddMatch = AddMatch;

class CompilerOptions extends MatchBase {
  constructor(options) {
    super();
    this.options = options;
  }
}
exports.CompilerOptions = CompilerOptions;

class PropertyMatch extends MatchBase {
  constructor(key, value) {
    super();
    this.key = key;
    this.value = value;
  }
}
exports.PropertyMatch = PropertyMatch;

class CustomMatch extends MatchBase {
  constructor(body) {
    super();
    this.body = body;
  }
}
exports.CustomMatch = CustomMatch;


class Tree {
  static methods = [
    // Subpredicates:
    'match', 'block', 'elem', 'mod', 'elemMod',
    // Runtime related:
    'oninit', 'xjstOptions',
    // Output generators:
    'wrap', 'replace', 'extend', 'mode', 'def',
    'content', 'appendContent', 'prependContent',
    'attrs', 'addAttrs', 'js', 'addJs', 'mix', 'addMix',
    'mods', 'addMods', 'addElemMods', 'elemMods',
    'tag', 'cls', 'bem'
  ];

  static modsCheck = { mods: 1, elemMods: 1 };

  static checkConditions(conditions) {
    for (var i = 0; i < conditions.length; i++) {
      var condition = conditions[i];
      if (condition.key === 'block' ||
        condition.key === 'elem' ||
        (Array.isArray(condition.key) && Tree.modsCheck[condition.key[0]]) ||
        condition instanceof CustomMatch) continue;
      return false;
    }
    return true;
  }

  constructor(options) {
    this.options = options;
    this.refs = this.options.refs;

    this.boundBody = this.body.bind(this);

    var methods = this.methods('body');
    for (var i = 0; i < methods.length; i++) {
      var method = methods[i];
      // NOTE: method.name is empty because of .bind()
      this.boundBody[Tree.methods[i]] = method;
    }

    this.queue = [];
    this.templates = [];
    this.initializers = [];
  }

  build(templates, apply) {
    var methods = this.methods('global').concat(apply);
    methods[0] = this.match.bind(this);

    templates.apply({}, methods);

    return {
      templates: this.templates.slice().reverse(),
      oninit: this.initializers
    };
  }

  methods(kind) {
    var out = new Array(Tree.methods.length);

    for (var i = 0; i < out.length; i++) {
      var name = Tree.methods[i];
      out[i] = this.__methodFactory(kind, name);
    }

    return out;
  }

  flush(conditions, item) {
    var subcond = item.conditions ?
      conditions.concat(item.conditions) :
      item.conditions;

    for (var i = 0; i < item.children.length; i++) {
      var arg = item.children[i];

      // Go deeper
      if (arg instanceof Item) {
        this.flush(subcond, item.children[i]);

        // Body
      } else {
        if (this.isShortcutAllowed(arg, conditions)) {
          var keys = Object.keys(arg);
          for (var n = 0; n < keys.length; n++)
            this.addTemplate(
              conditions.concat(this.createMatch(keys[n])),
              arg[keys[n]]
            );
        } else {
          this.addTemplate(conditions, arg);
        }
      }
    }
  }

  createMatch(modeName) {
    switch (modeName) {
      case 'addAttrs':
        return [
          new PropertyMatch('_mode', 'attrs'),
          new AddMatch('attrs', this.refs)
        ];
      case 'addJs':
        return [
          new PropertyMatch('_mode', 'js'),
          new AddMatch('js', this.refs)
        ];
      case 'addMix':
        return [
          new PropertyMatch('_mode', 'mix'),
          new AddMatch('mix', this.refs)
        ];
      case 'addMods':
        return [
          new PropertyMatch('_mode', 'mods'),
          new AddMatch('mods', this.refs)
        ];
      case 'addElemMods':
        return [
          new PropertyMatch('_mode', 'elemMods'),
          new AddMatch('elemMods', this.refs)
        ];
      case 'appendContent':
      case 'prependContent':
        return [
          new PropertyMatch('_mode', 'content'),
          new AddMatch(modeName, this.refs)
        ];
      case 'wrap':
        return new WrapMatch(this.refs);

      case 'replace':
        return new ReplaceMatch(this.refs);

      case 'extend':
        return new ExtendMatch(this.refs);

      case 'def':
        return new PropertyMatch('_mode', 'default');

      default:
        return new PropertyMatch('_mode', modeName);
    }
  }

  addTemplate(conditions, arg) {
    var template = new Template(conditions, arg);
    template.wrap();
    this.templates.push(template);
  }

  body() {
    var children = new Array(arguments.length);
    for (var i = 0; i < arguments.length; i++)
      children[i] = arguments[i];

    var child = new Item(this, children);
    this.queue[this.queue.length - 1].children.push(child);

    if (this.queue.length === 1)
      this.flush([], this.queue.shift());

    return this.boundBody;
  }

  isShortcutAllowed(arg, conditions) {
    return typeof arg === 'object' &&
      arg !== null &&
      !Array.isArray(arg) &&
      Tree.checkConditions(conditions);
  }

  match() {
    var children = new Array(arguments.length);

    if (!arguments.length)
      throw new Error('.match() must have argument');

    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (typeof arg === 'function')
        arg = new CustomMatch(arg);

      if (!(arg instanceof MatchBase))
        throw new Error('Wrong .match() argument');

      children[i] = arg;
    }

    this.queue.push(new Item(this, children));

    return this.boundBody;
  }

  applyMode(args, mode) {
    if (args.length) {
      throw new Error('Predicate should not have arguments but ' +
        JSON.stringify(args) + ' passed');
    }

    return this.mode(mode);
  }

  xjstOptions(options) {
    this.queue.push(new Item(this, [
      new CompilerOptions(options)
    ]));
    return this.boundBody;
  }

  oninit(fn) {
    this.initializers.push(fn);
  }

  wrap() {
    return this.def.apply(this, arguments).match(new WrapMatch(this.refs));
  }

  replace() {
    return this.def.apply(this, arguments).match(new ReplaceMatch(this.refs));
  }

  extend() {
    return this.def.apply(this, arguments).match(new ExtendMatch(this.refs));
  }

  mode(name) {
    return this.match(new PropertyMatch('_mode', name))
  }

  block(name) {
    return this.match(new PropertyMatch("block", name));
  }

  elem(name) {
    return this.match(new PropertyMatch("elem", name));
  }

  mod(name, value) {
    return this.__matchMod("mods", name, value);
  }

  elemMod(name, value) {
    return this.__matchMod("elemMods", name, value);
  }

  def() {
    return this.applyMode(arguments, "default");
  }

  content() {
    return this.applyMode(arguments, "content");
  }

  mix() {
    return this.applyMode(arguments, "mix");
  }

  bem() {
    return this.applyMode(arguments, "bem");
  }

  js() {
    return this.applyMode(arguments, "js");
  }

  cls() {
    return this.applyMode(arguments, "cls");
  }

  attrs() {
    return this.applyMode(arguments, "attrs");
  }

  tag() {
    return this.applyMode(arguments, "tag");
  }

  mods() {
    return this.applyMode(arguments, "mods");
  }

  elemMods() {
    return this.applyMode(arguments, "elemMods");
  }

  appendContent() {
    return this.__matchAdd(this.content, "appendContent", arguments);
  }

  prependContent() {
    return this.__matchAdd(this.content, "prependContent", arguments);
  }

  addMods() {
    return this.__matchAdd(this.mods, "mods", arguments);
  }

  addElemMods() {
    return this.__matchAdd(this.elemMods, "elemMods", arguments);
  }

  addAttrs() {
    return this.__matchAdd(this.attrs, "attrs", arguments);
  }

  addJs() {
    return this.__matchAdd(this.js, "js", arguments);
  }

  addMix() {
    return this.__matchAdd(this.mix, "mix", arguments);
  }

  __matchAdd(method, type, args) {
    return method.apply(this, args)
      .match(new AddMatch(type, this.refs));
  }

  __matchMod(modType, name, value) {
    if (value === undefined) {
      return this.match(new PropertyMatch([modType, name], true));
    }
    return this.match(new PropertyMatch([modType, name], String(value)));
  }

  __methodFactory(kind, name) {
    var method = this[name];

    if (kind !== 'body') {
      if (name === 'replace' || name === 'extend' || name === 'wrap') {
        return this.__methodFactoryOf(function () {
          return method.apply(this, arguments);
        });
      }

      return this.__methodFactoryOf(function () {
        method.apply(this, arguments);
        return this.boundBody;
      });
    }

    return this.__methodFactoryOf(function () {
      var res = method.apply(this, arguments);

      // Insert body into last item
      var child = this.queue.pop();
      var last = this.queue[this.queue.length - 1];
      last.conditions = last.conditions.concat(child.conditions);
      last.children = last.children.concat(child.children);

      if (name === 'replace' || name === 'extend' || name === 'wrap')
        return res;
      return this.boundBody;
    });
  }

  __methodFactoryOf(factoryFunc) {
    return factoryFunc.bind(this);
  }
}
exports.Tree = Tree;
