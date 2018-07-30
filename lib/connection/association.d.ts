/**
 * Makes association between two models
 * @namespace connection
 */
declare class ConnectionAssociation {
    private _hasMany;
    private _hasOne;
    private _belongsTo;
    _applyAssociations(): never[];
    addAssociation(association: any): boolean;
    getInconsistencies(): Promise<{}>;
    private _fetchAssociatedBelongsTo;
    private _fetchAssociatedHasMany;
    fetchAssociated(records: any, column: any, select: any, options: any): Promise<void>;
}
export { ConnectionAssociation };
