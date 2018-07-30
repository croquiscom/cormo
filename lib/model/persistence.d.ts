/**
 * Model persistence
 * @namespace model
 */
declare class ModelPersistence {
    static create(data: any, options: any): Promise<any>;
    static createBulk(data: any): Promise<any>;
    static _buildSaveDataColumn(data: any, model: any, column: any, property: any, allow_null: any): void;
    _buildSaveData(): {};
    _create(options: any): Promise<{}>;
    static _createBulk(records: any): Promise<any>;
    _update(options: any): Promise<{} | undefined>;
    save(options: any): any;
}
export { ModelPersistence };
