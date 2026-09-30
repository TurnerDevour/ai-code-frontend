export default {
  requestLibPath: "import request from '@/utils/request'",
  schemaPath: 'http://localhost:8123/api/v3/api-docs',
  serversPath: './src',
  hook: {
    afterOpenApiDataInited(openAPIData: unknown) {
      const updateIdTypes = (value: unknown): void => {
        const identifierNames = new Set(['id', 'appId', 'userId'])

        if (!value || typeof value !== 'object') {
          return
        }

        if (Array.isArray(value)) {
          value.forEach(updateIdTypes)
          return
        }

        const record = value as Record<string, unknown>
        const properties = record.properties
        if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
          // @ts-ignore
          for (const identifierName of identifierNames) {
            const identifier = (properties as Record<string, unknown>)[identifierName]
            if (identifier && typeof identifier === 'object' && !Array.isArray(identifier)) {
              Object.assign(identifier, { type: 'string', format: undefined })
            }
          }
        }

        if (typeof record.name === 'string' && identifierNames.has(record.name)) {
          const schema = record.schema
          if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
            Object.assign(schema, { type: 'string', format: undefined })
          }
        }

        Object.values(record).forEach(updateIdTypes)
      }

      updateIdTypes(openAPIData)
      return openAPIData
    },
  },
}
