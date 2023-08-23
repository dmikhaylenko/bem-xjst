export interface BemxjstNamingOptions {
    elem?: string;
    mod?: BemxjstModNamingOptions | string;
}

export interface BemxjstModNamingOptions {
    name?: string;
    val?: string;
}

export type ModValue = string | boolean;

export class ClassBuilder {
    private elemDelim: string;
    private modDelim: BemxjstModNamingOptions;

    constructor(options: BemxjstNamingOptions) {
        this.elemDelim = options.elem || "__";
        this.modDelim = typeof options.mod === "string" ?
            {
                name: options.mod || "_",
                val: options.mod || "_"
            } : {
                name: options?.mod?.name || "_",
                val: options?.mod?.val || "_",
            }
    }

    public build(block: string, elem?: string): string {
        if (!!elem) {
            return `${block}${this.elemDelim}${elem}`;
        }
        return block;
    }

    public buildBlockClass(name: string, modName?: string, modVal?: ModValue): string {
        let res: string = name;
        if (modVal) {
            res = `${res}${this.buildModPostfix(modName, modVal)}`;
        }
        return res;
    }

    public buildElemClass(block: string, name: string, modName: string, modVal: ModValue): string {
        return `${this.buildBlockClass(block)}${this.elemDelim}${name}${this.buildModPostfix(modName, modVal)}`;
    }

    public split(key: string): string[] {
        return key.split(this.elemDelim, 2);
    }

    private buildModPostfix(modName?: string, modVal?: ModValue) {
        let res: string = `${this.modDelim.name}${modName}`;
        if (modVal !== true) {
            res = `${res}${this.modDelim.val}${modVal}`;
        }
        return res;
    }
}
  