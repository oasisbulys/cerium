/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension tests. */
/** @author Cartesian-coordinate extension contributors */
// SPDX-License-Identifier: GPL-3.0-only
// Cartesian-coordinate extension tests, added 2026-11-22.
import { strict as nodeAssert } from 'node:assert';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const require = createRequire( import.meta.url );
globalThis.self = globalThis;
globalThis.THREE = require( '../../sherpa/lib/three-r71.js' );
// Import the unchanged browser module without changing the repository's CommonJS package configuration.
const code = readFileSync( new URL( '../js/common/view/CartesianFrame.js', import.meta.url ), 'utf8' );
const { default: CartesianFrame } = await import( `data:text/javascript;base64,${Buffer.from( code ).toString( 'base64' )}` );
const near = ( a, b, tolerance = 1e-10 ) => nodeAssert.ok( a.distanceTo( b ) < tolerance, `${a.toArray()} != ${b.toArray()}` );
const identity = new THREE.Quaternion();
const rigidCode = readFileSync( new URL( '../js/common/view/RigidAlignment.js', import.meta.url ), 'utf8' );
const { default: fitRigidAlignment } = await import( `data:text/javascript;base64,${Buffer.from( rigidCode ).toString( 'base64' )}` );

test( 'view-only rigid fitting recovers known rotations and preserves every angle', () => {
  const target = [ new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( 0, 1, 0 ), new THREE.Vector3( 0, 0, 1 ) ];
  for ( const rotation of [ new THREE.Euler( 0, 0, Math.PI / 2 ), new THREE.Euler( 0.7, -1.2, 0.9 ), new THREE.Euler( Math.PI, 0, 0 ) ] ) {
    const q = new THREE.Quaternion().setFromEuler( rotation );
    const source = target.map( direction => direction.clone().applyQuaternion( q ) );
    const fitted = fitRigidAlignment( source, target, [ 0, 1, 2 ], identity );
    nodeAssert.ok( fitted.error < 1e-20 );
    source.forEach( ( direction, i ) => near( direction.clone().applyQuaternion( fitted.quaternion ), target[ i ] ) );
    nodeAssert.ok( Math.abs( fitted.quaternion.length() - 1 ) < 1e-12 );
  }
} );

test( 'view fitting remains stable at equal singular values and retains twist for a linear molecule', () => {
  const axes = [ new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( -1, 0, 0 ), new THREE.Vector3( 0, 1, 0 ),
    new THREE.Vector3( 0, -1, 0 ), new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, 0, -1 ) ];
  const offset = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.6, -0.8, 0.4 ) );
  let previous = offset.clone().inverse();
  for ( let i = 0; i < 100; i++ ) {
    const source = axes.map( ( v, j ) => v.clone().applyQuaternion( offset ).add( new THREE.Vector3( 1e-10 * Math.sin( i + j ), 0, 0 ) ).normalize() );
    const fitted = fitRigidAlignment( source, axes, [ 0, 1, 2, 3, 4, 5 ], previous );
    nodeAssert.ok( Math.abs( fitted.quaternion.dot( previous ) ) > 1 - 1e-12 );
    previous = fitted.quaternion;
  }
  const twist = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), 1.2 );
  const line = fitRigidAlignment( axes.slice( 0, 2 ), axes.slice( 0, 2 ), [ 0, 1 ], twist );
  nodeAssert.ok( Math.abs( line.quaternion.dot( twist ) ) > 1 - 1e-12 );
} );

test( 'a known 90-degree rotation uses the correct central-atom-relative frame', () => {
  const frame = new CartesianFrame();
  frame.lockAxesToMolecule = false;
  const central = new THREE.Vector3( 5, -4, 2 );
  const atom = new THREE.Vector3( 6, -4, 2 );
  const q = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2 );
  near( frame.getCoordinates( atom, central, q ), new THREE.Vector3( 0, 1, 0 ) );
  near( new THREE.Vector3( 1, 0, 0 ).applyQuaternion( frame.getAxesQuaternion( q ) ), new THREE.Vector3( 1, 0, 0 ) );
  frame.rotationMode = 'orbit';
  near( frame.getCoordinates( atom, central, q ), new THREE.Vector3( 1, 0, 0 ) );
  near( new THREE.Vector3( 1, 0, 0 ).applyQuaternion( frame.getAxesQuaternion( q ) ), new THREE.Vector3( 0, 1, 0 ) );
  near( atom, new THREE.Vector3( 6, -4, 2 ) );
} );

