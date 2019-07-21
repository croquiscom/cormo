import * as cormo from 'cormo';
import { GraphQLSchema } from 'graphql';
interface IOptions {
    id_description?: string;
    list_type_description?: string;
    item_list_description?: string;
}
export declare function createDefaultCrudSchema(model_class: typeof cormo.BaseModel, options?: IOptions): GraphQLSchema;
export {};
