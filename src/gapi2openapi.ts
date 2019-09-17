import OpenAPI, { Request, Response, Parameter, SchemaObject, Schema, Server } from "./openapi";
import * as fs from "fs";
import * as path from "path";
import * as jsYaml from "js-yaml";

namespace gapi {
  export interface Schema {
    type: string
    comment: string
    properties: {[name: string]: Schema}
  }

  interface Response extends Schema {
    mimetype: string
  }

  export interface Path {
    name: string
    url: string
    comment: string
    method: string
    response: Response
    parameters: {[name: string]: Schema}
  }

  export interface GapiDoc {
    title: string,
    description: string
    version: string
    ['app-name']: string|string[]
    ['common-response']: Schema
    paths: Path[]
    types: {[name: string]: Schema}
  }
}

function createSchema(gapiSchema: gapi.Schema, commonSchema?: any): Schema {
  const schema = new Schema(gapiSchema.type)
  schema.description = gapiSchema.comment || ''

  commonSchema && Object.keys(commonSchema.properties).forEach(name => {
    schema.addProperty(name, createSchema(commonSchema.properties[name]))
  })

  gapiSchema.properties && Object.keys(gapiSchema.properties).forEach(name => {
    schema.addProperty(name, createSchema(gapiSchema.properties[name]))
  });

  return schema
}

export default function readGapi(gapiFilePath: string): OpenAPI {
  const doc: gapi.GapiDoc = jsYaml.safeLoad(fs.readFileSync(gapiFilePath, 'utf8'));

  const openApi: OpenAPI = new OpenAPI();

  ['title', 'description', 'version'].forEach(name => {
    openApi[name] = doc[name];
  });

  // server
  const host = doc["app-name"]
  if (host instanceof Array) {
    for (let item of host) {
      openApi.addServer(new Server("https://"+item+".test.17zuoye.net", "test server"));
      openApi.addServer(new Server("https://"+item+".staging.17zuoye.net", "staging server"));
      openApi.addServer(new Server("https://"+item+".17zuoye.com", "production server"));
    }
  }
  else {
    openApi.addServer(new Server("https://"+host+".test.17zuoye.net", "test server"));
    openApi.addServer(new Server("https://"+host+".staging.17zuoye.net", "staging server"));
    openApi.addServer(new Server("https://"+host+".17zuoye.com", "production server"));
  }

  // paths
  doc.paths.forEach(path => {
    const request = new Request(path.name, path.method || 'get')
    request.description = path.comment

    const response = new Response();

    path.parameters && Object.keys(path.parameters).forEach(name => {
      const parameter = new Parameter(name, path.parameters[name].type)
      parameter.description = path.parameters[name].comment
      request.addParameter(parameter)
    })

    const schema = createSchema(path.response, doc["common-response"])

    response.content.addSchema(schema, path.response.mimetype || 'application/json')
    request.addResponse(response)

    openApi.paths.addRequest(path.url, request)
  })

  Object.keys(doc.types).forEach(name => {
    openApi.addComponent(name, createSchema(doc.types[name]))
  })

  return openApi
}