test( 'camera orbit changes the camera pose, preserving molecular coordinates and the projected pivot', () => {
  const frame = new CartesianFrame();
  frame.rotationMode = 'orbit';
  const camera = new THREE.PerspectiveCamera( 50, 1.4, 1, 100 );
  const base = new THREE.Vector3( 6, -1.25, 40 );
  frame.applyCamera( camera, base, new THREE.Vector3() );
  const projectedPivot = new THREE.Vector3().project( camera );
  const delta = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.6, -0.9, 0 ) );
  nodeAssert.equal( frame.rotate( delta, identity ), identity );
  frame.applyCamera( camera, base, new THREE.Vector3() );
  near( new THREE.Vector3().project( camera ), projectedPivot, 1e-6 );
  nodeAssert.ok( camera.position.distanceTo( base ) > 1 );
  near( frame.getCoordinates( new THREE.Vector3( 3, 2, -1 ), new THREE.Vector3(), identity ), new THREE.Vector3( 3, 2, -1 ) );
} );

test( 'locking axes attaches the frame to molecule-only rotation and preserves local coordinates', () => {
  const frame = new CartesianFrame();
  frame.lockAxesToMolecule = true;
  const central = new THREE.Vector3( 2, -3, 5 );
  const atom = central.clone().add( new THREE.Vector3( 4, 0, 0 ) );
  const delta = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2 );
  const q = frame.rotate( delta, identity );
  nodeAssert.equal( frame.rotationMode, 'molecule' );
  near( frame.getCoordinates( atom, central, q ), new THREE.Vector3( 4, 0, 0 ) );
  near( new THREE.Vector3( 1, 0, 0 ).applyQuaternion( frame.getAxesQuaternion( q ) ), new THREE.Vector3( 0, 1, 0 ) );
  nodeAssert.deepEqual( frame.orbitQuaternion.toArray(), [ 0, 0, 0, 1 ] );
  frame.resetOrientation();
  nodeAssert.equal( frame.lockAxesToMolecule, true );
  frame.lockAxesToMolecule = false;
  near( frame.getCoordinates( atom, central, q ), new THREE.Vector3( 0, 4, 0 ) );
  near( new THREE.Vector3( 1, 0, 0 ).applyQuaternion( frame.getAxesQuaternion( q ) ), new THREE.Vector3( 1, 0, 0 ) );
} );

test( 'molecule rotation after an orbit follows camera-local gesture axes and preserves bond angles', () => {
  const frame = new CartesianFrame();
  frame.rotationMode = 'orbit';
  frame.rotate( new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.8, 0.4, 0.1 ) ), identity );
  frame.rotationMode = 'molecule';
  const delta = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
  const q = frame.rotate( delta, identity );
  const inverseCamera = frame.orbitQuaternion.clone().inverse();
  const input = new THREE.Vector3( 1, 2, 3 );
  near( input.clone().applyQuaternion( q ).applyQuaternion( inverseCamera ),
    input.clone().applyQuaternion( inverseCamera ).applyQuaternion( delta ) );
  const a = new THREE.Vector3( 1, 0, 0 );
  const b = new THREE.Vector3( 1, 1, 1 ).normalize();
  nodeAssert.ok( Math.abs( a.dot( b ) - a.clone().applyQuaternion( q ).dot( b.clone().applyQuaternion( q ) ) ) < 1e-12 );
} );

test( 'repeated rotations remain normalized and orientation reset retains the selected mode', () => {
  const frame = new CartesianFrame();
  frame.rotationMode = 'orbit';
  const delta = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.013, -0.017, 0 ) );
  for ( let i = 0; i < 5000; i++ ) { frame.rotate( delta, identity ); }
  nodeAssert.ok( Math.abs( frame.orbitQuaternion.length() - 1 ) < 1e-12 );
  frame.resetOrientation();
  nodeAssert.equal( frame.rotationMode, 'orbit' );
  const camera = new THREE.PerspectiveCamera();
  const base = new THREE.Vector3( 6, -1.25, 40 );
  frame.applyCamera( camera, base, new THREE.Vector3() );
  near( camera.position, base );
  nodeAssert.deepEqual( camera.quaternion.toArray(), [ 0, 0, 0, 1 ] );
} );

