// Copyright 2024, University of Colorado Boulder
// Modified 2026-11-22: configure the extension's Node/browser test harness.

/**
 * ESLint configuration for molecule-shapes.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import simEslintConfig from '../perennial-alias/js/eslint/config/sim.eslint.config.mjs';

export default [
  { ignores: [ 'js/common/data/LabSceneData.js' ] },
  ...simEslintConfig,
  {
    files: [ 'tests/*.cjs' ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        testScreen: 'readonly',
        testModel: 'readonly',
        testView: 'readonly',
        molecularSnapshot: 'readonly',
        originalMolecule: 'readonly'
      }
    }
  },
  {
    languageOptions: {
      globals: {
        THREE: 'readonly'
      }
    },
    rules: {
      'phet/no-view-imported-from-model': 'off'
    }
  }
];
