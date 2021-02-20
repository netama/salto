/*
*                      Copyright 2021 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import _ from 'lodash'
import {
  ObjectType, PrimitiveType, ElemID, BuiltinTypes, Field, MapType, ListType, TypeMap,
} from '@salto-io/adapter-api'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import SwaggerParser from '@apidevtools/swagger-parser'
import { OpenAPI, OpenAPIV2, IJsonSchema } from 'openapi-types'
import { naclCase, pathNaclCase } from '../../nacl_case_utils'
import { TYPES_PATH, SUBTYPES_PATH } from '../constants'
import { AdapterApiConfig } from './endpoint_config'

const { isDefined } = lowerdashValues
const { makeArray } = collections.array
const log = logger(module)

// TODO also support v3
type ReferenceObject = OpenAPIV2.ReferenceObject
type SchemaObject = OpenAPIV2.SchemaObject

// field to use for swagger additionalProperties
export const ADDITIONAL_PROPERTIES_FIELD = 'additionalProperties'

export const toPrimitiveType = (val: string | string[] | undefined): PrimitiveType => {
  const swaggerTypeMap: Record<string, PrimitiveType> = {
    // openapi3
    string: BuiltinTypes.STRING,
    boolean: BuiltinTypes.BOOLEAN,
    number: BuiltinTypes.NUMBER,
    integer: BuiltinTypes.NUMBER,
    // openapi2
    long: BuiltinTypes.NUMBER,
    float: BuiltinTypes.NUMBER,
    double: BuiltinTypes.NUMBER,
    byte: BuiltinTypes.STRING,
    binary: BuiltinTypes.STRING,
    password: BuiltinTypes.STRING,
    // TODO add dedicated type?
    date: BuiltinTypes.STRING,
    dateTime: BuiltinTypes.STRING,
  }
  const types = (makeArray(val)
    .map(typeName => swaggerTypeMap[typeName])
    .filter(isDefined))
  if (types.length > 1) {
    log.warn(`Found too many types for ${val} - using first one`)
  }
  if (types[0] !== undefined) {
    return types[0]
  }
  log.error(`Could not find primitive type ${val}, falling back to unknown`)
  return BuiltinTypes.UNKNOWN
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isReferenceObject = (value: any): value is ReferenceObject => (
  value?.$ref !== undefined
)

const ID_SEPARATOR = '__'
const toTypeName = (endpointName: string): string => (
  endpointName.split('/').filter(p => !_.isEmpty(p)).join(ID_SEPARATOR)
)

const toNormalizedRefName = (ref: ReferenceObject): string => (
  // conflicts can only happen if the swagger ref definitions have names that only differ
  // in non-alnum characters - hopefully that's unlikely
  pathNaclCase(naclCase(_.last(ref.$ref.split('/'))))
)

const getParsedDefs = async (swaggerPath: string):
    Promise<{
    schemas: Record<string, ReferenceObject | SchemaObject>
    refs: SwaggerParser.$Refs
  }> => {
  const parser = new SwaggerParser()
  const parsedSwagger: OpenAPI.Document = await parser.bundle(swaggerPath)
  const getDefs: Record<string, OpenAPIV2.OperationObject> = _.pickBy(
    _.mapValues(parsedSwagger.paths, def => def.get),
    isDefined,
  )
  const responseSchemas = _.pickBy(
    _.mapValues(getDefs, def => def.responses?.[200]?.schema),
    isDefined,
  )
  return {
    schemas: responseSchemas,
    refs: parser.$refs,
  }
}

/**
 * Extract the nested fields for the specified schema that are defined in its allOf nested schemas,
 * including additionalProperties.
 */
