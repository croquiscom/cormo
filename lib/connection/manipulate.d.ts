/**
 * Manipulate data
 * @namespace connection
 */
declare class ConnectionManipulate {
    private _manipulateCreate;
    private _manipulateDelete;
    private _manipulateDeleteAllModels;
    private _manipulateDropModel;
    private _manipulateDropAllModels;
    private _manipulateFind;
    private _manipulateConvertIds;
    manipulate(commands: any): Promise<{}>;
}
export { ConnectionManipulate };
