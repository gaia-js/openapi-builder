import * as fs from 'fs';
import * as path from 'path';
import OpenAPI, { Request } from "../../openapi";

export default async function(openApi: OpenAPI, outputPath: string): Promise<boolean> {
  try {
    fs.writeFileSync(path.resolve(outputPath, `openapi.yaml`), openApi.dump());
  } catch (err) {
    console.error('generate openapi yaml failed: ', err);
  }

  return true;
}
