import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import OpenAPI, { Request } from "../../openapi";
import utils from '../utils';

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
    let itemCount = 0;
    openApi.paths[pathItem] && Object.keys(openApi.paths[pathItem]).forEach(method => {
      if (openApi.paths[pathItem][method] instanceof Request) {
        const request: Request = openApi.paths[pathItem][method];
        try {
          fs.writeFileSync(path.resolve(requestPath, `${itemCount > 0?`${method}_`:''}${request.name}.ts`), requestTemplate().render({request, utils}));

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
              fs.writeFileSync(path.resolve(responsePath, `${itemCount > 0?`${method}_`:''}${request.name}.ts`), responseTemplate().render({name: request.name, response: request.responses[statusCode], utils, schema}));
            });
          });
        } catch (err) {
          console.error('render failed', err);
        }

        itemCount ++;
      }
    })
  });

  return true;
}
