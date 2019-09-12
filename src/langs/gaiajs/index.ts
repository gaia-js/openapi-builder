import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import OpenAPI, { Request, Response, Schema, SchemaObject } from "../../openapi";

const utils = {
  refTypes(request: Request) {
    const refs = new Set<string>();
    request.parameters && request.parameters.forEach(parameter => {
      if (parameter.schema.$ref) {
        refs.add(this.typeFor(parameter.schema));
      }
      else if (parameter.schema.type === 'array' && parameter.schema.items && parameter.schema.items.$ref) {
        refs.add(this.typeFor(parameter.schema.items));
      }
    });

    return refs.values();
  },

  refTypesForSchemaObject(schema: SchemaObject) {
    const refs = new Set<string>();
    schema.properties && Object.keys(schema.properties).forEach(name => {
      if (schema.properties[name].$ref) {
        refs.add(this.typeFor(schema.properties[name]));
      }
      else if (schema.properties[name].type === 'array' && schema.properties[name].items && schema.properties[name].items.$ref) {
        refs.add(this.typeFor(schema.properties[name].items));
      }
    });

    return refs.values();
  },

  refTypesForResponse(response: Response) {
    const refs = new Set<string>();
    Object.keys(response.content).forEach(mimetype => {
      const schema = response.content[mimetype];

      schema.properties && Object.keys(schema.properties).forEach(name => {
        if (schema.properties[name].$ref) {
          refs.add(this.typeFor(schema.properties[name]));
        }
        else if (schema.properties[name].type === 'array' && schema.properties[name].items && schema.properties[name].items.$ref) {
          refs.add(this.typeFor(schema.properties[name].items));
        }
      });
    })

    return refs.values();
  },

  typeFor(schema: Schema) {
    if (schema.$ref) {
      const objecType = schema.$ref.split('/');
      return `${objecType[objecType.length-1]}`;
    }

    switch (schema.type) {
      case 'integer':
      case 'int':
      case 'long':
      case 'float':
      case 'double':
        return 'number';

      case 'array':
        if (schema.items) {
          return `${this.typeFor(schema.items)}[]`;
        };

        return 'Array';

      default:
        return schema.type;
    }
  }
}

let _requestTemplate: nunjucks.Template
function requestTemplate(): nunjucks.Template {
  if (!_requestTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'request.njk')));

    _requestTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'request.njk')).toString());
  }

  return _requestTemplate;
}

let _schemaTemplate: nunjucks.Template
function schemaTemplate(): nunjucks.Template {
  if (!_schemaTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'request.njk')));

    _schemaTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'schema.njk')).toString());
  }

  return _schemaTemplate;
}

let _responseTemplate: nunjucks.Template
function responseTemplate(): nunjucks.Template {
  if (!_responseTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'response.njk')));

    _responseTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'response.njk')).toString());
  }

  return _responseTemplate;
}

export default async function(openApi: OpenAPI, outputPath: string): Promise<boolean> {

  const typesPath = path.resolve(outputPath, 'types');
  if (!fs.existsSync(typesPath)) {
    fs.mkdirSync(typesPath);
  }

  Object.keys(openApi.components.schemas).forEach(name => {
    try {
      const schema = openApi.components.schemas[name];
      fs.writeFileSync(path.resolve(typesPath, `${name}.ts`), schemaTemplate().render({name, schema, utils}));
    } catch (err) {
      console.error('render types failed', err);
    }
  });

  const requestPath = path.resolve(outputPath, 'request');
  if (!fs.existsSync(requestPath)) {
    fs.mkdirSync(requestPath);
  }

  const responsePath = path.resolve(outputPath, 'response');
  if (!fs.existsSync(responsePath)) {
    fs.mkdirSync(responsePath);
  }

  Object.keys(openApi.paths).forEach(pathItem => {
    openApi.paths[pathItem] && Object.keys(openApi.paths[pathItem]).forEach(statusCode => {
      if (openApi.paths[pathItem][statusCode] instanceof Request) {
        const request: Request = openApi.paths[pathItem][statusCode];
        try {
          fs.writeFileSync(path.resolve(requestPath, `${request.name}.ts`), requestTemplate().render({request, utils}));

          Object.keys(request.responses).forEach(statusCode => {
            const responseContent = request.responses[statusCode].content;

            Object.keys(responseContent).forEach(mimeType => {
              if (!responseContent[mimeType] || !responseContent[mimeType].schema) {
                return;
              }

              if (mimeType && mimeType !== 'application/json') {
                // 现在的模版是json response的模版
                return;
              }

              const schema = responseContent[mimeType].schema;
              fs.writeFileSync(path.resolve(responsePath, `${request.name}.ts`), responseTemplate().render({name: request.name, response: request.responses[statusCode], utils, schema}));
            });
          });

          // fs.writeFileSync(path.resolve(requestPath, `${request.name}.ts`), nunjucks.render(path.resolve(__dirname, 'templates', 'request.njk'), request));
        } catch (err) {
          console.error('render failed', err);
        }
      }
    })
  });

  return true;
}
