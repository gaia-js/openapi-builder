import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import OpenAPI, { Request } from "../../openapi";

export default async function(openApi: OpenAPI, outputPath: string): Promise<boolean> {
  const requestPath = path.resolve(outputPath, 'request');
  if (!await fs.exists(requestPath)) {
    await fs.mkdir(requestPath)
  }

  const requestTemplate = nunjucks.compile(fs.readFileSync(path.resolve('templates', 'request.njk')));

  openApi.paths.requests.forEach((request: Request) => {
    fs.writeFileSync(path.resolve(requestPath, `${request.name}.ts`), requestTemplate.render(request));
  });

  return true;
}
