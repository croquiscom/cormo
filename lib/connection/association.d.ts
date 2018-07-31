/**
 * Makes association between two models
 * @namespace connection
 */
declare class ConnectionAssociation {
    _applyAssociations(): never[];
    addAssociation(association: any): boolean;
    getInconsistencies(): Promise<{}>;
    fetchAssociated(records: any, column: any, select: any, options: any): Promise<void>;
    private _hasMany;
    private _hasOne;
    private _belongsTo;
    private _fetchAssociatedBelongsTo;
    private _fetchAssociatedHasMany;
}
export { ConnectionAssociation };
