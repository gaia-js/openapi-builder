import * as jsYaml from "js-yaml"
import { ENAMETOOLONG } from "constants";

export class Server {
    public url: string;
    public description: string;

    public constructor(url: string, description: string="") {
        this.url = url;
        this.description = description;
    }
}

class Paths {
    private _path;
    public get path(): string {
        return this._path;
    }

    private _requests;
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

export class Schema {
    constructor(schemaType: string) {
        this.setType(schemaType);
    }

    private setType(schemaType: string) {
        if (schemaType.endsWith('[]')) {
            this['type'] = 'array';

            this["items"] = new Schema(schemaType.slice(0, schemaType.length-2))
        }
        else {
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
        }
    }

    private isBasicType(type: string) {
        return ["string", "number", "int", "integer", "long", "float", "boolean", "array", "object", "any"].indexOf(type) >= 0;
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
}

export class Parameter {
    public in: string;
    public name: string;
    private schema: Schema;
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
}

export class Request {
    public method: string;
    public operationId: string;
    
    public constructor(name: string, method: string) {
        this.name = name;
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

    public responses;
    
    public addResponse(response: Response, statusCode: string="200") {
        if (!this.responses) {
            this.responses = {};
        }

        this.responses[statusCode] = response;
    }
}

export class Response {
    constructor() {
         this.content = new ResponseContent();
         this.description = "";
    }

    public description: string;
    public content: ResponseContent
}

export class ResponseContent {
    public addSchema(schame: Schema, mimeType: string='application/json') {
        this[mimeType] = {
            schema: schame
        };
    }
}

export class SchemaProperty extends Schema {
    public description: string;

    constructor(schemaType: string) {
        super(schemaType);
    }
}

export class SchemaObject extends Schema {
    public type: string;
    public properties: object;

    constructor() {
        super('object');
    }

    public addProperty(name: string, schemaProperty: Schema) {
        if (!this.properties) {
            this.properties = {};
        }

        this.properties[name] = schemaProperty;
    }
}

class Components {
    public schemas;

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
}

class OpenAPI {
    public title;
    public description;
    public version;
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
                title: '',
                description: '',
                version: ''
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
