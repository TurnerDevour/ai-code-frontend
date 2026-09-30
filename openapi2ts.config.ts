export default {
  requestLibPath: "import request from '@/utils/request'",
  schemaPath: 'http://localhost:8123/api/v3/api-docs',
  serversPath: './src',
  hook: {
    afterOpenApiDataInited(openAPIData) {
      const updateIdTypes = (value: unknown): void => {
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
          const id = (properties as Record<string, unknown>).id
          if (id && typeof id === 'object' && !Array.isArray(id)) {
            Object.assign(id, { type: 'string', format: undefined })
          }
        }

        if (record.name === 'id') {
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
