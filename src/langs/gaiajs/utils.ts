import utils from '../utils';
import { Schema } from "../../openapi";

Object.assign(utils, {
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

      case 'string':
        return 'string';

      case 'array':
        if (schema.items) {
          if ((schema.items.type === 'object' && (schema.items.$ref || schema.items.properties)) || schema.items.type === 'array') {
            return `Array<${this.typeFor(schema.items)}>`;
          } else {
            return `${this.typeFor(schema.items)}[]`;
          }
        };

        return 'Array';

      case 'map':
        return `Map<string, ${this.typeFor(schema.additionalProperties)}>`;

      case 'object':
        if (schema.properties) {
          return '{ ' + Object.keys(schema.properties).map(name => { return name + ': ' + this.typeFor(schema.properties[name]); }).join('; ') + ' }';
        }
        return schema.format || schema.type;

      default:
        return schema.format || schema.type;
    }
  },

  // 在validator中声明的类型
  primitiveType(schema: Schema) {
    if (['object', 'array'].indexOf(schema.type) >= 0) {
      return schema.type;
    }

    return this.typeFor(schema);
  }

  // validatorType(schema: Schema) {
  //   return schema
  // }
});

export default utils;
