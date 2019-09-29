import utils from '../utils';
import { Schema } from "../../openapi";

utils.typeFor = function(schema: Schema) {
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
        if (schema.items.type === 'object' || schema.items.type === 'array') {
          return `Array<${this.typeFor(schema.items)}>`;
        } else {
          return `${this.typeFor(schema.items)}[]`;
        }
      };

      return 'Array';

    case 'object':
      return '{' + Object.keys(schema.properties).map(name => {return name+':'+this.typeFor(schema.properties[name]);}).join(',') + '}';

    default:
      return schema.type;
  }
}

export default utils;
