import * as jsYaml from "js-yaml"
import * as is from 'is-type-of';

// import { ENAMETOOLONG } from "constants";

interface Loadable {
    load(source: any): void;
}

function loadArray<T extends Loadable>(target: any, source: any[], clz: {new(): T} | (() => T)) {
    source.forEach(item => {
        const targetItem = is.class(clz)?new (clz as any)(): (clz as any)();
        targetItem.load(item);
        target.push(targetItem);
    });
}

export class Server implements Loadable{
    public url: string;
    public description: string;

    public constructor(url: string, description: string="") {
        this.url = url;
        this.description = description;
    }

    load(source: any) {
        this.url = source.url;
        this.description = source.description;
    }
}

class Paths {
    private _path: string;
    public get path(): string {
        return this._path;
    }

    private _requests: Request[];
    public get requests(): Request[] {
        return this._requests;
    }

    public addRequest(path: string, request: Request):void {
        if (path.length) {
            if (!this[path]) {
                this[path] = {
                };
            }

            this[path][request.method.toLowerCase()] = request;
        }
    }
}

export class Schema implements Loadable {
    type: string;
    description: string;
    additionalProperties?: Schema|boolean;
    properties?: {[name: string]: Schema};
    $ref?: string;
    items?: Schema;
    format?: string;
    ['x-object-map']?: {[name: string]: Schema};

    constructor(schemaType: string) {
        this.setType(schemaType || 'object');
    }

    private setType(schemaType: string) {
        if (schemaType && schemaType.endsWith('[]')) {
            this['type'] = 'array';

            this["items"] = new Schema(schemaType.slice(0, schemaType.length-2))
        }
        else if (schemaType) {
            let matched = schemaType.match(/\{(\w+):(\w+)\}/)
            if (matched) {
                this['type'] = 'object';

                this['description'] = schemaType;
                this['additionalProperties'] = new Schema(matched[2])
            }
            else {
                if (this.isBasicType(schemaType)) {
                    this['type'] = this.standardBasicType(schemaType);
                    if (["array", "object", "any"].indexOf(schemaType) < 0) {
                        this['format'] = schemaType;
                    }
                }
                else {
                    this['$ref'] = '#/components/schemas/'+schemaType;
                }
            }
        } else {
            console.error('invalid schema type');
        }
    }

    private isBasicType(type: string) {
        return ["string", "number", "int", "integer", "long", "float", "double", "boolean", "array", "object", "any"].indexOf(type) >= 0;
    }

    private standardBasicType(type: string) {
        switch(type) {
            case "int":
                return "integer";
            case "long":
                return "integer";
            case "float":
                return "number";
            case "any":
                return "object";
            default:
                return type;
        }
    }

    public addProperty(name: string, schemaProperty: Schema) {
        if (!this.properties) {
            this.properties = {};
        }

        this.properties[name] = schemaProperty;
    }

    load(source: any) {
        this.setType(source.type);

        ['description', 'additionalProperties', '$ref', 'items', 'format'].forEach(name => {
            typeof source[name] !== 'undefined' && (this[name] = source[name]);
        });

        source.properties && Object.keys(source.properties).forEach(name => {
            if (!source.properties[name].type) {
                if (source.properties[name].$ref) {
                    source.properties[name].type = source.properties[name].$ref.split('/').pop();
                } else {
                    console.log('invalid schema type while load schema: ', name, source.properties[name]);
                }
            }

            const schema = new Schema(source.properties[name].type);
            schema.load(source.properties[name]);
            this.addProperty(name, schema);
        });
    }
}

export class Parameter implements Loadable {
    public in: string;
    public name: string;
    public schema: Schema;
    public required: boolean;
    public description: string;

    constructor(name?: string, schemaType?: string) {
        this.in = 'query';
        if (name) {
            this.name = name;
        }
        if (schemaType) {
            this.schemaType = schemaType;
        }
    }

    public set schemaType(schemaType: string) {
        this.schema = new Schema(schemaType);
    }

    public setDefault(value) {
        this['example'] = value;
    }

    load(source: any) {
        ['name', 'in', 'required', 'description', 'example'].forEach(name => {
            this[name] = source[name];
        })

        if (!source.schema.type) {
            console.log('invalid schema type while load parameter: ', source);
        }

        this.schema = new Schema(source.schema.type);
        this.schema.load(source.schema);
    }
}

export class Request implements Loadable {
    public method: string;
    public operationId: string;
    public ['x-codegen-request-body-name']: string

    public constructor(name: string, method: string) {
        this.name = name;
        this['x-codegen-request-body-name'] = name;
        this.method = method;
        this.tags = [];
        this.operationId = name;

        for (let propertyKey of ['name', 'method', '_tags']) {
            let descriptor = Object.getOwnPropertyDescriptor(this, propertyKey) || {};
            descriptor.enumerable = false;
            Object.defineProperty(this, propertyKey, descriptor);
        }
    }

