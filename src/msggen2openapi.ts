#!/usr/bin/env node

import OpenAPI, {Server, Request, Parameter, Response, Schema, SchemaProperty, SchemaObject} from "./openapi";
import * as fs from "fs";
import * as xml2js from 'xml2js';
import * as path from "path";

function msggen2Openapi(msggenPath: string, openapiPath: string, host?): boolean {
    let msggen = null;

    let openAPI = new OpenAPI();

    if (host instanceof Array) {
        for (let item of host) {
            openAPI.addServer(new Server("https://"+item+".test.17zuoye.net", ""));
            openAPI.addServer(new Server("https://"+item+".staging.17zuoye.net", ""));
            openAPI.addServer(new Server("https://"+item+".17zuoye.com", ""));
        }
    }
    else {
        openAPI.addServer(new Server("https://"+host+".test.17zuoye.net", ""));
        openAPI.addServer(new Server("https://"+host+".staging.17zuoye.net", ""));
        openAPI.addServer(new Server("https://"+host+".17zuoye.com", ""));
    }

    if (fs.existsSync(msggenPath)) {
        if (fs.statSync(msggenPath).isDirectory) {
            for (let filePath of fs.readdirSync(msggenPath)) {
                if (!readMsgFromFile(msggenPath+"/"+filePath, openAPI)) {
                    return false;
                }
            }
        }
        else {
            return readMsgFromFile(msggenPath, openAPI);
        }
    }

    if (openapiPath == '-') {
        console.log(openAPI.dump());
    }
    else {
        fs.writeFileSync(openapiPath, openAPI.dump());
    }

    return true;
}

function readMsgFromFile(msggenPath: string, openAPI: OpenAPI): boolean {
    let msggen = null;

    if (msggenPath.toLowerCase().endsWith(".json")) {
        msggen = JSON.parse(fs.readFileSync(msggenPath).toString());
    }
    else if (msggenPath.toLowerCase().endsWith(".xml")) {
        (new xml2js.Parser({explicitArray : false})).parseString(fs.readFileSync(msggenPath).toString(), (err, result) => {
            msggen = result;
        });
    }
    else {
        console.error("file " + msggen + " is not supported");
        return false;
    }

    return convert2OpenAPI(msggen, openAPI, path.basename(msggenPath, path.extname(msggenPath)));
}

function addComponent(openAPI: OpenAPI, item: any, componentName: string) {
    let schemaResponse = new SchemaObject();

    if (item.field) {
        if (item.field instanceof Array) {

            for (let field of item.field) {

                let schema = new SchemaProperty(field.$.type);
                schema.description = field.$.comment;
                
                schemaResponse.addProperty(field.$.name, schema);

                //let schema = new Schema(item.$.name+"Response");
                
                // let response = new Response();
                // response.content.addSchema(schema);
                // request.addResponse(response);
            }
        }
        else {
            let schema = new SchemaProperty(item.field.$.type);
            schema.description = item.field.$.comment;
            
            schemaResponse.addProperty(item.field.$.name, schema);

            //let schema = new Schema(item.$.name+"Response");
            //let schema = new SchemaProperty(item.$.name+"Response");

            // let response = new Response();
            // response.content.addSchema(schema);
            // request.addResponse(response);
        }
    }

    openAPI.components.addSchema(componentName, schemaResponse);
}

function createRequest(openAPI: OpenAPI, item: any, defaultMethod: string): Request {
    let request = new Request(item.$.name, item.$.method?item.$.method:defaultMethod);
    request.summary = item.$.comment;

    if (item.field) {
        if (item.field instanceof Array) {
            for (let field of item.field) {
                let parameter = new Parameter();
                parameter.name = field.$.name;
                parameter.description = field.$.comment;
                parameter.schemaType = field.$.type;
                request.addParameter(parameter);
            }
        }
        else {
            let parameter = new Parameter();
            parameter.name = item.field.$.name;
            parameter.description = item.field.$.comment;
            parameter.schemaType = item.field.$.type;
            request.addParameter(parameter);
        }
    }

    return request;
}

