import { describe, expect, test } from 'bun:test'
import { resolveInstancerConfigs } from '../../../../apps/api/src/providers/instancer/resolve'

const provider = (name: string) => ({ name, options: {} })

describe('resolveInstancerConfigs', () => {
  test('returns empty when no instancers are configured', () => {
    expect(resolveInstancerConfigs({})).toEqual({ configs: {} })
    expect(resolveInstancerConfigs({ instancers: {} })).toEqual({ configs: {} })
  })

  test('uses the single instancer as default when unspecified', () => {
    const configs = { k8s: provider('instancers/k8s') }
    expect(resolveInstancerConfigs({ instancers: configs })).toEqual({
      configs,
      defaultName: 'k8s',
    })
  })

  test('honors an explicit defaultInstancer', () => {
    const configs = {
      k8s: provider('instancers/k8s'),
      docker: provider('instancers/docker'),
    }
    expect(
      resolveInstancerConfigs({
        instancers: configs,
        defaultInstancer: 'docker',
      })
    ).toEqual({ configs, defaultName: 'docker' })
  })

  test('throws when multiple instancers lack a default', () => {
    expect(() =>
      resolveInstancerConfigs({
        instancers: {
          k8s: provider('instancers/k8s'),
          docker: provider('instancers/docker'),
        },
      })
    ).toThrow(/defaultInstancer is not set/)
  })

  test('throws when defaultInstancer names an undefined instancer', () => {
    expect(() =>
      resolveInstancerConfigs({
        instancers: { k8s: provider('instancers/k8s') },
        defaultInstancer: 'nope',
      })
    ).toThrow(/not defined in instancers/)
  })
})
