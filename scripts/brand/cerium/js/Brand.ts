/* eslint-disable phet/copyright */
// Copyright 2026, Cerium Project
/**
 * Independent Cerium identity for the adapted Molecule Shapes distribution.
 * @author Cerium Project
 */
import StringProperty from '../../../axon/js/StringProperty.js';
import brand from '../../js/brand.js';
import TBrand from '../../js/TBrand.js';
import logo_png from '../images/logo_png.js';
import logoOnWhite_png from '../images/logoOnWhite_png.js';

const Brand: TBrand = {
  id: 'cerium',
  name: 'Cerium',
  copyright: null,
  license: 'Cerium is an independent adaptation of Molecule Shapes by PhET Interactive Simulations, University of Colorado Boulder.<br>' +
           'The simulation and integration code are licensed under <a href="https://www.gnu.org/licenses/gpl-3.0.html">GNU GPL version 3</a>. No warranty.<br>' +
           'Original simulation authors and copyright notices remain in the source. Cerium is not an official PhET release.<br>' +
           'The laboratory is <a href="https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f">Lab by Raid</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Scene, lighting and materials adapted.',
  licenseWithoutLinks: 'Cerium is an independent adaptation of Molecule Shapes by PhET Interactive Simulations, University of Colorado Boulder. ' +
                       'The simulation and integration code are licensed under GNU GPL version 3. No warranty. ' +
                       'Original simulation authors and copyright notices remain in the source. Cerium is not an official PhET release. ' +
                       'The laboratory is Lab by Raid, CC BY 4.0. Scene, lighting and materials adapted.',
  getLinks: () => [ {
    textStringProperty: new StringProperty( 'Original Molecule Shapes simulation' ),
    url: 'https://phet.colorado.edu/en/simulation/molecule-shapes'
  }, {
    textStringProperty: new StringProperty( 'Lab model by Raid' ),
    url: 'https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f'
  } ],
  logoOnBlackBackground: logo_png,
  logoOnWhiteBackground: logoOnWhite_png
};

brand.register( 'Brand', Brand );
export default Brand;
