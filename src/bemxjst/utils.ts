export type Any = null | undefined | AnyOfDefined;
export type AnyOfDefined = boolean | number | string | object | symbol| bigint;
export type EscapeFunction = (character: string, charCode: number) => string;
export interface KeyValue {
  [key: string]: any
}

export class Escape {
  private static AMP_MNEMONIC_CODE: string = '&amp;';
  private static LT_MNEMONIC_CODE: string = '&lt;';
  private static GT_MNEMONIC_CODE: string = '&gt;';
  private static QUOTE_MNEMONIC_CODE: string = '&quot;';
  private static SINGLE_QUOTE_MNEMONIC_CODE: string = '&#39;';
  private static MATCH_XML_REGEXP: RegExp = /[&<>]/;
  private static MATCH_ATTR_REGEXP: RegExp = /["&<>]/;
  private static MATCH_JS_ATTR_REGEXP = /['&]/;

  private unescapedValue: Any;

  constructor(unescapedValue: Any) {
    this.unescapedValue = unescapedValue;
  }

  public escapeXml(): string {
    return this.escape(Escape.MATCH_XML_REGEXP, (character: string, charCode: number) => {
      if (charCode === 38) {
        return Escape.AMP_MNEMONIC_CODE;
      }

      if (charCode === 60) {
        return Escape.LT_MNEMONIC_CODE;
      }

      if (charCode === 62) {
        return Escape.GT_MNEMONIC_CODE;
      }
      return character;
    });
  }

  public escapeAttribute(): string {
    return this.escape(Escape.MATCH_ATTR_REGEXP, (character: string, charCode: number) => {
      if (charCode === 34) {
        return Escape.QUOTE_MNEMONIC_CODE;
      }

      if (charCode === 38) {
        return Escape.AMP_MNEMONIC_CODE;
      }

      if (charCode === 60) {
        return Escape.LT_MNEMONIC_CODE;
      }

      if (charCode === 62) {
        return Escape.GT_MNEMONIC_CODE;
      }
      return character;
    });
  }

  public escapeJsAttribute(): string {
    return this.escape(Escape.MATCH_JS_ATTR_REGEXP, (character: string, charCode: number) => {
      if (charCode === 38) {
        return Escape.AMP_MNEMONIC_CODE;
      }

      if (charCode === 39) {
        return Escape.SINGLE_QUOTE_MNEMONIC_CODE;
      }
      return character;
    });
  }

  public escape(regexp: RegExp, escapeFunction: EscapeFunction): string {
    const stringified: string = this.stringifyUnescapedValue();
    let match: RegExpExecArray | null = regexp.exec(stringified);
    if (match !== null) {
      return this.processEscape(stringified, match as RegExpExecArray, escapeFunction);
    }
    return stringified;
  }

  private processEscape(valueToEscape: string, matchResult: RegExpExecArray, escapeFnction: EscapeFunction): string {
    let index: number = 0;
    let result: string = "";
    let lastIndex: number = 0;
    for (index = matchResult.index; index < valueToEscape.length; index++) {
      let charToEscape: string = valueToEscape.charAt(index);
      let charAfterEscape: string = escapeFnction(charToEscape, charToEscape.charCodeAt(0));
      if (charToEscape !== charAfterEscape) {
        if (lastIndex !== index) {
          result += valueToEscape.substring(lastIndex, index);
        }
        result += charAfterEscape;
        lastIndex = index + 1;
      }
    }
    return lastIndex !== index
      ? result + valueToEscape.substring(lastIndex, index)
      : result;
  }

  private stringifyUnescapedValue(): string {
    if (!this.shouldBeDeterminedEmptyString()) {
      return String(this.unescapedValue);
    }
    return "";
  }

  private shouldBeDeterminedEmptyString(): boolean {
    return typeof this.unescapedValue === "undefined" || this.unescapedValue === null ||
      (typeof this.unescapedValue === "number" && isNaN(this.unescapedValue)) 
  }
}

export class Html {  
  private static readonly SHORT_TAGS: object = { // hash for quick check if tag short
    area: 1, base: 1, br: 1, col: 1, command: 1, embed: 1, hr: 1, img: 1,
    input: 1, keygen: 1, link: 1, meta: 1, param: 1, source: 1, wbr: 1
  };

  private static UNQUOTED_ATTR_REGEXP: RegExp = /^[:\w.-]+$/;

  public isShortTag(tag: string): boolean {
    return Html.SHORT_TAGS.hasOwnProperty(tag);
  }

  public isUnquotedAttr(value?: string): boolean {
    return !!(value && Html.UNQUOTED_ATTR_REGEXP.exec(value));
  };
}

export class Uniq {
  private uniqCount: number = 0;
  private uniqId: number = Number(new Date());

  public uniq(): string {
    return `${this.uniqPrefix()}${++this.uniqCount}`;
  }

  public uniqExpando(): string {
    return `__${this.uniqId}`;
  }

  public uniqPrefix(): string {
    return `uniq${this.uniqId}`
  }
}

export class ObjectIdentifier {
  private uniq: Uniq;

  constructor(uniq?: Uniq) {
    this.uniq = uniq || new Uniq();
  }

  public identify(object?: KeyValue, onlyGet?: boolean): string {
    const uniqExpando: string = this.uniq.uniqExpando();
    if (!object) {
      return this.uniq.uniq();
    }

    if (onlyGet || object[uniqExpando]) {
      return object[uniqExpando];
    }

    const uniq: string = this.uniq.uniq();
    object[uniqExpando] = uniq;
    return uniq;
  }
}

export class ObjectUtil {
  private value: Any;

  constructor(value: Any) {
    this.value = value;
  }

  public isObject() {
    return this.value &&
      typeof this.value === "object" &&
      !Array.isArray(this.value) &&
      this.value !== null;
  }

  public isSimple(): boolean {
    return this.isPrimitive() || 
      (this.isNotBemNode() && this.hasSimpleHtmlAttribute());
  }

  public isNotBemNode(): boolean {
    const value: KeyValue = this.value as KeyValue;
    return (!!!value.block &&
      !!!value.elem &&
      !!!value.tag &&
      !!!value.cls &&
      !!!value.attrs);
  }

  public isPrimitive(): boolean {
    return !this.value || 
      this.value === true || 
      typeof this.value === "string" || 
      typeof this.value === "number";
  }

  private hasSimpleHtmlAttribute(): boolean {
    const value: KeyValue = this.value as KeyValue;
    return value.hasOwnProperty('html') && 
      new ObjectUtil(value.html).isSimple();
  }
}


const GLOBAL_UNIQ: Uniq = new Uniq();
const GLOBAL_OBJECT_IDENTIFIER = new ObjectIdentifier(GLOBAL_UNIQ);

export function xmlEscape(value: Any): string {
  const escape: Escape = new Escape(value);
  return escape.escapeXml();
};

export function attrEscape(value: any): string {
  const escape: Escape = new Escape(value);
  return escape.escapeAttribute();
};

export function jsAttrEscape(value: Any): string {
  const escape: Escape = new Escape(value);
  return escape.escapeJsAttribute();
};

export function extend(left?: object, right?: object): object {
  if (left && right) {
    return Object.assign({}, left, right);
  }
  return (left || right) as object;
};

export function isShortTag(tag: string): boolean {
  const html: Html = new Html();
  return html.isShortTag(tag);
};

export function isUnquotedAttr(value?: string): boolean {
  const html: Html = new Html();
  return html.isUnquotedAttr(value);
};

export function isSimple(obj: any) {
  const util: ObjectUtil = new ObjectUtil(obj);
  return util.isSimple();
};

export function isObj(val?: Any) {
  const values: ObjectUtil = new ObjectUtil(val);
  return values.isObject();
};

export function getUniq() {
  return GLOBAL_UNIQ.uniq();
}

export function identify(obj?: any, onlyGet?: any) {
  return GLOBAL_OBJECT_IDENTIFIER.identify(obj, onlyGet);
};

export function fnToString(code: Any): string {
  // It is fine to compile without templates at first
  if (!code)
    return '';

  if (typeof code === 'function') {
    // Examples for regular function
    //   function () { … }
    //   function name() { … }
    //   function (a, b) { … }
    //   function name(a, b) { … }
    //
    // Examples for arrow function
    //   () => { … }
    //   (a, b) => { … }
    //   _ => { … }

    code = code.toString();
    code = code.replace(
      code.indexOf('function') === 0 ?
      /^function\s*[^{]+{|}$/g :
      /^(_|\(\w|[^=>]+\))\s=>\s{|}$/g,
    '');
  }

  return String(code);
};
