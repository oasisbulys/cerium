/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only view math. */
// SPDX-License-Identifier: GPL-3.0-only
// Double-precision Horn quaternion fit for the display frame; never used by the molecular solver.
/** @author Cartesian-coordinate extension contributors */

const fitRigidAlignment = ( source, target, indices, previous ) => {
  const s = Array( 9 ).fill( 0 );
  source.forEach( ( a, i ) => {
    const b = target[ indices[ i ] ];
    const av = [ a.x, a.y, a.z ]; const bv = [ b.x, b.y, b.z ];
    for ( let row = 0; row < 3; row++ ) {
      for ( let column = 0; column < 3; column++ ) { s[ row * 3 + column ] += av[ row ] * bv[ column ]; }
    }
  } );
  const trace = s[ 0 ] + s[ 4 ] + s[ 8 ];
  const a = [
    [ trace, s[ 5 ] - s[ 7 ], s[ 6 ] - s[ 2 ], s[ 1 ] - s[ 3 ] ],
    [ s[ 5 ] - s[ 7 ], 2 * s[ 0 ] - trace, s[ 1 ] + s[ 3 ], s[ 2 ] + s[ 6 ] ],
    [ s[ 6 ] - s[ 2 ], s[ 1 ] + s[ 3 ], 2 * s[ 4 ] - trace, s[ 5 ] + s[ 7 ] ],
    [ s[ 1 ] - s[ 3 ], s[ 2 ] + s[ 6 ], s[ 5 ] + s[ 7 ], 2 * s[ 8 ] - trace ]
  ];
  const vectors = Array.from( { length: 4 }, ( _, i ) => Array.from( { length: 4 }, ( unused, j ) => i === j ? 1 : 0 ) );
  for ( let iteration = 0; iteration < 64; iteration++ ) {
    let p = 0; let q = 1;
    for ( let i = 0; i < 4; i++ ) {
      for ( let j = i + 1; j < 4; j++ ) { if ( Math.abs( a[ i ][ j ] ) > Math.abs( a[ p ][ q ] ) ) { p = i; q = j; } }
    }
    if ( Math.abs( a[ p ][ q ] ) < 1e-13 ) { break; }
    const tau = ( a[ q ][ q ] - a[ p ][ p ] ) / ( 2 * a[ p ][ q ] );
    const t = ( tau >= 0 ? 1 : -1 ) / ( Math.abs( tau ) + Math.sqrt( 1 + tau * tau ) );
    const c = 1 / Math.sqrt( 1 + t * t ); const sn = t * c;
    a[ p ][ p ] -= t * a[ p ][ q ];
    a[ q ][ q ] += t * a[ p ][ q ];
    a[ p ][ q ] = a[ q ][ p ] = 0;
    for ( let k = 0; k < 4; k++ ) {
      if ( k !== p && k !== q ) {
        const kp = a[ k ][ p ]; const kq = a[ k ][ q ];
        a[ k ][ p ] = a[ p ][ k ] = c * kp - sn * kq;
        a[ k ][ q ] = a[ q ][ k ] = sn * kp + c * kq;
      }
      const vp = vectors[ k ][ p ]; const vq = vectors[ k ][ q ];
      vectors[ k ][ p ] = c * vp - sn * vq;
      vectors[ k ][ q ] = sn * vp + c * vq;
    }
  }
  const maximum = Math.max( ...a.map( ( row, i ) => row[ i ] ) );
  const old = [ previous.w, previous.x, previous.y, previous.z ];
  let fitted = Array( 4 ).fill( 0 );
  let first = null;
  // A line does not determine twist: project onto the optimal eigenspace to retain the preceding frame.
  for ( let i = 0; i < 4; i++ ) {
    if ( maximum - a[ i ][ i ] < 1e-9 ) {
      const eigenvector = vectors.map( row => row[ i ] );
      first = first || eigenvector;
      const projection = eigenvector.reduce( ( sum, value, j ) => sum + value * old[ j ], 0 );
      fitted = fitted.map( ( value, j ) => value + eigenvector[ j ] * projection );
    }
  }
  if ( fitted.reduce( ( sum, value ) => sum + value * value, 0 ) < 1e-16 ) { fitted = first; }
  const quaternion = new THREE.Quaternion( fitted[ 1 ], fitted[ 2 ], fitted[ 3 ], fitted[ 0 ] ).normalize();
  const error = source.reduce( ( sum, direction, i ) => sum +
    direction.clone().applyQuaternion( quaternion ).distanceToSquared( target[ indices[ i ] ] ), 0 );
  return { quaternion: quaternion, error: error };
};

export default fitRigidAlignment;