test( 'upstream solver, domain, lone-pair, real-molecule, and bond-angle formulas are byte-for-byte preserved', () => {
  const hashes = JSON.parse( readFileSync( new URL( './upstream-model-sha256.json', import.meta.url ), 'utf8' ) );
  for ( const [ path, expected ] of Object.entries( hashes ) ) {
    const actual = createHash( 'sha256' ).update( readFileSync( new URL( `../${path}`, import.meta.url ) ) ).digest( 'hex' );
    nodeAssert.equal( actual, expected, path );
  }
} );

const geometryCode = readFileSync( new URL( '../js/common/view/TextbookGeometry.js', import.meta.url ), 'utf8' );
const { default: textbookGeometry } = await import( `data:text/javascript;base64,${Buffer.from( geometryCode ).toString( 'base64' )}` );
const referenceCode = readFileSync( new URL( '../js/common/view/TextbookReference.js', import.meta.url ), 'utf8' );
const { default: textbookReference } = await import( `data:text/javascript;base64,${Buffer.from( referenceCode ).toString( 'base64' )}` );
const v = ( x, y, z ) => new THREE.Vector3( x, y, z );
const ideals = [ [], [ v( 1, 0, 0 ) ], [ v( 1, 0, 0 ), v( -1, 0, 0 ) ],
  [ v( 1, 0, 0 ), v( -0.5, Math.sqrt( 3 ) / 2, 0 ), v( -0.5, -Math.sqrt( 3 ) / 2, 0 ) ],
  [ v( 0, 0, 1 ), v( Math.sqrt( 8 / 9 ), 0, -1 / 3 ), v( -Math.sqrt( 2 / 9 ), Math.sqrt( 2 / 3 ), -1 / 3 ), v( -Math.sqrt( 2 / 9 ), -Math.sqrt( 2 / 3 ), -1 / 3 ) ],
  [ v( 0, 1, 0 ), v( 0, -0.5, Math.sqrt( 3 ) / 2 ), v( 0, -0.5, -Math.sqrt( 3 ) / 2 ), v( 1, 0, 0 ), v( -1, 0, 0 ) ],
  [ v( 0, 0, 1 ), v( 0, 0, -1 ), v( 0, 1, 0 ), v( 0, -1, 0 ), v( 1, 0, 0 ), v( -1, 0, 0 ) ] ];

test( 'textbook orientations preserve every domain angle for all 28 AXnEm configurations', () => {
  for ( let x = 0; x <= 6; x++ ) {
    for ( let e = 0; x + e <= 6; e++ ) {
      const original = ideals[ x + e ];
      const before = original.map( direction => direction.toArray() );
      const aligned = textbookGeometry( original, x, e );
      aligned.forEach( ( a, i ) => {
        nodeAssert.ok( Math.abs( a.length() - 1 ) < 1e-12 );
        aligned.forEach( ( b, j ) => nodeAssert.ok( Math.abs( a.dot( b ) - original[ i ].dot( original[ j ] ) ) < 1e-12 ) );
      } );
      nodeAssert.deepEqual( original.map( direction => direction.toArray() ), before );
    }
  }
} );

