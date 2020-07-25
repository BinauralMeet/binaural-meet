import React from 'react'

export interface PluginBase<T extends BaseConfigurationProps> {
  type: string
  ConfigurationRenderer: React.FC<T>
}

export interface BaseConfigurationProps {
  closeDialog:() => void
}