function addLoginAPI(openAPI: OpenAPI) {
    let request = new Request("登陆", "GET");
    request.addTag('dev');
    request.addParameter(new Parameter('user_code', 'string'));
    request.addParameter(new Parameter('passwd', 'string'));
    request['security'] = [];
    let response = new Response();
    response.content.addSchema(new Schema("DevLogin"+"Response"))
    request.addResponse(response)

    let schemaResponse = new SchemaObject();
    let dataSchema = new SchemaProperty('object');
    dataSchema['additionalProperties'] = true;
    schemaResponse.addProperty("success", new SchemaProperty("boolean"));
    schemaResponse.addProperty("data", dataSchema);
    openAPI.components.addSchema("DevLogin"+"Response", schemaResponse);

    openAPI.addApi('/dev/login', request);
}

function convert2OpenAPI(msggen: any, openAPI: OpenAPI, tag?: string): boolean {
    let defaultProtocol = 'http';
    let defaultMethod = 'GET';
    let defaultContentType = null;

    if (msggen.config && msggen.config.type && msggen.config.type.extra && msggen.config.type.extra.item) {
        if (msggen.config.type.extra.item instanceof Array) {
            for (let item of msggen.config.type.extra.item) {
                addComponent(openAPI, item, item.$.name)
            }
        }
        else {
            addComponent(openAPI, msggen.config.type.extra.item, msggen.config.type.extra.item.$.name)
        }
    }

    if (msggen.config && msggen.config.message && msggen.config.message.default && msggen.config.message.default.$) {
        if (msggen.config.message.default.$.method) {
            defaultMethod = msggen.config.message.default.$.method;
        }

        if (msggen.config.message.default.$.protocol) {
            defaultProtocol = msggen.config.message.default.$.protocol;
        }

        if (msggen.config.message.default.$.contentType) {
            defaultContentType = msggen.config.message.default.$.contentType;
        }
    }

    addLoginAPI(openAPI);

    if (msggen.config && msggen.config.message && msggen.config.message.extra && msggen.config.message.extra.item) {
        for (let item of msggen.config.message.extra.item) {
            let request = createRequest(openAPI, item, defaultMethod);
            if (tag) {
                request.addTag(tag);
            }

            if (msggen.config.response && msggen.config.response.extra && msggen.config.response.extra.item) {
                if (msggen.config.response.extra.item instanceof Array) {
                    for (let item of msggen.config.response.extra.item) {
                        if (item.$.name == request.name) {
                            let response = new Response();
                            let schema = new Schema(item.$.name+"Response");
                            response.content.addSchema(schema);
                            if (item.$.comment) {
                                response.description = item.$.comment;
                            }
                            request.addResponse(response);

                            addComponent(openAPI, item, item.$.name+"Response")

                            break;
                        }
                    }
                }
            }

            if (!request.responses) {
                let schema = new Schema(item.$.name+"Response");
                let response = new Response();
                response.content.addSchema(schema);
                request.addResponse(response);

                addComponent(openAPI, {}, item.$.name+"Response")
            }

            openAPI.addApi(item.$.url, request);
        }
    }

    return true;
}

var argv = require('yargs')
            .option('_', {
                nargs: 2
            })
            .options({
                'i': {
                    alias : 'input',
                    demand: true,
                    describe: 'msggen messages directory path',
                    type: 'string'
                },
                'o': {
                    alias : 'output',
                    demand: true,
                    describe: 'output yaml file path',
                    type: 'string'
                },
                'n': {
                    alias : 'name',
                    demand: true,
                    describe: 'application name',
                    type: 'string',
                    array: true
                }
            })
            .argv;

process.exit(msggen2Openapi(argv.input, argv.output, argv.name)?0:1);

export default msggen2Openapi;
