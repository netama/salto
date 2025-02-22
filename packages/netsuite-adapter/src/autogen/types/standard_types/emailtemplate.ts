/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
/* eslint-disable max-len */
/* eslint-disable camelcase */
import {
  BuiltinTypes,
  createRefToElmWithValue,
  CORE_ANNOTATIONS,
  ElemID,
  ObjectType,
  createRestriction,
} from '@salto-io/adapter-api'
import * as constants from '../../../constants'
import { TypeAndInnerTypes } from '../../../types/object_types'
import { enums } from '../enums'
import { fieldTypes } from '../../../types/field_types'

export const emailtemplateType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const emailtemplateElemID = new ElemID(constants.NETSUITE, 'emailtemplate')

  const emailtemplate = new ObjectType({
    elemID: emailtemplateElemID,
    annotations: {},
    fields: {
      scriptid: {
        refType: createRefToElmWithValue(BuiltinTypes.SERVICE_ID),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({
            regex: 'standardemailtemplate|standardpaymentlinktransactionemailtemplate|^custemailtmpl[0-9a-z_]+',
          }),
        },
      } /* Original description: This attribute value can be up to 99 characters long.   The default value is ‘custemailtmpl’. */,
      name: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 60 }),
        },
      } /* Original description: This field value can be up to 60 characters long. */,
      mediaitem: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was filereference */),
        annotations: {},
      } /* Original description: This field is mandatory when the usesmedia value is equal to T.   This field must reference a file with any of the following extensions: .ftl, .html, .txt */,
      description: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 1000 }),
        },
      } /* Original description: This field value can be up to 1000 characters long. */,
      recordtype: {
        refType: createRefToElmWithValue(enums.emailtemplate_recordtype),
        annotations: {},
      } /* Original description: For information about possible values, see emailtemplate_recordtype. */,
      isinactive: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      subject: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 199 }),
        },
      } /* Original description: This field value can be up to 199 characters long. */,
      isprivate: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      addunsubscribelink: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      addcompanyaddress: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      usesmedia: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      content: {
        refType: createRefToElmWithValue(fieldTypes.fileContent),
        annotations: {
          [constants.ADDITIONAL_FILE_SUFFIX]: 'html',
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, emailtemplateElemID.name],
  })

  return { type: emailtemplate, innerTypes }
}
