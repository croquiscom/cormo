declare type ManipulateCommand = string | object;
/**
 * Manipulate data
 * @namespace connection
 */
declare class ConnectionManipulate {
    /**
     * Manipulate data
     */
    manipulate(commands: ManipulateCommand[]): object;
    private _manipulateCreate;
    private _manipulateDelete;
    private _manipulateDeleteAllModels;
    private _manipulateDropModel;
    private _manipulateDropAllModels;
    private _manipulateFind;
    private _manipulateConvertIds;
}
export { ConnectionManipulate };
