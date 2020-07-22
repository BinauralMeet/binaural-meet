// jest.config.js
const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": "babel-jest"
  },
  testRegex: "/__tests__/.*\\.(test|spec)\\.(ts|tsx|js)$",
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/libs"
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: `<rootDir>/${compilerOptions.baseUrl}`
  }),
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json"
    }
  },
  transformIgnorePatterns: [
    "libs/lib-jitsi-meet/node_modules/(?!(js-utils|@jitsi)/)"
  ]
}
