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
  ObjectType, TypeElement, PrimitiveType, ElemID, BuiltinTypes, Field, MapType, ListType,
  isListType, isObjectType,
} from '@salto-io/adapter-api'
import { naclCase, pathNaclCase } from '@salto-io/adapter-utils'
import { collections, values as lowerdashValues } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import SwaggerParser from '@apidevtools/swagger-parser'
import { OpenAPI, OpenAPIV2, IJsonSchema } from 'openapi-types'
import { ZuoraApiModuleConfig } from '../types'
import {
  TYPES_PATH, ZUORA, SUBTYPES_PATH, GET_ENDPOINT_SCHEMA_ANNOTATION, TOP_LEVEL_FIELDS,
  GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION, PAGINATION_FIELDS, ADDITIONAL_PROPERTIES_FIELD,
} from '../constants'
import { toPrimitiveType } from './transformer'

const { makeArray } = collections.array
const { isDefined } = lowerdashValues
const log = logger(module)

// TODON also support v3
type ReferenceObject = OpenAPIV2.ReferenceObject
type SchemaObject = OpenAPIV2.SchemaObject

export type ModuleTypeDefs = Record<string, TypeElement>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isReferenceObject = (value: any): value is ReferenceObject => (
  value?.$ref !== undefined
)

const toTypeName = (endpointName: string): string => (
  // TODON improve names
  endpointName.split('/').filter(p => !_.isEmpty(p)).join('__')
)

const toNormalizedTypeName = (moduleName: string, refName: string): string => (
  naclCase(`${moduleName}_${_.last(refName.split('/'))}`)
)

const findDataField = (type: ObjectType): string | undefined => {
  // TODON improve, look at types as well, allow overriding in config?
  if (Object.keys(type.fields).some(
    fieldName => TOP_LEVEL_FIELDS.has(fieldName)
  )) {
    // the entire object should be used
    return undefined
  }
  const potentialDataFields = _.pickBy(
    type.fields,
    field => (
      !PAGINATION_FIELDS.has(field.name)
      && (isObjectType(field.type)
        || (isListType(field.type) && isObjectType(field.type.innerType)))
    )
  )
  if (!_.isEmpty(potentialDataFields)) {
    const potentialFieldNames = Object.keys(potentialDataFields)
    if (potentialFieldNames.length === 1) {
      return Object.keys(potentialDataFields)[0]
    }
    log.warn(`found too many data fields for ${type.elemID.getFullName()} (${potentialFieldNames}) - returning full element`)
  } else {
    log.error(`could not find data field for ${type.elemID.getFullName()}`)
  }
  return undefined
}

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

