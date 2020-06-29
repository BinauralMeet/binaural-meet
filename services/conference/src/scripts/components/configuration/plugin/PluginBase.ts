import React from 'react'

export interface PluginBase<T> {
  type: string
  ConfigurationRenderer: React.FC<T>
}
