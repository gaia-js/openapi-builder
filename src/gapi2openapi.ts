import OpenAPI, { Request, Response, Parameter, SchemaObject, Schema } from "./openapi";
import * as fs from "fs";
import * as path from "path";
import * as jsYaml from "js-yaml";

namespace gapi {
  export interface Schema {
    type: string
    comment: string
    properties: {[name: string]: Schema}
  }

  type Response = Schema;

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
    ['app-name']: string
    ['common-response']: Schema
    paths: Path[]
    types: {[name: string]: Schema}
  }
}

export default function readGapi(gapiFilePath: string): OpenAPI {
  const doc: gapi.GapiDoc = jsYaml.safeLoad(fs.readFileSync(gapiFilePath, 'utf8'));

  const openApi: OpenAPI = new OpenAPI();

  ['title', 'description', 'version'].forEach(name => {
    openApi[name] = doc[name];
  });
  doc.paths.forEach(path => {
    const request = new Request(path.name, path.method)
    request.description = path.response.comment
    const response = new Response();
    request.addResponse(response)

    Object.keys(path.parameters).forEach(name => {
      const parameter = new Parameter(name, path.parameters[name].type)
      parameter.description = path.parameters[name].comment
      request.addParameter(parameter)
    })

    openApi.paths.addRequest(path.url, request)
  })

  Object.keys(doc.types).forEach(name => {
    const schema = new SchemaObject()

    const properties = doc.types[name].properties
    Object.keys(properties).forEach(name => {
      const propertySchema = new Schema(properties[name].type)
      propertySchema.description = properties[name].comment
      schema.addProperty(name, propertySchema)
    })

    openApi.addComponent(name, schema)
  })

  return openApi
}
