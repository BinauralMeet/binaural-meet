import {assert} from '@models/utils'
import React from 'react'
import {PluginBase} from './PluginBase'

const plugins = new Map<string, React.FC<any>>()

export function registerPlugin<T>(plugin: PluginBase<T>) {
  assert(!plugins.has(plugin.type))
  plugins.set(plugin.type, plugin.ConfigurationRenderer)
}

export function resolvePlugin<T>(type: string): React.FC<T> {
  assert(plugins.has(type))

  return plugins.get(type) as React.FC<T>
}