const generateTypesForModule = async (
  module: ZuoraApiModuleConfig,
  moduleName: string,
): Promise<ModuleTypeDefs> => {
  const definedTypes: Record<string, ObjectType> = {}
  // keep track of the top-level schemas, so that even if they are reached from another
  // endpoint before being reached directly, they will be treated as top-level
  // (alternatively, we could create a DAG if we knew there are no cyclic dependencies)
  const endpointRootSchemaRefs: Record<string, string> = {}

  const addType = (
    schema: ReferenceObject | SchemaObject,
    refs: SwaggerParser.$Refs,
    typeName: string,
    pathRoot: string[],
    endpointName?: string,
  ): PrimitiveType | ObjectType => {
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

    const createObjectType = (
      schemaDef: SchemaObject,
      objName: string,
      apiEndpointName?: string,
    ): ObjectType => {
      if (definedTypes[objName] === undefined) {
        const naclObjName = naclCase(objName)

        const annotationProperties = (apiEndpointName !== undefined
          ? {
            annotationTypes: {
              [GET_ENDPOINT_SCHEMA_ANNOTATION]: new ListType(BuiltinTypes.STRING),
              [GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION]: BuiltinTypes.STRING,
            },
            annotations: {
              [GET_ENDPOINT_SCHEMA_ANNOTATION]: [apiEndpointName],
            },
          }
          : {})

        // first add an empty type, to avoid endless recursion in cyclic references from fields
        definedTypes[objName] = new ObjectType({
          elemID: new ElemID(ZUORA, naclObjName),
          // TODON organize better in folders
          path: apiEndpointName !== undefined
            ? [ZUORA, ...pathRoot,
              pathNaclCase(naclObjName)]
            : [ZUORA, ...pathRoot, SUBTYPES_PATH,
              pathNaclCase(naclObjName), pathNaclCase(naclObjName)],
          ...annotationProperties,
        })

        const allProperties = flattenAllOfProps(schemaDef)
        const additionalProperties = flattenAllOfAddlProps(schemaDef)

        if (additionalProperties.length > 1) {
          log.error('too many additionalProperties found in allOf - using first')
        }

        if (additionalProperties.length > 0) {
          Object.assign(
            definedTypes[objName].fields,
            { [ADDITIONAL_PROPERTIES_FIELD]: new Field(
              definedTypes[objName],
              ADDITIONAL_PROPERTIES_FIELD,
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              new MapType(createNestedType(
                // TODON check if always ok to cast from IJsonSChema to SchemaObject
                additionalProperties[0] as (ReferenceObject | SchemaObject),
                // fallback type name when no name is provided in the swagger def
                `${objName}_${ADDITIONAL_PROPERTIES_FIELD}`,
              )),
            ) },
          )
        }

        Object.assign(
          definedTypes[objName].fields,
          _.pickBy(
            Object.fromEntries(Object.entries(allProperties).map(([fieldName, fieldSchema]) => (
              // the rest goes to Types - objects referenced directly from endpoints
              // will be at the root
              [fieldName, new Field(
                definedTypes[objName],
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

        if (apiEndpointName !== undefined) {
          const dataFieldName = findDataField(definedTypes[objName])
          if (dataFieldName !== undefined) {
            definedTypes[objName].annotate({
              [GET_RESPONSE_DATA_FIELD_SCHEMA_ANNOTATION]: dataFieldName,
            })
          }
        }
      } else if (
        apiEndpointName !== undefined
        && !(definedTypes[objName].annotations[GET_ENDPOINT_SCHEMA_ANNOTATION] ?? []).includes(
          apiEndpointName
        )
      ) {
        // multiple GET endpoints are using the same schema - list all
        definedTypes[objName].annotations[GET_ENDPOINT_SCHEMA_ANNOTATION] = [
          ...definedTypes[objName].annotations[GET_ENDPOINT_SCHEMA_ANNOTATION] ?? [],
          apiEndpointName,
        ]
      }
      return definedTypes[objName]
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
            refs,
            nestedName,
            pathRoot,
          ))
        }
        if (
          schemaDef.type === 'object'
          && schemaDef.properties === undefined
          && schemaDef.additionalProperties === undefined
        ) {
          // TODON can also just be unknown
          return new MapType(BuiltinTypes.UNKNOWN)
        }
      }
      return addType(
        schemaDef,
        refs,
        nestedName,
        pathRoot,
      )
    }

    if (isReferenceObject(schema)) {
      return addType(
        refs.get(schema.$ref),
        refs,
        toNormalizedTypeName(moduleName, schema.$ref),
        pathRoot,
        endpointName,
      )
    }

    if (schema.anyOf !== undefined || schema.oneOf !== undefined || schema.not !== undefined) {
      log.error(`'anyOf', 'oneOf' and 'not' are not supported - the schema for ${typeName} will be inaccurate`)
    }

    if (schema.type === 'object' || schema.properties !== undefined || schema.allOf !== undefined) {
      return createObjectType(schema, typeName, endpointName ?? endpointRootSchemaRefs[typeName])
    }
    return toPrimitiveType(makeArray(schema.type))
  }

  const { schemas: getResponseSchemas, refs } = await getParsedDefs(module.swagger)

  Object.assign(
    endpointRootSchemaRefs,
    Object.fromEntries(
      Object.entries(_.pickBy(
        _.mapValues(getResponseSchemas, schema => (
          schema.$ref !== undefined
            ? toNormalizedTypeName(moduleName, schema.$ref)
            : undefined
        )),
        isDefined,
      )).map(([endpointName, refName]) => [refName, endpointName])
    )
  )

  Object.entries(getResponseSchemas).forEach(
    ([endpointName, schema]) => addType(
      schema,
      refs,
      `${moduleName}__${toTypeName(endpointName)}`,
      [TYPES_PATH, moduleName],
      endpointName,
    )
  )
  return definedTypes
}

export const generateTypes = async (
  modules: Record<string, ZuoraApiModuleConfig>,
): Promise<Record<string, ModuleTypeDefs>> => {
  const typeDefs = await Promise.all(Object.entries(modules).map(async ([moduleName, module]) => (
    [moduleName, await generateTypesForModule(module, moduleName)]
  )))

  return Object.fromEntries(typeDefs)
}