const extractAllOf = (schemaDefObj: SchemaObject, refs: SwaggerParser.$Refs): {
  allProperties: Record<string, SchemaObject>
  additionalProperties?: IJsonSchema
} => {
  const recursiveAllOf = (ijSchema: IJsonSchema): IJsonSchema[] => {
    if (ijSchema.allOf === undefined) {
      return []
    }
    return [
      ...ijSchema.allOf,
      ...ijSchema.allOf.flatMap(recursiveAllOf),
    ]
  }

  const flattenAllOfProps = (schemaDef: SchemaObject): Record<string, SchemaObject> => ({
    ...schemaDef.properties,
    ...Object.assign(
      {},
      ...(recursiveAllOf(schemaDef)).flatMap(nested => (
        isReferenceObject(nested)
          ? flattenAllOfProps(refs.get(nested.$ref))
          : {
            ...nested.properties,
            ...flattenAllOfProps(nested.properties ?? {}),
          }
      )),
    ),
  })

  const flattenAllOfAddlProps = (schemaDef: SchemaObject): IJsonSchema[] => (
    [
      schemaDef.additionalProperties,
      ...recursiveAllOf(schemaDef).flatMap(nested => (
        isReferenceObject(nested)
          ? flattenAllOfAddlProps(refs.get(nested.$ref))
          : [
            nested.additionalProperties,
            ...flattenAllOfAddlProps(nested.properties ?? {}),
          ]
      )),
    ].map(p => (p === false ? undefined : p))
      .map(p => (p === true ? {} : p))
      .filter(isDefined)
  )

  const additionalProperties = flattenAllOfAddlProps(schemaDefObj)
  if (additionalProperties.length > 1) {
    log.error('too many additionalProperties found in allOf - using first')
  }

  return {
    allProperties: flattenAllOfProps(schemaDefObj),
    additionalProperties: additionalProperties[0],
  }
}

/**
 * Adjust the computed types to fix known inconsistencies between the swagger and the response data.
 */
const fixTypes = (
  definedTypes: Record<string, ObjectType>,
  fieldTypeOverrides: AdapterApiConfig['fieldTypeOverrides'],
): void => {
  Object.entries(fieldTypeOverrides ?? {}).forEach(([typeName, fieldsToFix]) => {
    const type = definedTypes[typeName]
    if (type === undefined) {
      log.error('type %s not found, cannot override its field types', typeName)
      return
    }
    Object.entries(fieldsToFix).forEach(([fieldName, { type: newType, list }]) => {
      const field = type.fields[fieldName]
      if (field === undefined) {
        log.error('field %s.%s not found, cannot override its type', typeName, fieldName)
        return
      }
      // will fall back to unknown
      const newFieldType = definedTypes[newType] ?? toPrimitiveType(newType)
      log.info('Modifying field type for %s.%s from %s to %s', typeName, fieldName, field.type.elemID.name, newFieldType.elemID.name)
      field.type = list ? new ListType(newFieldType) : newFieldType
    })
  })
}

/**
 * Generate types for the given Swagger / OpenAPI V2 definitions.
 */
