import OpenAPI from "./openapi";
import * as fs from "fs";
import * as path from "path";
import * as jsYaml from "js-yaml";


export default function readGapi(gapiFilePath: string) {
  const openApi: OpenAPI = new OpenAPI();
  const doc = jsYaml.safeLoad(fs.readFileSync(gapiFilePath, 'utf8'));

  openApi.load(doc);

}
