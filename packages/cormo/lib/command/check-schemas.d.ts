export default class CommandCheckSchemas {
    private modules_to_load;
    constructor(argv: string[]);
    run(): Promise<void>;
}