    private tags: string[];
    public addTag(tag: string) {
        if (this.tags.indexOf(tag) == -1) {
            this.tags.push(tag);
        }
    }

    public summary: string;
    public description:string;

    public name:string;

    public get $ref() {
        return this.name?this.name+'Request':null;
    }

    public parameters: Parameter[];
    public addParameter(parameter: Parameter) {
        if (!this.parameters) {
            this.parameters = [];
        }

        this.parameters.push(parameter);
    }

    public responses: {[statusCode: string]: Response};

    public addResponse(response: Response, statusCode: string="200") {
        if (!this.responses) {
            this.responses = {};
        }

        this.responses[statusCode] = response;
    }

    defaultResponse(): Response | null {
        const defaultResponseContent = this.responses[Object.keys(this.responses)[0]].content
        return defaultResponseContent[Object.keys(defaultResponseContent)[0]].schema
    }

    load(source: any) {
        ['summary', 'description'].forEach(name => {
            this[name] = source[name];
        });

        source.parameters && loadArray<Parameter>(this.parameters || (this.parameters = []), source.parameters, Parameter);
        this.tags = source.tags;
        Object.keys(source.responses).forEach(statusCode => {
            const response = new Response();
            response.load(source.responses[statusCode]);
            this.addResponse(response, statusCode);
        });
    }
}

export class Response implements Loadable {
    constructor() {
         this.content = new ResponseContent();
         this.description = "";
    }

    public description: string;
    public content: ResponseContent

    load(source: any) {
        this.content.load(source.content);
        this.description = source.description;
    }
}

export class ResponseContent implements Loadable {
    [mimeType: string]: Schema | any;

    public addSchema(scheme: Schema, mimeType: string='application/json') {
        this[mimeType] = {
            schema: scheme
        };
    }

    load(source: any) {
        Object.keys(source).forEach(mimeType => {
            if (!source[mimeType].schema.type) {
                console.log('invalid schema type while load response content: ', source);
            }

            const schema = new Schema(source[mimeType].schema.type);
            schema.load(source[mimeType].schema);
            this.addSchema(schema, mimeType);
        })
    }
}

export class SchemaProperty extends Schema {
    public description: string;

    constructor(schemaType: string) {
        super(schemaType);
    }
}

export class SchemaObject extends Schema {
    constructor() {
        super('object');
    }
}

class Components {
    public schemas: {[name: string]: SchemaObject};

    constructor() {
        this['securitySchemes'] = {
            "SessionKeyAuth": {
                type: "apiKey",
                in: "query",
                name: "session_key"
            },
            "cookieVoxauth": {
                type: "apiKey",
                in: "cookie",
                name: "voxauth"
            },
            "cookieAuth": {
                type: "apiKey",
                in: "cookie",
                name: "va_sess"
            }
        };
    }

    public addSchema(name: string, schemaObject: SchemaObject) {
        if (!this.schemas) {
            this.schemas = {};
        }

        this.schemas[name] = schemaObject;
    }

    public load(source: any) {
        Object.keys(source.schemas).forEach(name => {
            const schema = new SchemaObject();
            schema.load(source.schemas[name]);
            this.addSchema(name, schema);
        });
    }
}

class OpenAPI {
    public title: string;
    public description: string;
    public version: string;
    public components: Components;

    public constructor() {
        this.components = new Components();
        this._servers = [];
    }

    public dump(): string
    {
        return jsYaml.dump({
            openapi: '3.0.0',
            info: {
                title: this.title || '',
                description: this.description || '',
                version: this.version || ''
            },
            components: this.components,
            security: [
                {SessionKeyAuth: []},
                {cookieVoxauth: []},
                {cookieAuth: []}
            ],
            servers: this.servers,
            paths: this.paths
        })
    }

    public load(source: any) {
        ['title', 'description', 'version'].forEach(name => {
            this[name] = source[name];
        });

        source.components && this.components.load(source.components);
        loadArray<Server>(this._servers, source.servers, () => {return new Server('');});
        Object.keys(source.paths).forEach(name => {
            const sourcePath = source.paths[name];
            Object.keys(sourcePath).forEach(method => {
                const request = new Request(sourcePath[method]['x-codegen-request-body-name'] || sourcePath[method]['operationId'], method);
                request.load(sourcePath[method])
                this.paths.addRequest(name, request);
            });
        })
    }

    private _servers: Server[];
    public get servers(): Server[] {
        return this._servers;
    }

    public addServer(server:Server):void {
        this._servers.push(server);
    }

    public addComponent(name: string, schemaObject: SchemaObject) {
        if (!this.components) {
            this.components = new Components();
        }

        this.components.addSchema(name, schemaObject);
    }

    private _paths: Paths;
    public get paths(): Paths {
        if (!this._paths) {
            this._paths = new Paths();
        }

        return this._paths;
    }

    public addApi(path: string, request: Request) {
        this.paths.addRequest(path, request);
    }

}

export default OpenAPI;
