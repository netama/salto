/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { buildEventName, getCliTelemetry } from '../src/telemetry'
import { CliTelemetry } from '../src/types'
import { getMockTelemetry, MockTelemetry } from './mocks'

describe('telemetry event names', () => {
  let mockTelemetry: MockTelemetry
  let cliTelemetry: CliTelemetry

  beforeEach(() => {
    mockTelemetry = getMockTelemetry()
  })

  it('should send success events without tags', () => {
    const command = 'import'
    cliTelemetry = getCliTelemetry(mockTelemetry, command)
    cliTelemetry.success()

    expect(mockTelemetry.sendCountEvent).toHaveBeenCalledTimes(1)
    expect(mockTelemetry.sendCountEvent).toHaveBeenCalledWith(
      buildEventName(command, 'success'),
      1,
      expect.objectContaining({}),
    )
  })

  it('should send success events with tags', () => {
    const command = 'import'
    const tags = { someTag: 'someValue' }
    cliTelemetry = getCliTelemetry(mockTelemetry, command)
    cliTelemetry.setTags(tags)
    cliTelemetry.success()

    expect(mockTelemetry.sendCountEvent).toHaveBeenCalledTimes(1)
    expect(mockTelemetry.sendCountEvent).toHaveBeenCalledWith(
      buildEventName(command, 'success'),
      1,
      expect.objectContaining(tags),
    )
  })

  it('should send mergeErrors events with some value > 1', () => {
    const command = 'import'
    const value = 42
    cliTelemetry = getCliTelemetry(mockTelemetry, command)
    cliTelemetry.mergeErrors(42)

    expect(mockTelemetry.sendCountEvent).toHaveBeenCalledTimes(1)
    expect(mockTelemetry.sendCountEvent).toHaveBeenCalledWith(
      buildEventName(command, 'mergeErrors'),
      value,
      expect.objectContaining({}),
    )
  })

  it('should build event name for a some command', () => {
    expect(buildEventName('some', 'start')).toEqual('workspace.some.start')
  })
})
