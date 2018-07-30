/// <reference types="node" />
import { EventEmitter } from 'events';
import { ConnectionAssociation } from './association';
import { ConnectionManipulate } from './manipulate';
/**
 * Manages connection to a database
 * @uses ConnectionAssociation
 * @uses ConnectionManipulate
 */
declare class Connection extends EventEmitter implements ConnectionAssociation, ConnectionManipulate {
    constructor(adapter_name: any, settings: any);
    close(): null;
    model(name: any, schema: any): any;
    _checkSchemaApplied(): Promise<any>;
    _initializeModels(): void;
    _checkArchive(): void;
    _getModelNamesByAssociationOrder(): any;
    applySchemas(options: any): any;
    dropAllModels(): Promise<void>;
    log(model: any, type: any, data: any): void;
    _connectRedisCache(): any;
    inspect(depth: any): string;
    addAssociation(): void;
    getInconsistencies(): void;
    fetchAssociated(): void;
    manipulate(): void;
}
export { Connection };
