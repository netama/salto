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
  ListType,
} from '@salto-io/adapter-api'
import * as constants from '../../../constants'
import { TypeAndInnerTypes } from '../../../types/object_types'
import { enums } from '../enums'

export const itemcustomfieldType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const itemcustomfieldElemID = new ElemID(constants.NETSUITE, 'itemcustomfield')
  const itemcustomfield_customfieldfilters_customfieldfilterElemID = new ElemID(
    constants.NETSUITE,
    'itemcustomfield_customfieldfilters_customfieldfilter',
  )

  const itemcustomfield_customfieldfilters_customfieldfilter = new ObjectType({
    elemID: itemcustomfield_customfieldfilters_customfieldfilterElemID,
    annotations: {},
    fields: {
      fldfilter: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: This field accepts references to the following custom types:   transactioncolumncustomfield   transactionbodycustomfield   othercustomfield   itemoptioncustomfield   itemnumbercustomfield   itemcustomfield   entitycustomfield   customrecordcustomfield   crmcustomfield   For information about other possible values, see generic_standard_field. */,
      fldfilterchecked: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      fldfiltercomparetype: {
        refType: createRefToElmWithValue(enums.generic_customfield_fldfiltercomparetype),
        annotations: {},
      } /* Original description: For information about possible values, see generic_customfield_fldfiltercomparetype.   The default value is 'EQ'. */,
      fldfiltersel: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was multi-select list */),
        annotations: {},
      } /* Original description: You can specify multiple values by separating each value with a pipe (|) symbol.   This field accepts references to the following custom types:   scriptdeployment   workflowactionscript   workflowstatecustomfield   workflowcustomfield   workflow   scriptdeployment   usereventscript   transactioncolumncustomfield   transactionbodycustomfield   transactionForm   scriptdeployment   suitelet   scriptdeployment   scheduledscript   savedsearch   role   scriptdeployment   restlet   scriptdeployment   portlet   othercustomfield   scriptdeployment   massupdatescript   scriptdeployment   mapreducescript   itemoptioncustomfield   itemnumbercustomfield   itemcustomfield   entryForm   entitycustomfield   statuses   customtransactiontype   instance   customrecordcustomfield   customrecordtype   customvalue   crmcustomfield   scriptdeployment   clientscript   scriptdeployment   bundleinstallationscript   advancedpdftemplate   addressForm */,
      fldfilterval: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      fldfilternotnull: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      fldfilternull: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      fldcomparefield: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the following custom types:   transactioncolumncustomfield   transactionbodycustomfield   othercustomfield   itemoptioncustomfield   itemnumbercustomfield   itemcustomfield   entitycustomfield   customrecordcustomfield   crmcustomfield   For information about other possible values, see generic_standard_field. */,
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, itemcustomfieldElemID.name],
  })

  innerTypes.itemcustomfield_customfieldfilters_customfieldfilter = itemcustomfield_customfieldfilters_customfieldfilter

  const itemcustomfield_customfieldfiltersElemID = new ElemID(constants.NETSUITE, 'itemcustomfield_customfieldfilters')

  const itemcustomfield_customfieldfilters = new ObjectType({
    elemID: itemcustomfield_customfieldfiltersElemID,
    annotations: {},
    fields: {
      customfieldfilter: {
        refType: createRefToElmWithValue(new ListType(itemcustomfield_customfieldfilters_customfieldfilter)),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, itemcustomfieldElemID.name],
  })

  innerTypes.itemcustomfield_customfieldfilters = itemcustomfield_customfieldfilters

  const itemcustomfield_roleaccesses_roleaccessElemID = new ElemID(
    constants.NETSUITE,
    'itemcustomfield_roleaccesses_roleaccess',
  )

  const itemcustomfield_roleaccesses_roleaccess = new ObjectType({
    elemID: itemcustomfield_roleaccesses_roleaccessElemID,
    annotations: {},
    fields: {
      role: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: This field accepts references to the role custom type.   For information about other possible values, see customrecordtype_permittedrole. */,
      accesslevel: {
        refType: createRefToElmWithValue(enums.generic_accesslevel_searchlevel),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see generic_accesslevel_searchlevel.   The default value is '0'. */,
      searchlevel: {
        refType: createRefToElmWithValue(enums.generic_accesslevel_searchlevel),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see generic_accesslevel_searchlevel.   The default value is '0'. */,
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, itemcustomfieldElemID.name],
  })

  innerTypes.itemcustomfield_roleaccesses_roleaccess = itemcustomfield_roleaccesses_roleaccess

  const itemcustomfield_roleaccessesElemID = new ElemID(constants.NETSUITE, 'itemcustomfield_roleaccesses')

  const itemcustomfield_roleaccesses = new ObjectType({
    elemID: itemcustomfield_roleaccessesElemID,
    annotations: {},
    fields: {
      roleaccess: {
        refType: createRefToElmWithValue(new ListType(itemcustomfield_roleaccesses_roleaccess)),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, itemcustomfieldElemID.name],
  })

  innerTypes.itemcustomfield_roleaccesses = itemcustomfield_roleaccesses

  const itemcustomfield = new ObjectType({
    elemID: itemcustomfieldElemID,
    annotations: {},
    fields: {
      scriptid: {
        refType: createRefToElmWithValue(BuiltinTypes.SERVICE_ID),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^custitem[0-9a-z_]+' }),
        },
      } /* Original description: This attribute value can be up to 38 characters long.   The default value is ‘custitem’. */,
      fieldtype: {
        refType: createRefToElmWithValue(enums.generic_customfield_fieldtype),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see generic_customfield_fieldtype.   The default value is 'TEXT'. */,
      label: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 200 }),
        },
      } /* Original description: This field value can be up to 200 characters long.   This field accepts references to the string custom type. */,
      selectrecordtype: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field is mandatory when the fieldtype value is equal to any of the following lists or values: SELECT, MULTISELECT.   This field accepts references to the following custom types:   customrecordtype   customlist   For information about other possible values, see generic_customfield_selectrecordtype. */,
      applyformatting: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      defaultchecked: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      defaultselection: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the following custom types:   scriptdeployment   workflowactionscript   workflowstatecustomfield   workflowcustomfield   workflow   scriptdeployment   usereventscript   transactioncolumncustomfield   transactionbodycustomfield   transactionForm   scriptdeployment   suitelet   scriptdeployment   scheduledscript   savedsearch   role   scriptdeployment   restlet   scriptdeployment   portlet   othercustomfield   scriptdeployment   massupdatescript   scriptdeployment   mapreducescript   itemoptioncustomfield   itemnumbercustomfield   itemcustomfield   entryForm   entitycustomfield   statuses   customtransactiontype   instance   customrecordcustomfield   customrecordtype   customvalue   crmcustomfield   scriptdeployment   clientscript   scriptdeployment   bundleinstallationscript   advancedpdftemplate   addressForm */,
      defaultvalue: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      description: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      displaytype: {
        refType: createRefToElmWithValue(enums.generic_customfield_displaytype),
        annotations: {},
      } /* Original description: For information about possible values, see generic_customfield_displaytype.   The default value is 'NORMAL'. */,
      dynamicdefault: {
        refType: createRefToElmWithValue(enums.generic_customfield_dynamicdefault),
        annotations: {},
      } /* Original description: For information about possible values, see generic_customfield_dynamicdefault. */,
      help: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the string custom type. */,
      linktext: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      minvalue: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      maxvalue: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      storevalue: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      accesslevel: {
        refType: createRefToElmWithValue(enums.generic_accesslevel_searchlevel),
        annotations: {},
      } /* Original description: For information about possible values, see generic_accesslevel_searchlevel.   The default value is '2'. */,
      checkspelling: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      encryptatrest: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      displayheight: {
        refType: createRefToElmWithValue(BuiltinTypes.NUMBER),
        annotations: {},
      } /* Original description: This field value must be greater than or equal to 0. */,
      displaywidth: {
        refType: createRefToElmWithValue(BuiltinTypes.NUMBER),
        annotations: {},
      } /* Original description: This field value must be greater than or equal to 0. */,
      globalsearch: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      isformula: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      ismandatory: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      maxlength: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      onparentdelete: {
        refType: createRefToElmWithValue(enums.generic_customfield_onparentdelete),
        annotations: {},
      } /* Original description: For information about possible values, see generic_customfield_onparentdelete. */,
      searchcomparefield: {
        refType: createRefToElmWithValue(enums.generic_standard_field),
        annotations: {},
      } /* Original description: For information about possible values, see generic_standard_field. */,
      searchdefault: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the savedsearch custom type. */,
      searchlevel: {
        refType: createRefToElmWithValue(enums.generic_accesslevel_searchlevel),
        annotations: {},
      } /* Original description: For information about possible values, see generic_accesslevel_searchlevel.   The default value is '2'. */,
      showhierarchy: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      showinlist: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      sourcefilterby: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the itemcustomfield custom type.   For information about other possible values, see generic_standard_field. */,
      sourcefrom: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the itemcustomfield custom type.   For information about other possible values, see generic_standard_field. */,
      sourcelist: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the itemcustomfield custom type.   For information about other possible values, see generic_standard_field. */,
      isparent: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      parentsubtab: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the following custom types:   subtab   subtab   For information about other possible values, see generic_tab_parent. */,
      subtab: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field accepts references to the subtab custom type.   For information about other possible values, see generic_item_tab. */,
      appliestogroup: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestokit: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestoinventory: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F.   If this field appears in the project, you must reference the INVENTORY feature in the manifest file to avoid project warnings. In the manifest file, you can specify whether this feature is required in your account. INVENTORY must be enabled for this field to appear in your account. */,
      appliestoitemassembly: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F.   If this field appears in the project, you must reference the ASSEMBLIES feature in the manifest file to avoid project warnings. In the manifest file, you can specify whether this feature is required in your account. ASSEMBLIES must be enabled for this field to appear in your account. */,
      appliestononinventory: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestoothercharge: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestopricelist: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestoservice: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestospecificitems: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestosubplan: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      appliestoexpense: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F.   If this field appears in the project, you must reference the CHARGEBASEDBILLING feature in the manifest file to avoid project warnings. In the manifest file, you can specify whether this feature is required in your account. CHARGEBASEDBILLING must be enabled for this field to appear in your account. */,
      includechilditems: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      itemmatrix: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F.   If this field appears in the project, you must reference the MATRIXITEMS feature in the manifest file to avoid project warnings. In the manifest file, you can specify whether this feature is required in your account. MATRIXITEMS must be enabled for this field to appear in your account. */,
      ismhitemattribute: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F.   If this field appears in the project, you must reference the MERCHANDISEHIERARCHY feature in the manifest file to avoid project warnings. In the manifest file, you can specify whether this feature is required in your account. MERCHANDISEHIERARCHY must be enabled for this field to appear in your account. */,
      itemsubtype: {
        refType: createRefToElmWithValue(enums.itemcustomfield_itemsubtype),
        annotations: {},
      } /* Original description: For information about possible values, see itemcustomfield_itemsubtype. */,
      customfieldfilters: {
        refType: createRefToElmWithValue(itemcustomfield_customfieldfilters),
        annotations: {},
      },
      roleaccesses: {
        refType: createRefToElmWithValue(itemcustomfield_roleaccesses),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, itemcustomfieldElemID.name],
  })

  return { type: itemcustomfield, innerTypes }
}
