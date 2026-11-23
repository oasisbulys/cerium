/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension. */
// SPDX-License-Identifier: GPL-3.0-only
// Rigid display alignment only; the molecular solver and its original SVD stay untouched.
import LocalShape from '../model/LocalShape.js';
import RigidAlignment from './RigidAlignment.js';
import TextbookGeometry from './TextbookGeometry.js';

/** @author Cartesian-coordinate extension contributors */
class TextbookOrientation {
  constructor() {
    this.molecule = null;
    this.groupKey = '';
    this.permutation = null;
    this.permutations = [];
    this.updatesSinceSearch = 0;
    this.quaternion = new THREE.Quaternion(); // raw model -> textbook molecular frame
  }

  /** @public */
  update( molecule ) {
    const groups = molecule.radialGroups;
    const key = groups.map( group => group.id ).join( ',' );
    const topologyChanged = this.molecule !== molecule || this.groupKey !== key;
    if ( topologyChanged ) {
      this.molecule = molecule;
      this.groupKey = key;
      this.permutation = null;
      this.permutations = LocalShape.vseprPermutations( groups );
    }
    if ( !groups.length ) {
      this.quaternion.set( 0, 0, 0, 1 );
      return topologyChanged;
    }
    const center = molecule.centralAtom.positionProperty.value;
    const current = groups.map( group => new THREE.Vector3().copy( group.positionProperty.value ).sub( center ) );
    // Coincident or invalid domains cannot define a frame; retain the last finite pose until they separate.
    if ( current.some( v => !Number.isFinite( v.lengthSq() ) || v.lengthSq() < 1e-12 ) ) { return topologyChanged; }
    current.forEach( v => v.normalize() );
    const configuration = molecule.getCentralVSEPRConfiguration();
    const ideals = TextbookGeometry( configuration.allOrientations, configuration.x, configuration.e );
    if ( groups.length === 1 || ( groups.length === 2 && ideals[ 0 ].dot( ideals[ 1 ] ) < -0.999999 ) ) {
      // A line has no unique twist. Anchor its first domain and retain the previous twist instead of flipping it.
      this.quaternion.copy( RigidAlignment( current.slice( 0, 1 ), ideals.slice( 0, 1 ), [ 0 ], this.quaternion ).quaternion );
      return topologyChanged;
    }
    let mapping = this.permutation ? RigidAlignment( current, ideals, this.permutation.indices, this.quaternion ) : null;
    this.updatesSinceSearch++;
    if ( !mapping || ( mapping.error > 1e-6 && this.updatesSinceSearch >= 12 ) ) {
      const candidates = this.permutations.map( permutation => ( {
        ...RigidAlignment( current, ideals, permutation.indices, this.quaternion ), permutation: permutation
      } ) );
      const minimum = Math.min( ...candidates.map( candidate => candidate.error ) );
      if ( !mapping || minimum < mapping.error - Math.max( 1e-6, mapping.error * 0.01 ) ) {
        const equivalent = candidates.filter( candidate => candidate.error <= minimum + 1e-7 );
        equivalent.sort( ( a, b ) => Math.abs( this.quaternion.dot( b.quaternion ) ) - Math.abs( this.quaternion.dot( a.quaternion ) ) );
        mapping = equivalent[ 0 ];
        this.permutation = mapping.permutation;
      }
      this.updatesSinceSearch = 0;
    }
    this.quaternion.copy( mapping.quaternion );
    return topologyChanged;
  }
}

export default TextbookOrientation;
