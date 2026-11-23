/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only educational reference. */
// SPDX-License-Identifier: GPL-3.0-only
/** @author Cartesian-coordinate extension contributors */

/** A right-handed reference page and a readable home camera, without changing the molecular frame. */
const textbookReference = ( directions, x, e ) => {
  // Planar and tetrahedral drawings use XY. Axial geometries use XZ so Z is vertical on the page.
  const page = ( x === 1 || ( x === 0 && e === 4 ) || ( x === 3 && e === 1 ) || x + e >= 5 ) && !( x === 4 && e === 2 ) ? 'XZ' : 'XY';
  const depthAxis = page === 'XY' ? 'z' : 'y';
  const depthSign = page === 'XY' ? 1 : -1;
  const hasDepth = directions.some( direction => Math.abs( direction[ depthAxis ] ) > 1e-6 );
  const from = page === 'XY' ? '+Z' : '−Y';
  const up = page === 'XY' ? '+Y' : '+Z';
  const home = new THREE.Quaternion();
  if ( page === 'XZ' ) { home.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), Math.PI / 2 ); }
  if ( hasDepth ) {
    // Separate atoms in front of / behind the page instead of hiding them on one line of sight.
    const pitch = directions.length === 5 ? -0.4 : directions.length === 6 ? -0.6 : -0.28;
    const yaw = directions.length === 5 ? -0.1 : directions.length === 6 ? -0.55 : -0.46;
    // YXZ preserves page-up. XYZ would roll the axial bonds diagonally when pitch and yaw are combined.
    home.multiply( new THREE.Quaternion().setFromEuler( new THREE.Euler( pitch, yaw, 0, 'YXZ' ) ) );
  }
  return { page: page, depthAxis: depthAxis, depthSign: depthSign, from: from, up: up, hasDepth: hasDepth, home: home };
};

export default textbookReference;
