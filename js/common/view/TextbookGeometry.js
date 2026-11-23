/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension. */
// SPDX-License-Identifier: GPL-3.0-only
// Added 2026-11-22: textbook drawing conventions, without changing any inter-domain angles.
/** @author Cartesian-coordinate extension contributors */

/** Rotate the upstream ideal directions into conventional textbook drawing orientations. */
const textbookGeometry = ( originalDirections, atomCount, lonePairCount ) => {
  let directions = originalDirections.map( direction => new THREE.Vector3().copy( direction ) );

  const rotateToAxis = ( direction, axis ) => {
    const rotation = new THREE.Quaternion().setFromUnitVectors( direction.clone().normalize(), axis );
    directions.forEach( v => v.applyQuaternion( rotation ) );
  };
  const rotateAroundZ = angle => {
    const rotation = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), angle );
    directions.forEach( v => v.applyQuaternion( rotation ) );
  };

  if ( directions.length === 5 ) {
    // Upstream axial X -> textbook axial Z; upstream equatorial YZ -> textbook XY.
    directions = directions.map( v => new THREE.Vector3( v.y, v.z, v.x ) );
  }

  if ( directions.length === 3 && atomCount === 3 ) {
    // AX3 trigonal planar: place all bonds in XY and one bond at the top of the page.
    const normal = directions[ 0 ].clone().cross( directions[ 1 ] ).normalize();
    const flatten = new THREE.Quaternion().setFromUnitVectors( normal, new THREE.Vector3( 0, 0, 1 ) );
    directions.forEach( v => v.applyQuaternion( flatten ) );
    rotateAroundZ( Math.PI / 2 - Math.atan2( directions[ 0 ].y, directions[ 0 ].x ) );
  }
  else if ( directions.length === 4 && atomCount === 4 ) {
    // AX4 tetrahedral: choose two page-plane bonds; the other two are equally toward and away from the viewer.
    const pageNormal = directions[ 0 ].clone().cross( directions[ 1 ] ).normalize();
    const flatten = new THREE.Quaternion().setFromUnitVectors( pageNormal, new THREE.Vector3( 0, 0, 1 ) );
    directions.forEach( v => v.applyQuaternion( flatten ) );
    const pageBisector = directions[ 0 ].clone().add( directions[ 1 ] );
    rotateAroundZ( Math.PI / 2 - Math.atan2( pageBisector.y, pageBisector.x ) );
  }
  else if ( directions.length === 4 && atomCount === 3 && lonePairCount === 1 ) {
    // AX3E trigonal pyramidal: lone pair above, with the three bonded atoms in the lower tetrahedral base.
    rotateToAxis( directions[ 0 ], new THREE.Vector3( 0, 0, 1 ) );
  }
  else if ( atomCount === 1 ) {
    // A single visible bond is easiest to read against a principal axis.
    rotateToAxis( directions[ lonePairCount ], new THREE.Vector3( 0, 0, 1 ) );
  }
  else if ( atomCount === 2 && lonePairCount === 0 ) {
    // AX2 linear: horizontal textbook bond axis.
    rotateToAxis( directions[ 0 ], new THREE.Vector3( 1, 0, 0 ) );
  }
  else if ( atomCount === 2 && lonePairCount > 0 && directions.length <= 4 ) {
    const a = directions[ lonePairCount ];
    const b = directions[ lonePairCount + 1 ];
    const bisector = a.clone().add( b );
    if ( bisector.lengthSq() > 1e-10 ) {
      // Bent molecules lie in XY, symmetric about +Y. Their lone pairs retain their 3D geometry.
      const y = bisector.normalize();
      const x = a.clone().sub( b ).normalize();
      const z = x.clone().cross( y ).normalize();
      directions = directions.map( v => new THREE.Vector3( v.dot( x ), v.dot( y ), v.dot( z ) ) );
    }
  }
  else if ( ( directions.length === 5 && lonePairCount === 2 ) || ( directions.length === 6 && lonePairCount === 3 ) ) {
    // T-shaped molecules: align the opposite bonds to +/-Z and the remaining bond to +X.
    const atomDirections = directions.slice( lonePairCount );
    let linearPair = null;
    for ( let i = 0; i < atomDirections.length && !linearPair; i++ ) {
      for ( let j = i + 1; j < atomDirections.length; j++ ) {
        if ( atomDirections[ i ].dot( atomDirections[ j ] ) < -0.999999 ) {
          linearPair = [ atomDirections[ i ], atomDirections[ j ] ];
          break;
        }
      }
    }
    if ( linearPair ) {
      rotateToAxis( linearPair[ 0 ], new THREE.Vector3( 0, 0, 1 ) );
      const remaining = directions.slice( lonePairCount ).find( direction => Math.abs( direction.z ) < 1e-6 );
      if ( remaining ) { rotateAroundZ( -Math.atan2( remaining.y, remaining.x ) ); }
    }
  }
  else if ( directions.length === 6 && lonePairCount === 2 ) {
    // AX4E2 square planar: lone pairs are opposite on Z; all four bonds lie in the XY plane.
    rotateToAxis( directions[ 0 ], new THREE.Vector3( 0, 0, 1 ) );
  }
  else if ( directions.length === 6 && lonePairCount === 4 && atomCount === 2 ) {
    // AX2E4 linear: show the two bonded atoms along the vertical molecular axis.
    rotateToAxis( directions[ lonePairCount ], new THREE.Vector3( 0, 0, 1 ) );
  }
  else if ( directions.length === 6 && lonePairCount === 1 ) {
    // AX5E square pyramidal: lone pair below, square base in XY, and the fifth bond above.
    rotateToAxis( directions[ 0 ], new THREE.Vector3( 0, 0, -1 ) );
  }
  return directions;
};

export default textbookGeometry;
