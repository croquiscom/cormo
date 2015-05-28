declare module 'cormo' {
  export class Connection {
    constructor(adapater_name: string, settings: Object);
  }

  export class Model {
    static column(path: string, property: any): void;
    static create(data?: Object, options?: Object): any;
    static where(condition?: Object): any;
  }
}