test( 'textbook conventions make common molecular shapes readable against the page and axes', () => {
  textbookGeometry( ideals[ 6 ], 6, 0 ).forEach( direction => nodeAssert.equal( direction.toArray().filter( n => Math.abs( n ) > 0.5 ).length, 1 ) );

  const trigonalPlanar = textbookGeometry( ideals[ 3 ], 3, 0 );
  nodeAssert.ok( trigonalPlanar.every( direction => Math.abs( direction.z ) < 1e-12 ) );
  near( trigonalPlanar[ 0 ], v( 0, 1, 0 ) );

  const trigonalPyramidal = textbookGeometry( ideals[ 4 ], 3, 1 );
  near( trigonalPyramidal[ 0 ], v( 0, 0, 1 ) );
  nodeAssert.ok( trigonalPyramidal.slice( 1 ).every( direction => Math.abs( direction.z + 1 / 3 ) < 1e-12 ) );

  const bipyramid = textbookGeometry( ideals[ 5 ], 5, 0 );
  near( bipyramid[ 3 ], v( 0, 0, 1 ) ); near( bipyramid[ 4 ], v( 0, 0, -1 ) );
  bipyramid.slice( 0, 3 ).forEach( direction => nodeAssert.ok( Math.abs( direction.z ) < 1e-12 ) );

  const seesaw = textbookGeometry( ideals[ 5 ], 4, 1 );
  near( seesaw[ 3 ], v( 0, 0, 1 ) ); near( seesaw[ 4 ], v( 0, 0, -1 ) );
  nodeAssert.ok( seesaw.slice( 1, 3 ).every( direction => Math.abs( direction.z ) < 1e-12 ) );

  const tShape = textbookGeometry( ideals[ 5 ], 3, 2 );
  near( tShape[ 2 ], v( 1, 0, 0 ) );
  near( tShape[ 3 ], v( 0, 0, 1 ) ); near( tShape[ 4 ], v( 0, 0, -1 ) );

  const trigonalTShape = textbookGeometry( ideals[ 6 ], 3, 3 );
  nodeAssert.ok( trigonalTShape.slice( 3 ).some( direction => Math.abs( direction.z - 1 ) < 1e-12 ) );
  nodeAssert.ok( trigonalTShape.slice( 3 ).some( direction => Math.abs( direction.z + 1 ) < 1e-12 ) );
  nodeAssert.ok( trigonalTShape.slice( 3 ).some( direction => Math.abs( direction.x - 1 ) < 1e-12 ) );

  const squarePlanar = textbookGeometry( ideals[ 6 ], 4, 2 );
  nodeAssert.ok( squarePlanar.slice( 2 ).every( direction => Math.abs( direction.z ) < 1e-12 ) );
  const squarePyramidal = textbookGeometry( ideals[ 6 ], 5, 1 );
  near( squarePyramidal[ 0 ], v( 0, 0, -1 ) ); near( squarePyramidal[ 1 ], v( 0, 0, 1 ) );
  nodeAssert.ok( squarePyramidal.slice( 2 ).every( direction => Math.abs( direction.z ) < 1e-12 ) );
  const sixDomainLinear = textbookGeometry( ideals[ 6 ], 2, 4 );
  near( sixDomainLinear[ 4 ], v( 0, 0, 1 ) ); near( sixDomainLinear[ 5 ], v( 0, 0, -1 ) );

  for ( const e of [ 1, 2 ] ) {
    const bent = textbookGeometry( ideals[ 2 + e ], 2, e ).slice( e );
    nodeAssert.ok( bent.every( direction => Math.abs( direction.z ) < 1e-12 && direction.y > 0 ) );
    nodeAssert.ok( Math.abs( bent[ 0 ].x + bent[ 1 ].x ) < 1e-12 );
  }
  const tetrahedron = textbookGeometry( ideals[ 4 ], 4, 0 );
  nodeAssert.ok( Math.abs( tetrahedron[ 0 ].angleTo( tetrahedron[ 1 ] ) * 180 / Math.PI - 109.47122063449069 ) < 1e-10 );
} );

test( 'alignment, rigid rotation, axes, and coordinate readout share the same molecular frame', () => {
  const frame = new CartesianFrame();
  nodeAssert.equal( frame.lockAxesToMolecule, true );
  frame.alignmentQuaternion.setFromEuler( new THREE.Euler( 0.4, 0.7, -0.2 ) );
  frame.molecularFrameQuaternion.copy( frame.alignmentQuaternion );
  const q = new THREE.Quaternion().setFromEuler( new THREE.Euler( -0.3, 0.1, 0.8 ) );
  const center = v( 2, -3, 1 );
  const atom = center.clone().add( v( 4, 5, 6 ) );
  const local = frame.getCoordinates( atom, center, q );
  const expectedWorld = atom.clone().sub( center ).applyQuaternion( frame.getMoleculeViewQuaternion( q ) );
  near( local.clone().applyQuaternion( frame.getAxesQuaternion( q ) ), expectedWorld );
  frame.lockAxesToMolecule = false;
  near( frame.getCoordinates( atom, center, q ), expectedWorld );
} );

