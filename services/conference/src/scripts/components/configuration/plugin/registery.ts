import {assert} from '@models/utils'
import React from 'react'
import {BaseConfigurationProps, PluginBase} from './PluginBase'

const plugins = new Map<string, React.FC<any>>()

export function registerPlugin<T extends BaseConfigurationProps>(plugin: PluginBase<T>) {
  assert(!plugins.has(plugin.type))
  plugins.set(plugin.type, plugin.ConfigurationRenderer)
}

export function resolvePlugin<T extends BaseConfigurationProps>(type: string): React.FC<T> {
  assert(plugins.has(type))

  return plugins.get(type) as React.FC<T>
}
