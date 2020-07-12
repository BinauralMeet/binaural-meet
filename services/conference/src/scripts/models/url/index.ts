import {decodeGetParams} from './parameters'

export const urlParameters = decodeGetParams(window.location.href)