test( 'local axes follow domain-induced rotation without snapping the molecule view back', () => {
  const frame = new CartesianFrame();
  const delta = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.4, 0.7, 0.2 ) );
  const rawAtom = v( 10, 0, 0 ).applyQuaternion( delta );
  frame.molecularFrameQuaternion.copy( delta.clone().inverse() );
  near( rawAtom.clone().applyQuaternion( frame.getMoleculeViewQuaternion( identity ) ), rawAtom );
  near( v( 1, 0, 0 ).applyQuaternion( frame.getAxesQuaternion( identity ) ), rawAtom.clone().normalize() );
  near( frame.getCoordinates( rawAtom, v( 0, 0, 0 ), identity ), v( 10, 0, 0 ) );
} );


test( 'lab mode maps the real room to a fixed Z-up frame with X/Y on the floor', () => {
  const frame = new CartesianFrame();
  frame.roomEnabled = true;
  frame.lockAxesToMolecule = true;
  frame.alignmentQuaternion.setFromEuler( new THREE.Euler( 0.2, 0.3, 0.1 ) );
  const q = new THREE.Quaternion().setFromEuler( new THREE.Euler( -0.2, 0.6, 0 ) );
  const center = v( 3, -4, 2 ); const atom = center.clone().add( v( 2, -5, 7 ) );
  const expected = atom.clone().sub( center ).applyQuaternion( frame.getMoleculeViewQuaternion( q ) )
    .applyQuaternion( frame.sceneToRoomQuaternion );
  for ( const mode of [ 'orbit', 'molecule' ] ) {
    frame.rotationMode = mode;
    near( frame.getCoordinates( atom, center, q ), expected );
    nodeAssert.equal( frame.usesMolecularFrame, false );
    const roomToScene = frame.getAxesQuaternion( q );
    near( v( 1, 0, 0 ).applyQuaternion( roomToScene ), v( 1, 0, 0 ) );
    near( v( 0, 1, 0 ).applyQuaternion( roomToScene ), v( 0, 0, -1 ) );
    near( v( 0, 0, 1 ).applyQuaternion( roomToScene ), v( 0, 1, 0 ) );
  }
} );

test( 'room turntable keeps a level horizon and stays within floor/ceiling pitch bounds', () => {
  const frame = new CartesianFrame(); frame.roomEnabled = true; frame.rotationMode = 'orbit';
  frame.setRoomView( -0.35, -0.18 );
  const atom = v( 4, 5, 6 );
  for ( let i = 0; i < 100; i++ ) {
    nodeAssert.equal( frame.rotate( new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.1, 0.04, 0 ) ), identity ), identity );
    nodeAssert.ok( frame.roomPitch >= -0.65 && frame.roomPitch <= 0.18 );
    nodeAssert.ok( Math.abs( v( 1, 0, 0 ).applyQuaternion( frame.orbitQuaternion ).y ) < 1e-12 );
    near( frame.getCoordinates( atom, v( 0, 0, 0 ), identity ), atom.clone().applyQuaternion( frame.sceneToRoomQuaternion ) );
  }
} );

test( 'packaged Lab source retains the original geometry, JPEG bytes, and CC BY attribution', () => {
  const hashes = JSON.parse( readFileSync( new URL( '../assets/lab/SHA256SUMS.json', import.meta.url ), 'utf8' ) );
  for ( const [ name, expected ] of Object.entries( hashes ) ) {
    const actual = createHash( 'sha256' ).update( readFileSync( new URL( `../assets/lab/${name}`, import.meta.url ) ) ).digest( 'hex' );
    nodeAssert.equal( actual, expected, name );
  }
  const asset = JSON.parse( readFileSync( new URL( '../assets/lab/scene.gltf', import.meta.url ), 'utf8' ) );
  nodeAssert.equal( asset.images.length, 11 ); nodeAssert.equal( asset.asset.version, '2.0' );
  nodeAssert.match( asset.asset.extras.author, /Raid/ );
  nodeAssert.match( readFileSync( new URL( '../assets/lab/license.txt', import.meta.url ), 'utf8' ), /CC-BY-4.0/ );
} );


