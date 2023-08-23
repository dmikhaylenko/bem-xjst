// TODO: Implement captureStackTrace functional
export class BEMXJSTError extends Error {
    constructor(message: string, func: Function) {
        super(message || "");
        this.name = "BEMXJSTError";
        this.stack = (new Error()).stack;
    }
}

// function BEMXJSTError(msg, func) {
//     this.name = 'BEMXJSTError';
//     this.message = msg;
  
//     if (Error.captureStackTrace)
//       Error.captureStackTrace(this, func || this.constructor);
//     else
//       this.stack = (new Error()).stack;
//   }
  
//   BEMXJSTError.prototype = Object.create(Error.prototype);
//   BEMXJSTError.prototype.constructor = BEMXJSTError;
  
//   exports.BEMXJSTError = BEMXJSTError;
  