/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import {
  InstanceElement,
  getChangeData,
  isInstanceElement,
  ChangeGroupIdFunction,
  ElemID,
  ObjectType,
  BuiltinTypes,
  ReferenceExpression,
  StaticFile,
  Variable,
  VariableExpression,
  TemplateExpression,
  isDependencyError,
  isCircularDependencyChangeError,
} from '@salto-io/adapter-api'
import { mockFunction } from '@salto-io/test-utils'
import wu from 'wu'
import * as mock from '../../common/elements'
import { getFirstPlanItem, getChange } from '../../common/plan'
import { createElementSource } from '../../common/helpers'
import { getPlan, Plan, PlanItem } from '../../../src/core/plan'
import { planGenerators } from '../../common/plan_generator'

describe('getPlan', () => {
  const allElements = mock.getAllElements()

  const {
    planWithTypeChanges,
    planWithFieldChanges,
    planWithNewType,
    planWithFieldDependency,
    planWithFieldDependencyCycle,
    planWithDependencyCycle,
    planWithDependencyCycleWithinAGroup,
  } = planGenerators(allElements)

  it('should create empty plan', async () => {
    const plan = await getPlan({
      before: createElementSource(allElements),
      after: createElementSource(allElements),
    })
    expect(plan.size).toBe(0)
  })

  it('should create plan with add change', async () => {
    const [plan, newElement] = await planWithNewType()
    expect(plan.size).toBe(1)
    const planItem = getFirstPlanItem(plan)
    expect(planItem.groupKey).toBe(newElement.elemID.getFullName())
    // We should only get the new type change, new fields are contained in it
    expect(planItem.items.size).toBe(1)
    const change = getChange(planItem, newElement.elemID)
    expect(change.action).toBe('add')
    expect(getChangeData(change)).toEqual(newElement)
  })

  it('should create plan with remove change', async () => {
    const pre = allElements
    const preFiltered = pre.filter(element => element.elemID.name !== 'instance')
    const plan = await getPlan({
      before: createElementSource(pre),
      after: createElementSource(preFiltered),
    })
    expect(plan.size).toBe(1)
    const planItem = getFirstPlanItem(plan)
    const removed = _.find(pre, element => element.elemID.name === 'instance')
    expect(isInstanceElement(removed)).toBeTruthy()
    expect(planItem.groupKey).toBe((removed as InstanceElement).elemID.getFullName())
    const removedChange = getChange(planItem, (removed as InstanceElement).elemID)
    expect(removedChange.action).toBe('remove')
    if (removedChange.action === 'remove') {
      expect(removedChange.data.before).toEqual(removed)
    }
  })

  it('should create plan with modification changes due to field changes', async () => {
    const [plan, changedElem] = await planWithFieldChanges()
    expect(plan.size).toBe(1)
    const planItem = getFirstPlanItem(plan)
    expect(planItem.groupKey).toBe(changedElem.elemID.getFullName())
    expect(getChange(planItem, changedElem.elemID)).toBeUndefined()
    expect(getChange(planItem, changedElem.fields.new.elemID).action).toBe('add')
    expect(getChange(planItem, changedElem.fields.location.elemID).action).toBe('modify')
  })

  it('should create plan with modification changes due to value change', async () => {
    const post = mock.getAllElements()
    const employee = post[4]
    employee.value.name = 'SecondEmployee'
    const plan = await getPlan({
      before: createElementSource(allElements),
      after: createElementSource(post),
    })
    expect(plan.size).toBe(1)
    const planItem = getFirstPlanItem(plan)
    expect(planItem.groupKey).toBe(employee.elemID.getFullName())
    expect(getChange(planItem, employee.elemID).action).toBe('modify')
    expect(planItem.items.size).toBe(1)
  })

  it('should create plan with modification change in primary element (no inner changes)', async () => {
    const [plan, changedElem] = await planWithTypeChanges()

    expect(plan.size).toBe(1)
    const planItem = getFirstPlanItem(plan)
    expect(planItem.groupKey).toBe(changedElem.elemID.getFullName())
    expect(getChange(planItem, changedElem.elemID).action).toBe('modify')
    expect(planItem.items.size).toBe(1)
  })

  it('should create plan when field have a dependency cycle but its in a custom change group', async () => {
    const [plan, field] = await planWithFieldDependency(true)
    const planItems = [...plan.itemsByEvalOrder()]
    expect(planItems).toHaveLength(7)
    const fieldPlanItem = planItems.find(item =>
      wu(item.changes()).some(change => getChangeData(change).elemID.isEqual(field.elemID)),
    )
    expect(fieldPlanItem?.action).toEqual('modify')
    expect(fieldPlanItem?.items.size).toEqual(1)
    const parentPlanItems = planItems.filter(item => item.groupKey === field.parent.elemID.getFullName())
    expect(parentPlanItems).toHaveLength(1)
    expect(parentPlanItems[0].action).toEqual('add')
  })

  it('should create plan when field have a dependency cycle but its a modification of the type', async () => {
    const [plan, field] = await planWithFieldDependency(false)
    const planItems = [...plan.itemsByEvalOrder()]
    expect(planItems).toHaveLength(7)
    const splitElemChanges = planItems.filter(item => item.groupKey === field.parent.elemID.getFullName())
    expect(splitElemChanges).toHaveLength(2)
    expect(splitElemChanges[0].action).toEqual('modify')
    expect(splitElemChanges[1].action).toEqual('modify')
  })

  describe('getPlan with dependency cycle', () => {
    it('should omit fields from plan they create a dependency cycle on addition', async () => {
      const plan = await planWithFieldDependencyCycle(true)
      const planItems = [...plan.itemsByEvalOrder()]
      expect(planItems).toHaveLength(6)
      const [dependencyErrors, otherErrors] = _.partition(plan.changeErrors, isDependencyError)
      expect(otherErrors).toHaveLength(2)
      expect(dependencyErrors).toHaveLength(1)
    })

    it('should omit fields from plan they create a dependency cycle on', async () => {
      const plan = await planWithFieldDependencyCycle(false)
      const planItems = [...plan.itemsByEvalOrder()]
      expect(planItems).toHaveLength(6)
      const [dependencyErrors, otherErrors] = _.partition(plan.changeErrors, isDependencyError)
      expect(otherErrors).toHaveLength(2)
      expect(dependencyErrors).toHaveLength(0)
    })

    it('should create plan and omit and dependency cycle from it', async () => {
      // Without change validators
      const planWithNoValidators = await planWithDependencyCycle(false)
      const planWithNoValidatorsItems = [...planWithNoValidators.itemsByEvalOrder()]
      expect(planWithNoValidatorsItems).toHaveLength(4)
      const circularDependencyErrors = planWithNoValidators.changeErrors.filter(isCircularDependencyChangeError)
      expect(circularDependencyErrors).toHaveLength(2)
      expect(circularDependencyErrors.map(err => err.elemID.getFullName())).toEqual(['salto.employee', 'salto.office'])

      // With change validators
      const plainWithValidators = await planWithDependencyCycle(true)
      const planWithValidatorsItems = [...plainWithValidators.itemsByEvalOrder()]
      expect(planWithValidatorsItems).toHaveLength(4)
      const circularDependencyErrorsWithValidators = planWithNoValidators.changeErrors.filter(
        isCircularDependencyChangeError,
      )
      expect(circularDependencyErrorsWithValidators).toHaveLength(2)
      expect(circularDependencyErrorsWithValidators.map(err => err.elemID.getFullName())).toEqual([
        'salto.employee',
        'salto.office',
      ])
    })
  })

  it('should ignore cycles within a group', async () => {
    const plan = await planWithDependencyCycleWithinAGroup(false)
    const planItems = [...plan.itemsByEvalOrder()]
    expect(planItems).toHaveLength(6)
  })

  it('should ignore cycles within a group with change validators', async () => {
    const plan = await planWithDependencyCycleWithinAGroup(true)
    const planItems = [...plan.itemsByEvalOrder()]
    expect(planItems).toHaveLength(6)
  })

  describe('with custom group key function', () => {
    let plan: Plan
    let changeGroup: PlanItem
    const dummyGroupKeyFunc = mockFunction<ChangeGroupIdFunction>().mockResolvedValue({ changeGroupIdMap: new Map() })
    beforeAll(async () => {
      const before = mock.getAllElements()
      const after = mock.getAllElements()
      // Make two random changes
      after[1].annotations.test = true
      after[2].annotations.test = true
      plan = await getPlan({
        before: createElementSource(before),
        after: createElementSource(after),
        customGroupIdFunctions: {
          salto: async changes => ({
            changeGroupIdMap: new Map([...changes.entries()].map(([changeId]) => [changeId, 'all'])),
          }),
          dummy: dummyGroupKeyFunc,
        },
      })
      changeGroup = plan.itemsByEvalOrder()[Symbol.iterator]().next().value
    })

    it('should return only one change group', () => {
      expect(plan.size).toEqual(1)
    })
    it('should return change group with both changes', () => {
      expect(changeGroup).toBeDefined()
      expect([...changeGroup.changes()]).toHaveLength(2)
    })
    it('should not call adapter functions that have no changes', () => {
      expect(dummyGroupKeyFunc).not.toHaveBeenCalled()
    })
  })

  it('when instances have inner references and there is no change should create empty plan when compareByValue is on', async () => {
    const innerType = new ObjectType({
      elemID: new ElemID('adapter', 'inner'),
      fields: {
        inner: { refType: BuiltinTypes.STRING },
      },
    })

    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
      fields: {
        ref: { refType: innerType },
        inner: { refType: innerType },
        value: { refType: BuiltinTypes.STRING },
      },
    })

    const firstInstance1 = new InstanceElement('instance1', type, {
      value: 'some value',
      inner: { inner: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance1', 'value')) },
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance1', 'inner')),
    })

    const secondInstance1 = new InstanceElement('instance1', type, {
      value: 'some value',
      inner: { inner: 'some value' },
      ref: { inner: 'some value' },
    })

    const firstInstance2 = new InstanceElement('instance2', type, {
      value: 'some value',
      inner: { inner: 'some value' },
      ref: { inner: 'some value' },
    })

    const secondInstance2 = new InstanceElement('instance2', type, {
      value: 'some value',
      inner: { inner: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance2', 'value')) },
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance2', 'inner')),
    })

    const firstInstance3 = new InstanceElement('instance3', type, {
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance3', 'inner'), {
        inner: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance3', 'value'), 'some value'),
      }),
    })

    const secondInstance3 = new InstanceElement('instance3', type, {
      ref: { inner: 'some value' },
    })

    const firstInstance4 = new InstanceElement('instance4', type, {
      ref: { inner: 'some value' },
    })

    const secondInstance4 = new InstanceElement('instance4', type, {
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance4', 'inner'), {
        inner: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance4', 'value'), 'some value'),
      }),
    })

    const plan = await getPlan({
      before: createElementSource([firstInstance1, firstInstance2, firstInstance3, firstInstance4, type, innerType]),
      after: createElementSource([secondInstance1, secondInstance2, secondInstance3, secondInstance4, type, innerType]),
      compareOptions: { compareByValue: true },
    })
    expect(plan.size).toBe(0)
  })

  it('when instances use variables and there is no change should create empty plan when compareByValue is on', async () => {
    const variableObject = new Variable(new ElemID('var', 'a'), 5)

    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
      fields: {
        value: { refType: BuiltinTypes.NUMBER },
      },
    })

    const instance = new InstanceElement('instance', type, {
      value: new VariableExpression(variableObject.elemID),
    })

    const stateInstance = new InstanceElement('instance', type, {
      value: 5,
    })

    const plan = await getPlan({
      before: createElementSource([stateInstance, type]),
      after: createElementSource([instance, type, variableObject]),
      compareOptions: { compareByValue: true },
    })
    expect(plan.size).toBe(0)
  })

  it('when there is a circular reference in an instance it should behave as undefined', async () => {
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
      fields: {
        value: { refType: BuiltinTypes.STRING },
      },
    })
    const inst1 = new InstanceElement('instance1', type, {
      value: new ReferenceExpression(type.elemID.createNestedID('instance', 'instance1', 'value')),
    })
    const inst2 = new InstanceElement('instance1', type, { value: 'value' })

    const plan = await getPlan({
      before: createElementSource([type, inst1]),
      after: createElementSource([type, inst2]),
    })
    expect(plan.size).toEqual(1)
  })

  it('when reference in instance changes but the value is the same should have a change in plan', async () => {
    // This behavior works for fetch but it is not really the correct behavior for deploy:
    // If there is no difference in the value to be deployed, it should not be a change in the plan
    // (because nothing is actually going to change).
    // We may want to change that in the future.
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
      fields: {
        a: { refType: BuiltinTypes.NUMBER },
        b: { refType: BuiltinTypes.NUMBER },
        ref: { refType: BuiltinTypes.NUMBER },
      },
    })

    const instance = new InstanceElement('instance', type, {
      a: 5,
      b: 5,
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance', 'a')),
    })

    const changedInstance = new InstanceElement('instance', type, {
      a: 5,
      b: 5,
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance', 'b')),
    })

    const plan = await getPlan({
      before: createElementSource([instance, type]),
      after: createElementSource([changedInstance, type]),
    })
    expect(plan.size).toBe(1)
  })

  describe('compareReferencesByValue', () => {
    let type: ObjectType
    let instanceBefore: InstanceElement
    let instanceAfter: InstanceElement
    let referencedBefore: InstanceElement
    let referencedAfter: InstanceElement

    beforeEach(() => {
      type = new ObjectType({
        elemID: new ElemID('adapter', 'type'),
        fields: {
          a: { refType: BuiltinTypes.NUMBER },
          b: { refType: BuiltinTypes.NUMBER },
          ref: { refType: BuiltinTypes.NUMBER },
        },
      })

      referencedBefore = new InstanceElement('instance2', type, {
        a: 1,
      })

      instanceBefore = new InstanceElement('instance', type, {
        a: 5,
        b: 5,
        ref: new ReferenceExpression(referencedBefore.elemID.createNestedID('a')),
      })

      referencedAfter = new InstanceElement('instance2', type, {
        a: 2,
      })

      instanceAfter = new InstanceElement('instance', type, {
        a: 5,
        b: 5,
        ref: new ReferenceExpression(referencedAfter.elemID.createNestedID('a')),
      })
    })

    it('when true should add a change to plan when a value of a reference to inner property is changed', async () => {
      const plan = await getPlan({
        before: createElementSource([instanceBefore, referencedBefore, type]),
        after: createElementSource([instanceAfter, referencedAfter, type]),
        compareOptions: { compareByValue: true },
      })
      expect(plan.size).toBe(2)

      const changes = wu(plan.itemsByEvalOrder())
        .map(item => item.detailedChanges())
        .flatten()
        .toArray()
      expect(changes.length).toBe(2)
    })

    it('by default should not add a change to plan when a value of a reference to inner property is changed', async () => {
      const plan = await getPlan({
        before: createElementSource([instanceBefore, referencedBefore, type]),
        after: createElementSource([instanceAfter, referencedAfter, type]),
      })
      expect(plan.size).toBe(1)

      const changes = wu(plan.itemsByEvalOrder())
        .map(item => item.detailedChanges())
        .flatten()
        .toArray()
      expect(changes.length).toBe(1)
    })

    it('when true should not add a change to plan when a value of a reference to inner property is changed from its resolved value', async () => {
      instanceBefore.value.ref = 2
      const plan = await getPlan({
        before: createElementSource([instanceBefore, referencedBefore, type]),
        after: createElementSource([instanceAfter, referencedAfter, type]),
        compareOptions: { compareByValue: true },
      })
      expect(plan.size).toBe(1)

      const changes = wu(plan.itemsByEvalOrder())
        .map(item => item.detailedChanges())
        .flatten()
        .toArray()
      expect(changes.length).toBe(1)
    })

    it('by default should add a change to plan when a value of a reference to inner property is changed from its resolved value', async () => {
      instanceBefore.value.ref = 2
      const plan = await getPlan({
        before: createElementSource([instanceBefore, referencedBefore, type]),
        after: createElementSource([instanceAfter, referencedAfter, type]),
      })
      expect(plan.size).toBe(2)

      const changes = wu(plan.itemsByEvalOrder())
        .map(item => item.detailedChanges())
        .flatten()
        .toArray()
      expect(changes.length).toBe(2)
    })

    it('when true should add a change to plan when a value of a reference to inner property in template expression is changed', async () => {
      instanceBefore.value.ref = new TemplateExpression({
        parts: ['a', new ReferenceExpression(referencedBefore.elemID.createNestedID('a')), 'b'],
      })

      instanceAfter.value.ref = new TemplateExpression({
        parts: ['a', new ReferenceExpression(referencedAfter.elemID.createNestedID('a')), 'b'],
      })

      const plan = await getPlan({
        before: createElementSource([instanceBefore, referencedBefore, type]),
        after: createElementSource([instanceAfter, referencedAfter, type]),
        compareOptions: { compareByValue: true },
      })
      expect(plan.size).toBe(2)

      const changes = wu(plan.itemsByEvalOrder())
        .map(item => item.detailedChanges())
        .flatten()
        .toArray()
      expect(changes.length).toBe(2)
    })

    it('when true should not add a change to plan when a value of a reference to inner property in template expression is not changed', async () => {
      referencedAfter.value.a = 1

      instanceBefore.value.ref = new TemplateExpression({
        parts: ['a', new ReferenceExpression(referencedBefore.elemID.createNestedID('a')), 'b'],
      })

      instanceAfter.value.ref = new TemplateExpression({
        parts: ['a', new ReferenceExpression(referencedAfter.elemID.createNestedID('a')), 'b'],
      })

      const plan = await getPlan({
        before: createElementSource([instanceBefore, referencedBefore, type]),
        after: createElementSource([instanceAfter, referencedAfter, type]),
        compareOptions: { compareByValue: true },
      })
      expect(plan.size).toBe(0)

      const changes = wu(plan.itemsByEvalOrder())
        .map(item => item.detailedChanges())
        .flatten()
        .toArray()
      expect(changes.length).toBe(0)
    })
  })

  it('when reference in instance points to a whole element should have a change in plan', async () => {
    // Ideally we would want to know if the adapter is going to resolve this element into its ID
    // so we could tell if this is a real difference, but since we can't do that with the current
    // design, we take the safer option and say this is always a change
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
      fields: {
        id: { refType: BuiltinTypes.STRING },
        ref: { refType: BuiltinTypes.NUMBER },
      },
    })

    const instance = new InstanceElement('instance', type, {
      id: 'id1',
      ref: new ReferenceExpression(new ElemID('adapter', 'type', 'instance', 'instance')),
    })

    const changedInstance = new InstanceElement('instance', type, {
      id: 'id1',
      ref: 'id1',
    })

    const plan = await getPlan({
      before: createElementSource([instance, type]),
      after: createElementSource([changedInstance, type]),
    })
    expect(plan.size).toBe(1)
  })

  it('should return change in plan when comparing different StaticFiles', async () => {
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
    })

    const instance = new InstanceElement('instance', type, {
      file: new StaticFile({ filepath: 'some/path.ext', content: Buffer.from('ZOMG') }),
    })

    const changedInstance = new InstanceElement('instance', type, {
      file: new StaticFile({ filepath: 'some/path.ext', content: Buffer.from('ZOMGI') }),
    })

    const plan = await getPlan({
      before: createElementSource([instance, type]),
      after: createElementSource([changedInstance, type]),
    })
    expect(plan.size).toBe(1)
  })

  it('should return empty plan when StaticFiles have the same content and different path and compareByValue is true', async () => {
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
    })

    const before = new InstanceElement('instance', type, {
      file: new StaticFile({ filepath: 'some/path.ext', content: Buffer.from('ZOMG') }),
    })

    const after = before.clone()
    after.value.file.filepath = 'another/path.ext'

    const plan = await getPlan({
      before: createElementSource([before, type]),
      after: createElementSource([after, type]),
      compareOptions: { compareByValue: true },
    })
    expect(plan.size).toBe(0)
  })

  it('should work for new type with a built-in function name', async () => {
    const type = new ObjectType({
      elemID: new ElemID('adapter', 'type'),
      fields: {
        toString: { refType: BuiltinTypes.STRING },
      },
    })

    const plan = await getPlan({
      before: createElementSource([]),
      after: createElementSource([type]),
    })
    expect(plan.size).toBe(1)
  })
})