test( 'offline Lab bundle embeds byte-identical original JPEGs and geometry', () => {
  const source = readFileSync( new URL( '../js/common/data/LabSceneData.js', import.meta.url ), 'utf8' );
  const prefix = 'const LabSceneData = ';
  const json = source.slice( source.indexOf( prefix ) + prefix.length, source.lastIndexOf( ';\nexport default' ) );
  const data = JSON.parse( json );
  data.gltf.images.forEach( ( image, index ) => {
    const raw = readFileSync( new URL( `../assets/lab/${image.uri}`, import.meta.url ) );
    nodeAssert.ok( Buffer.from( data.images[ index ].split( ',' )[ 1 ], 'base64' ).equals( raw ), image.uri );
  } );
  data.gltf.buffers.forEach( ( buffer, index ) => {
    const raw = readFileSync( new URL( `../assets/lab/${buffer.uri}`, import.meta.url ) );
    nodeAssert.ok( Buffer.from( data.buffers[ index ], 'base64' ).equals( raw ), buffer.uri );
  } );
} );

test( 'textbook lock holds the canonical molecular pose while gestures orbit the room camera', () => {
  const frame = new CartesianFrame(); frame.roomEnabled = true; frame.textbookLocked = true;
  frame.rotationMode = 'molecule';
  const rawRotation = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.3, -0.6, 0.2 ) );
  frame.molecularFrameQuaternion.copy( rawRotation.clone().inverse() );
  const q = new THREE.Quaternion().setFromEuler( new THREE.Euler( -0.5, 0.8, 0.4 ) );
  const rawAtom = v( 10, 0, 0 ).applyQuaternion( rawRotation );
  near( rawAtom.clone().applyQuaternion( frame.getMoleculeViewQuaternion( q ) ), v( 10, 0, 0 ) );
  near( frame.getCoordinates( rawAtom, v( 0, 0, 0 ), q ), v( 10, 0, 0 ) );
  const before = frame.orbitQuaternion.toArray();
  const result = frame.rotate( new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.1, 0.2, 0 ) ), q );
  nodeAssert.equal( result, q ); nodeAssert.notDeepEqual( frame.orbitQuaternion.toArray(), before );
  near( rawAtom.clone().applyQuaternion( frame.getMoleculeViewQuaternion( q ) ), v( 10, 0, 0 ) );
  frame.textbookLocked = false;
  nodeAssert.notDeepEqual( frame.rotate( new THREE.Quaternion().setFromEuler( new THREE.Euler( 0, 0.2, 0 ) ), q ).toArray(), q.toArray() );
} );

// A combined pitch/yaw must not roll the book's vertical axis sideways.
test( 'book cameras keep axial bonds upright, face the reference page, and retain the first two flat views', () => {
  for ( let x = 0; x <= 6; x++ ) {
    for ( let e = 0; x + e <= 6; e++ ) {
      const reference = textbookReference( textbookGeometry( ideals[ x + e ], x, e ), x, e );
      const pageUp = reference.page === 'XY' ? v( 0, 1, 0 ) : v( 0, 0, 1 );
      const cameraUp = pageUp.applyQuaternion( reference.home.clone().inverse() );
      nodeAssert.ok( Math.abs( cameraUp.x ) < 1e-12 && cameraUp.y > 0.8 );
      const cameraDirection = v( 0, 0, 1 ).applyQuaternion( reference.home );
      nodeAssert.ok( ( reference.page === 'XY' ? cameraDirection.z : -cameraDirection.y ) >= 0.7 );
      if ( e === 0 && ( x === 2 || x === 3 ) ) {
        nodeAssert.deepEqual( reference.home.toArray(), [ 0, 0, 0, 1 ] );
        nodeAssert.equal( reference.page, 'XY' );
      }
    }
  }
} );
