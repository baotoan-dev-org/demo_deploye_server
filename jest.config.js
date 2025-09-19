"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.spec.ts$',
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@app/(.*)$': '<rootDir>/src/app/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
    },
    collectCoverage: true,
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map