export const generateTypesV2 = async (
  adapterName: string,
  {
    swagger,
    additionalEndpoints,
    fieldTypeOverrides,
  }: AdapterApiConfig,
): Promise<{
  types: TypeMap
  typeByEndpoint: Record<string, ObjectType>
}> => {
  // TODO persist swagger locally

  const definedTypes: Record<string, ObjectType> = {}
  const typeByEndpoint: Record<string, ObjectType> = {}

  // additional endpoint definitions that were missing in the swagger
  const additionalEndpointsByDef = _.mapValues(
    _.groupBy(
      additionalEndpoints ?? [].filter(({ schemaRef }) => schemaRef !== undefined),
      ({ schemaRef }) => schemaRef
    ),
    defs => defs.map(({ url }) => url),
  )

  const { schemas: getResponseSchemas, refs } = await getParsedDefs(swagger)

  // keep track of the top-level schemas, so that even if they are reached from another
  // endpoint before being reached directly, they will be treated as top-level
  // (alternatively, we could create a DAG if we knew there are no cyclic dependencies)
  const endpointRootSchemaRefs = Object.fromEntries(
    Object.entries(_.pickBy(
      _.mapValues(getResponseSchemas, schema => (
        isReferenceObject(schema)
          ? toNormalizedRefName(schema)
          : undefined
      )),
      isDefined,
    // we need *some* endpoint, so it's ok if there are conflicts
    )).map(([endpointName, refName]) => [refName, endpointName])
  )

  const addType = (
    schema: ReferenceObject | SchemaObject,
    typeName: string,
    endpointName?: string,
  ): PrimitiveType | ObjectType => {
    const createObjectType = ({
      schemaDef,
      objName,
      isRootType,
    }: {
      adapterName: string
      schemaDef: SchemaObject
      objName: string
      isRootType: boolean
      refs: SwaggerParser.$Refs
    }): ObjectType => {
      const naclObjName = naclCase(objName)

      // first add an empty type, to avoid endless recursion in cyclic references from fields
      const type = new ObjectType({
        elemID: new ElemID(adapterName, naclObjName),
        // TODO organize better in folders
        path: isRootType
          ? [adapterName, TYPES_PATH,
            pathNaclCase(naclObjName)]
          : [adapterName, TYPES_PATH, SUBTYPES_PATH,
            pathNaclCase(naclObjName), pathNaclCase(naclObjName)],
      })

      const { allProperties, additionalProperties } = extractAllOf(schemaDef, refs)

      if (additionalProperties !== undefined) {
        Object.assign(
          type.fields,
          { [ADDITIONAL_PROPERTIES_FIELD]: new Field(
            type,
            ADDITIONAL_PROPERTIES_FIELD,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            new MapType(createNestedType(
              // TODO check if always ok to cast from IJsonSChema to SchemaObject
              additionalProperties as (ReferenceObject | SchemaObject),
              // fallback type name when no name is provided in the swagger def
              `${objName}_${ADDITIONAL_PROPERTIES_FIELD}`,
            )),
          ) },
        )
      }

      Object.assign(
        type.fields,
        _.pickBy(
          Object.fromEntries(Object.entries(allProperties).map(([fieldName, fieldSchema]) => (
            [fieldName, new Field(
              type,
              fieldName,
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              createNestedType(
                fieldSchema,
                `${objName}_${fieldName}`,
              ),
            )]
          ))),
          isDefined,
        ),
      )
      return type
    }

    const createNestedType = (
      schemaDef: ReferenceObject | SchemaObject,
      nestedName: string,
    ): ObjectType | ListType | PrimitiveType => {
      if (
        !isReferenceObject(schemaDef)
      ) {
        if (schemaDef.type === 'array' && schemaDef.items !== undefined) {
          return new ListType(addType(
            schemaDef.items,
            nestedName,
          ))
        }
        if (
          schemaDef.type === 'object'
          && schemaDef.properties === undefined
          && schemaDef.additionalProperties === undefined
        ) {
          return BuiltinTypes.UNKNOWN
        }
      }
      return addType(
        schemaDef,
        nestedName,
      )
    }

    const toObjectType = (
      schemaDef: SchemaObject,
      objName: string,
      apiEndpointName?: string,
    ): ObjectType => {
      const apiEndpoints = (apiEndpointName
        ? [apiEndpointName, ...(additionalEndpointsByDef[naclCase(objName)] ?? [])]
        : undefined)

      if (definedTypes[objName] === undefined) {
        definedTypes[objName] = createObjectType({
          adapterName,
          schemaDef,
          objName,
          isRootType: !_.isEmpty(apiEndpoints),
          refs,
        })
      }
      if (apiEndpoints !== undefined) {
        apiEndpoints.forEach(endpoint => {
          if (typeByEndpoint[endpoint] === undefined) {
            typeByEndpoint[endpoint] = definedTypes[objName]
          }
        })
      }
      return definedTypes[objName]
    }

    if (isReferenceObject(schema)) {
      return addType(
        refs.get(schema.$ref),
        toNormalizedRefName(schema),
        endpointName,
      )
    }
    // only checking allOf since oneOf / anyOf / not are not supported in OpenAPI v2
    if (schema.type === 'object' || schema.properties !== undefined || schema.allOf !== undefined) {
      return toObjectType(schema, typeName, endpointName ?? endpointRootSchemaRefs[typeName])
    }
    return toPrimitiveType(schema.type)
  }

  Object.entries(getResponseSchemas).forEach(
    ([endpointName, schema]) => addType(
      schema,
      toTypeName(endpointName),
      endpointName,
    )
  )

  if (fieldTypeOverrides !== undefined) {
    fixTypes(definedTypes, fieldTypeOverrides)
  }

  return {
    types: definedTypes,
    typeByEndpoint,
  }
}
