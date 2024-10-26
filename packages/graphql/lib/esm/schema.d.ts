import * as cormo from 'cormo';
import { GraphQLSchema } from 'graphql';
interface Options {
    id_description?: string;
    list_type_description?: string;
    item_list_description?: string;
    created_at_column?: string;
    updated_at_column?: string;
}
export declare function createDefaultCrudSchema(model_class: typeof cormo.BaseModel, options?: Options): GraphQLSchema;
export {};
