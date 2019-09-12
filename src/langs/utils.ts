import OpenAPI, { Request, Response, Schema, SchemaObject } from "../openapi";

export default {
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
