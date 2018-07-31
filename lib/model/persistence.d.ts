import { Model } from './index';
/**
 * Model persistence
 * @namespace model
 */
declare class ModelPersistence {
    /**
     * Creates a record and saves it to the database
     * 'Model.create(data)' is the same as 'Model.build(data).save()'
     */
    static create<T extends Model, U extends T>(this: typeof Model, data?: U, options?: {
        skip_log: boolean;
    }): Promise<T>;
    /**
     * Creates multiple records and saves them to the database.
     */
    static createBulk<T extends Model, U extends T>(this: typeof Model, data?: U[]): Promise<T[]>;
    private static _buildSaveDataColumn;
    private static _createBulk;
    /**
     * Saves data to the database
     * @param {Object} [options]
     * @param {Boolean} [options.validate=true]
     * @param {Boolean} [options.skip_log=false]
     * @return {Model} this
     * @promise
     */
    save(this: Model & {
        constructor: typeof Model;
    }, options?: {
        skip_log?: boolean;
        validate?: boolean;
    }): Promise<Model & {
        constructor: typeof Model;
    }>;
    private _buildSaveData;
    private _create;
    private _update;
}
export { ModelPersistence };
