/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension tests. */
/** @author Cartesian-coordinate extension contributors */
'use strict';
// SPDX-License-Identifier: GPL-3.0-only
// Browser and upstream-regression tests for the Cartesian extension, added 2026-11-22.
const nodeAssert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { chromium } = require( process.env.PLAYWRIGHT_MODULE_PATH || '../../perennial-alias/node_modules/playwright' );
const collectRegressionScenarios = require( './regression-scenarios.cjs' );
const baseURL = process.env.SIM_BASE_URL || 'http://localhost:8080';
const simPath = process.env.SIM_PATH || '/molecule-shapes/molecule-shapes_en.html';
const outputDir = process.env.TEST_OUTPUT_DIR || path.join( __dirname, 'artifacts' );
fs.mkdirSync( outputDir, { recursive: true } );
const nearArray = ( actual, expected, tolerance = 1e-9 ) => {
  nodeAssert.equal( actual.length, expected.length );
  actual.forEach( ( value, i ) => nodeAssert.ok( Math.abs( value - expected[ i ] ) < tolerance, `${actual} != ${expected}` ) );
};
const compare = ( actual, expected, key = 'root' ) => {
  if ( typeof expected === 'number' ) {
    nodeAssert.ok( Number.isFinite( actual ) && Math.abs( actual - expected ) < 1e-9, `${key}: ${actual} != ${expected}` );
  }
  else if ( expected && typeof expected === 'object' ) {
    nodeAssert.deepEqual( Object.keys( actual ), Object.keys( expected ), key );
    for ( const child of Object.keys( expected ) ) { compare( actual[ child ], expected[ child ], `${key}.${child}` ); }
  }
  else { nodeAssert.equal( actual, expected, key ); }
};
const launchOptions = { headless: true, args: [ '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader' ] };
if ( process.env.BROWSER_EXECUTABLE ) { launchOptions.executablePath = process.env.BROWSER_EXECUTABLE; }

( async () => {
  const browser = await chromium.launch( launchOptions );
  const errors = [];
  const page = await browser.newPage( { viewport: { width: 1400, height: 900 } } );
  page.on( 'pageerror', error => { errors.push( error.message ); console.error( 'PAGEERROR', error.message ); } );
  try {
    await page.goto( `${baseURL}${simPath}?brand=cerium&ea` );
    await page.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value );
    await page.evaluate( () => {
      const sim = phet.joist.sim;
      sim.selectedScreenProperty.value = sim.simScreens[ 0 ];
      sim.simScreens.forEach( screen => { screen.model.step = () => {}; } );
      window.testScreen = sim.simScreens[ 0 ];
      window.testView = testScreen.view;
      window.testModel = testScreen.model;
      window.molecularSnapshot = () => JSON.stringify( {
        groups: testModel.moleculeProperty.value.groups.map( group => ( {
          id: group.id, lonePair: group.isLonePair,
          p: [ group.positionProperty.value.x, group.positionProperty.value.y, group.positionProperty.value.z ],
          v: [ group.velocityProperty.value.x, group.velocityProperty.value.y, group.velocityProperty.value.z ]
        } ) ),
        bonds: testModel.moleculeProperty.value.bonds.map( bond => [ bond.order, bond.length ] )
      } );
    } );
    nodeAssert.deepEqual( await page.evaluate( () => ( {
      show: testView.cartesianCoordinatesPanel.showProperty.value,
      lock: testView.cartesianCoordinatesPanel.lockAxesProperty.value,
      rows: testView.cartesianCoordinatesPanel.rows.slice( 0, 2 ).map( row => row.string ),
      hint: testView.cartesianCoordinatesPanel.orientationHint.string
    } ) ), { show: true, lock: true, rows: [ 'A1   10.00    0.00    0.00', 'A2  -10.00    0.00    0.00' ],
      hint: 'Linear: the 2 bonds point in opposite directions.' } );
    nodeAssert.ok( await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).isChecked() );
    nodeAssert.equal( await page.getByRole( 'radio', { name: 'Molecule-only rotation', exact: true } ).count(), 0 );
    const baseline = JSON.parse( fs.readFileSync( path.join( __dirname, 'vsepr-baseline.json' ), 'utf8' ) );
    const scenarios = await page.evaluate( collectRegressionScenarios );
    compare( scenarios, baseline.scenarios );
    console.log( `PASS upstream numerical regression: ${Object.keys( scenarios ).length} scenarios (28 AXnEm, 13 real molecules)` );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'radio', { name: 'Molecule-only rotation', exact: true } ).press( 'Space', { delay: 100 } );

    // Known coordinates and a nontrivial molecular orientation, with the solver frozen for input tests.
    await page.evaluate( () => {
      const old = testModel.moleculeProperty.value;
      const PairGroup = old.centralAtom.constructor;
      const Vector3 = old.centralAtom.positionProperty.value.constructor;
      const molecule = new old.constructor();
      molecule.addCentralAtom( new PairGroup( new Vector3( 0, 0, 0 ), false ) );
      molecule.addGroupAndBond( new PairGroup( new Vector3( 10, 0, 0 ), false ), molecule.centralAtom, 2 );
      molecule.addGroupAndBond( new PairGroup( new Vector3( 0, 10, 0 ), false ), molecule.centralAtom, 3 );
      testModel.moleculeProperty.value = molecule;
      testModel.moleculeQuaternionProperty.value = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2 );
      testModel.showBondAnglesProperty.value = true;
      testView.cartesianCoordinatesPanel.lockAxesProperty.value = false;
      window.originalMolecule = molecularSnapshot();
    } );
    await page.waitForFunction( () => testView.cartesianCoordinatesPanel.rows[ 0 ].string.includes( '0.00   10.00' ) );
    const worldRows = await page.evaluate( () => testView.cartesianCoordinatesPanel.rows.slice( 0, 2 ).map( row => row.string ) );
    nodeAssert.match( worldRows[ 0 ], /A1\s+0\.00\s+10\.00\s+0\.00/ );
    nodeAssert.match( worldRows[ 1 ], /A2\s+-10\.00\s+0\.00\s+0\.00/ );
    await page.getByRole( 'radio', { name: 'Camera orbit', exact: true } ).press( 'Space' );
    await page.waitForFunction( () => testView.cartesianCoordinatesPanel.frameText.string.startsWith( 'Molecular' ) );
    const beforeOrbit = await page.evaluate( () => ( {
      q: testModel.moleculeQuaternionProperty.value.toArray(),
      camera: testView.threeCamera.position.toArray(),
      rows: testView.cartesianCoordinatesPanel.rows.slice( 0, 2 ).map( row => row.string )
    } ) );
    nodeAssert.match( beforeOrbit.rows[ 0 ], /A1\s+10\.00\s+0\.00\s+0\.00/ );
    await page.mouse.move( 900, 650 ); await page.mouse.down(); await page.mouse.move( 1000, 570, { steps: 8 } ); await page.mouse.up(); await page.waitForTimeout( 100 );
    const afterOrbit = await page.evaluate( () => ( {
      q: testModel.moleculeQuaternionProperty.value.toArray(),
      camera: testView.threeCamera.position.toArray(),
      axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(),
      rows: testView.cartesianCoordinatesPanel.rows.slice( 0, 2 ).map( row => row.string ),
      sameMolecule: originalMolecule === molecularSnapshot()
    } ) );
    nodeAssert.deepEqual( afterOrbit.q, beforeOrbit.q );
    nodeAssert.notDeepEqual( afterOrbit.camera, beforeOrbit.camera );
    nodeAssert.deepEqual( afterOrbit.rows, beforeOrbit.rows );
    nearArray( afterOrbit.axes, beforeOrbit.q );
    nodeAssert.ok( afterOrbit.sameMolecule );
    console.log( 'PASS camera orbit, molecular-frame coordinates, keyboard controls, and untouched model state' );

    for ( const plane of [ 'XY', 'XZ', 'YZ', 'none' ] ) {
      await page.getByRole( 'radio', { name: plane === 'none' ? 'No coordinate plane' : `${plane} plane`, exact: true } ).press( 'Space' );
      await page.waitForFunction( plane => Object.entries( testView.cartesianCoordinatesView.planes ).every( ( [ name, mesh ] ) => mesh.visible === ( name === plane ) ), plane );
    }
    await page.getByRole( 'radio', { name: 'XZ plane', exact: true } ).press( 'Space' );
    await page.screenshot( { path: path.join( outputDir, 'camera-orbit.png' ) } );
    await page.getByRole( 'radio', { name: 'Molecule-only rotation', exact: true } ).press( 'Space' );
    const cameraBeforeMolecule = await page.evaluate( () => testView.threeCamera.position.toArray() );
    await page.mouse.move( 900, 650 ); await page.mouse.down(); await page.mouse.move( 970, 590, { steps: 8 } ); await page.mouse.up(); await page.waitForTimeout( 100 );
    const moleculeOnly = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      const coordinates = testView.cartesianFrame.getCoordinates( molecule.radialAtoms[ 0 ].positionProperty.value,
        molecule.centralAtom.positionProperty.value, testModel.moleculeQuaternionProperty.value );
      const worldAtom = testView.moleculeView.localToWorld( new THREE.Vector3().copy( molecule.radialAtoms[ 0 ].positionProperty.value ) );
      const worldCenter = testView.moleculeView.localToWorld( new THREE.Vector3().copy( molecule.centralAtom.positionProperty.value ) );
      return { camera: testView.threeCamera.position.toArray(), axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(),
        q: testModel.moleculeQuaternionProperty.value.toArray(), coordinates: coordinates.toArray(),
        worldRelative: worldAtom.sub( worldCenter ).toArray(), sameMolecule: molecularSnapshot() === originalMolecule,
        angle: testView.moleculeView.angleViews[ 0 ].viewAngle * 180 / Math.PI };
    } );
    nodeAssert.deepEqual( moleculeOnly.camera, cameraBeforeMolecule );
    nodeAssert.deepEqual( moleculeOnly.axes, [ 0, 0, 0, 1 ] );
    nodeAssert.notDeepEqual( moleculeOnly.q, beforeOrbit.q );
    nearArray( moleculeOnly.coordinates, moleculeOnly.worldRelative, 1e-5 );
    nodeAssert.ok( moleculeOnly.sameMolecule );
    nodeAssert.ok( Math.abs( moleculeOnly.angle - 90 ) < 1e-8 );
    console.log( 'PASS molecule-only rotation, world-frame coordinates, fixed axes, planes, and 90-degree bond angle' );

    await page.getByRole( 'checkbox', { name: 'Lock axes to molecule', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => testView.cartesianCoordinatesPanel.frameText.string.startsWith( 'Molecular' ) );
    const beforeLockedDrag = await page.evaluate( () => ( {
      q: testModel.moleculeQuaternionProperty.value.toArray(), camera: testView.threeCamera.position.toArray(),
      rows: testView.cartesianCoordinatesPanel.rows.slice( 0, 2 ).map( row => row.string )
    } ) );
    nodeAssert.match( beforeLockedDrag.rows[ 0 ], /A1\s+10\.00\s+0\.00\s+0\.00/ );
    await page.mouse.move( 900, 650 ); await page.mouse.down(); await page.mouse.move( 1000, 590, { steps: 8 } ); await page.mouse.up(); await page.waitForTimeout( 100 );
    const lockedDrag = await page.evaluate( () => {
      const axes = testView.cartesianCoordinatesView.axes;
      const q = testModel.moleculeQuaternionProperty.value;
      const normal = new THREE.Vector3( 0, 0, 1 ).transformDirection( testView.cartesianCoordinatesView.planes.XZ.matrixWorld );
      return { q: q.toArray(), axes: axes.quaternion.toArray(), camera: testView.threeCamera.position.toArray(),
        rows: testView.cartesianCoordinatesPanel.rows.slice( 0, 2 ).map( row => row.string ),
        normal: normal.toArray(), expectedNormal: new THREE.Vector3( 0, -1, 0 ).applyQuaternion( q ).toArray(),
        sameMolecule: molecularSnapshot() === originalMolecule };
    } );
    nodeAssert.notDeepEqual( lockedDrag.q, beforeLockedDrag.q );
    nearArray( lockedDrag.axes, lockedDrag.q );
    nearArray( lockedDrag.normal, lockedDrag.expectedNormal, 1e-5 );
    nodeAssert.deepEqual( lockedDrag.camera, beforeLockedDrag.camera );
    nodeAssert.deepEqual( lockedDrag.rows, beforeLockedDrag.rows );
    nodeAssert.ok( lockedDrag.sameMolecule );
    await page.screenshot( { path: path.join( outputDir, 'molecule-locked.png' ) } );
    console.log( 'PASS local-orientation lock: molecule, axes, and plane rotate together; local coordinates and model state stay unchanged' );

    await page.getByRole( 'button', { name: 'Reset orientation', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => testModel.moleculeQuaternionProperty.value.w === 1 && testView.cartesianFrame.orbitQuaternion.equals( testView.homeOrbitQuaternion ) );
    const reset = await page.evaluate( () => ( {
      q: testModel.moleculeQuaternionProperty.value.toArray(), orbit: testView.cartesianFrame.orbitQuaternion.toArray(),
      sameMolecule: molecularSnapshot() === originalMolecule, visible: testView.cartesianCoordinatesPanel.showProperty.value,
      plane: testView.cartesianCoordinatesPanel.planeProperty.value, mode: testView.cartesianFrame.rotationMode,
      locked: testView.cartesianCoordinatesPanel.lockAxesProperty.value
    } ) );
    const homeOrbit = await page.evaluate( () => testView.homeOrbitQuaternion.toArray() );
    nodeAssert.deepEqual( reset, { q: [ 0, 0, 0, 1 ], orbit: homeOrbit, sameMolecule: true, visible: true, plane: 'XZ', mode: 'molecule', locked: true } );
    await page.getByRole( 'checkbox', { name: 'Lock axes to molecule', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => testView.cartesianCoordinatesPanel.frameText.string.startsWith( 'World' ) );

    // An orbit to a formerly edge-on XY view must still allow finite group placement and correct atom picking/dragging.
    const interactions = await page.evaluate( () => {
      testView.cartesianCoordinatesPanel.modeProperty.value = 'orbit';
      testView.cartesianFrame.rotate( new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.3, Math.PI / 2, 0 ) ), testModel.moleculeQuaternionProperty.value );
      testView.updateCameraOrientation();
      const molecule = testModel.moleculeProperty.value;
      const point = testView.getPlanarMoleculePosition( { x: 930, y: 450 } );
      const worldPoint = testView.moleculeView.localToWorld( point.clone() );
      const normal = new THREE.Vector3( 0, 0, 1 ).applyQuaternion( testView.threeCamera.quaternion );
      const atom = molecule.radialAtoms[ 1 ];
      const ndc = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) ).project( testView.threeCamera );
      const screenPoint = { x: ( ndc.x + 1 ) * testView.screenWidth / 2, y: ( 1 - ndc.y ) * testView.screenHeight / 2 };
      const hit = testView.getElectronPairUnderPointer( { point: screenPoint }, false );
      const dragged = testView.getSphericalMoleculePosition( screenPoint, atom );
      testView.addPairGroup( 1, new testView.layoutBounds.constructor( 930, 440, 960, 460 ) );
      return { point: point.toArray(), planeDistance: normal.dot( worldPoint ), hit: hit === atom,
        dragRadius: dragged.magnitude, atoms: molecule.radialAtoms.length,
        finite: molecule.groups.every( group => [ group.positionProperty.value.x, group.positionProperty.value.y, group.positionProperty.value.z ].every( Number.isFinite ) ) };
    } );
    nodeAssert.ok( interactions.point.every( Number.isFinite ) && interactions.finite );
    nodeAssert.ok( Math.abs( interactions.planeDistance ) < 1e-5 );
    nodeAssert.ok( interactions.hit ); nodeAssert.ok( Math.abs( interactions.dragRadius - 10 ) < 1e-5 );
    nodeAssert.equal( interactions.atoms, 3 );
    await page.evaluate( () => testView.removePairGroup( 1 ) );
    nodeAssert.equal( await page.evaluate( () => testModel.moleculeProperty.value.radialAtoms.length ), 2 );
    console.log( 'PASS orientation-only reset, orbit-aware group placement, picking, spherical dragging, add/remove' );

    // The shared extension follows replacements on the Real Molecules screen and never lists electron clouds as atoms.
    const real = await page.evaluate( () => {
      const sim = phet.joist.sim;
      const screen = sim.simScreens[ 1 ]; sim.selectedScreenProperty.value = screen;
      const view = screen.view; const model = screen.model;
      view.cartesianCoordinatesPanel.showProperty.value = true;
      view.cartesianCoordinatesPanel.lockAxesProperty.value = true;
      const results = [];
      model.realMoleculeShapeProperty.validValues.forEach( shape => {
        model.realMoleculeShapeProperty.value = shape;
        for ( const real of [ true, false ] ) {
          model.showRealViewProperty.value = real;
          view.step( 0 );
          const molecule = model.moleculeProperty.value;
          results.push( { name: shape.displayName, real: real, atoms: molecule.radialAtoms.length,
            labels: [ ...view.cartesianCoordinatesView.atomLabels, ...view.cartesianCoordinatesView.bookAtomLabels ].filter( label => label.visible ).length,
            rows: view.cartesianCoordinatesPanel.rows.filter( row => row.string.trim() ).length,
            lonePairs: molecule.radialLonePairs.length, locked: view.cartesianCoordinatesPanel.lockAxesProperty.value } );
        }
      } );
      model.showLonePairsProperty.value = false; view.step( 0 );
      model.showLonePairsProperty.value = true; view.resetOrientation();
      return results;
    } );
    nodeAssert.equal( real.length, 26 );
    real.forEach( entry => { nodeAssert.equal( entry.labels, entry.atoms ); nodeAssert.equal( entry.rows, entry.atoms ); nodeAssert.equal( entry.locked, true ); } );
    await page.evaluate( () => {
      phet.joist.sim.selectedScreenProperty.value = testScreen;
      testView.resetOrientation(); testView.cartesianCoordinatesPanel.modeProperty.value = 'molecule';
      testView.cartesianCoordinatesPanel.lockAxesProperty.value = true;
    } );
    await page.screenshot( { path: path.join( outputDir, 'molecule-only.png' ) } );
    await page.mouse.click( 1345, 785 );
    await page.waitForFunction( () => testView.cartesianCoordinatesPanel.planeProperty.value === 'none' );
    nodeAssert.deepEqual( await page.evaluate( () => ( { plane: testView.cartesianCoordinatesPanel.planeProperty.value,
      mode: testView.cartesianFrame.rotationMode, orbit: testView.cartesianFrame.orbitQuaternion.toArray(),
      locked: testView.cartesianCoordinatesPanel.lockAxesProperty.value } ) ),
    { plane: 'none', mode: 'orbit', orbit: homeOrbit, locked: true } );
    nodeAssert.ok( await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).isChecked() );
    console.log( 'PASS 13 real presets in real/model views, lone-pair visibility, screen switching, and Reset All' );

    // Rigidly rotated ideal geometries must recover conventional axes without changing any model state.
    const alignment = await page.evaluate( () => {
      const old = testModel.moleculeProperty.value;
      const PairGroup = old.centralAtom.constructor;
      const Vector3 = old.centralAtom.positionProperty.value.constructor;
      const Configuration = old.getCentralVSEPRConfiguration().constructor;
      const offset = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.7, 0.8, -0.4 ) );
      const results = [];
      for ( let x = 0; x <= 6; x++ ) {
        for ( let e = 0; x + e <= 6; e++ ) {
          const molecule = new old.constructor();
          molecule.addCentralAtom( new PairGroup( new Vector3( 0, 0, 0 ), false ) );
          Configuration.getConfiguration( x, e ).allOrientations.forEach( ( direction, i ) => {
            const rotated = new THREE.Vector3().copy( direction ).applyQuaternion( offset ).multiplyScalar( i < e ? 7 : 10 );
            molecule.addGroupAndBond( new PairGroup( new Vector3( rotated.x, rotated.y, rotated.z ), i < e ), molecule.centralAtom, i < e ? 0 : 1 );
          } );
          testModel.moleculeProperty.value = molecule;
          testView.resetOrientation();
          const before = molecularSnapshot();
          testView.step( 0 );
          const raw = molecule.radialGroups.map( group => new THREE.Vector3().copy( group.positionProperty.value ).normalize() );
          const canonical = molecule.radialGroups.map( group => testView.cartesianFrame.getCoordinates( group.positionProperty.value,
            molecule.centralAtom.positionProperty.value, testModel.moleculeQuaternionProperty.value ).normalize() );
          const atoms = molecule.radialAtoms.map( group => testView.cartesianFrame.getCoordinates( group.positionProperty.value,
            molecule.centralAtom.positionProperty.value, testModel.moleculeQuaternionProperty.value ).toArray() );
          const angleErrors = raw.flatMap( ( a, i ) => raw.map( ( b, j ) => Math.abs( a.dot( b ) - canonical[ i ].dot( canonical[ j ] ) ) ) );
          results.push( { x: x, e: e, atoms: atoms, same: before === molecularSnapshot(), angleError: Math.max( 0, ...angleErrors ) } );
        }
      }
      return results;
    } );
    nodeAssert.equal( alignment.length, 28 );
    alignment.forEach( entry => { nodeAssert.ok( entry.same ); nodeAssert.ok( entry.angleError < 1e-6 ); } );
    const geometry = ( x, e ) => alignment.find( entry => entry.x === x && entry.e === e ).atoms;
    const nearZeroZ = atoms => atoms.filter( atom => Math.abs( atom[ 2 ] ) < 1e-4 );
    const cardinal = atoms => atoms.forEach( atom => {
      nodeAssert.equal( atom.filter( n => Math.abs( n ) > 1e-4 ).length, 1 );
      nodeAssert.ok( Math.abs( Math.max( ...atom.map( Math.abs ) ) - 10 ) < 1e-4 );
    } );
    cardinal( geometry( 6, 0 ) ); cardinal( geometry( 5, 1 ) ); cardinal( geometry( 4, 2 ) );
    const bipyramid = geometry( 5, 0 );
    nodeAssert.equal( bipyramid.filter( p => Math.abs( p[ 2 ] ) < 1e-4 ).length, 3 );
    nodeAssert.equal( bipyramid.filter( p => Math.abs( Math.abs( p[ 2 ] ) - 10 ) < 1e-4 ).length, 2 );
    nodeAssert.equal( nearZeroZ( geometry( 3, 0 ) ).length, 3 );
    const tetrahedral = geometry( 4, 0 );
    nodeAssert.equal( nearZeroZ( tetrahedral ).length, 2, 'tetrahedral pair in the page' );
    const tetrahedralDepths = tetrahedral.filter( p => Math.abs( p[ 2 ] ) > 1e-4 ).map( p => p[ 2 ] );
    nodeAssert.equal( tetrahedralDepths.length, 2 );
    nodeAssert.ok( tetrahedralDepths[ 0 ] * tetrahedralDepths[ 1 ] < 0, 'one tetrahedral bond toward and one away' );
    geometry( 3, 1 ).forEach( p => nodeAssert.ok( Math.abs( p[ 2 ] + 10 / 3 ) < 1e-4, 'trigonal-pyramidal atoms below their lone pair' ) );
    nodeAssert.equal( nearZeroZ( geometry( 4, 1 ) ).length, 2, 'seesaw equatorial bonds in XY' );
    const tShape = geometry( 3, 2 );
    nodeAssert.equal( nearZeroZ( tShape ).length, 1 );
    nodeAssert.equal( tShape.filter( p => Math.abs( Math.abs( p[ 2 ] ) - 10 ) < 1e-4 ).length, 2 );
    const trigonalTShape = geometry( 3, 3 );
    nodeAssert.equal( nearZeroZ( trigonalTShape ).length, 1 );
    nodeAssert.equal( trigonalTShape.filter( p => Math.abs( Math.abs( p[ 2 ] ) - 10 ) < 1e-4 ).length, 2 );
    nodeAssert.equal( geometry( 4, 2 ).filter( p => Math.abs( p[ 2 ] ) < 1e-4 ).length, 4 );
    nodeAssert.equal( nearZeroZ( geometry( 5, 1 ) ).length, 4, 'square-pyramid base in XY' );
    for ( const e of [ 3, 4 ] ) {
      const line = geometry( 2, e );
      nodeAssert.equal( line.filter( p => Math.abs( Math.abs( p[ 2 ] ) - 10 ) < 1e-4 ).length, 2 );
      nodeAssert.ok( line[ 0 ][ 2 ] * line[ 1 ][ 2 ] < 0 );
    }
    for ( const e of [ 1, 2 ] ) { geometry( 2, e ).forEach( p => nodeAssert.ok( Math.abs( p[ 2 ] ) < 1e-4 && p[ 1 ] > 0 ) ); }
    console.log( 'PASS default textbook alignment: all 28 configurations preserve model state and angles; tetrahedral in/front/back, trigonal pyramidal, T, seesaw, planar, bipyramidal, square, linear, and octahedral views' );

    // The final alignment case is an octahedron. Confirm axes remain on its bonds during actual pointer rotation.
    await page.screenshot( { path: path.join( outputDir, 'textbook-aligned.png' ) } );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'radio', { name: 'Molecule-only rotation', exact: true } ).press( 'Space', { delay: 100 } );
    const alignedRows = await page.evaluate( () => testView.cartesianCoordinatesPanel.rows.map( row => row.string ) );
    await page.mouse.move( 900, 650 ); await page.mouse.down(); await page.mouse.move( 1000, 590, { steps: 8 } ); await page.mouse.up(); await page.waitForTimeout( 100 );
    const follow = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      const inverseAxes = testView.cartesianCoordinatesView.axes.quaternion.clone().inverse();
      return { rows: testView.cartesianCoordinatesPanel.rows.map( row => row.string ),
        q: testModel.moleculeQuaternionProperty.value.toArray(),
        axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(),
        points: molecule.radialAtoms.map( atom => testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) ).applyQuaternion( inverseAxes ).toArray() ) };
    } );
    nodeAssert.deepEqual( follow.rows, alignedRows );
    nearArray( follow.axes, follow.q ); cardinal( follow.points );
    nodeAssert.notDeepEqual( follow.q, [ 0, 0, 0, 1 ] );
    await page.screenshot( { path: path.join( outputDir, 'textbook-rotated.png' ) } );
    console.log( 'PASS locked axes stay on octahedral bonds during pointer rotation; local readouts stay unchanged' );

    // Grabbing A3 rotates the complete object by default, instead of bending one bond and relaxing it back.
    const atomDragStart = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      const atom = molecule.radialAtoms[ 2 ];
      const ndc = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) ).project( testView.threeCamera );
      const point = { x: ( ndc.x + 1 ) * testView.screenWidth / 2, y: ( 1 - ndc.y ) * testView.screenHeight / 2 };
      return { point: point, hit: testView.getElectronPairUnderPointer( { point: point }, false ) === atom,
        q: testModel.moleculeQuaternionProperty.value.toArray(), snapshot: molecularSnapshot() };
    } );
    nodeAssert.ok( atomDragStart.hit, 'A3 is pickable at its projected position' );
    await page.mouse.move( atomDragStart.point.x, atomDragStart.point.y ); await page.mouse.down();
    await page.mouse.move( atomDragStart.point.x + 55, atomDragStart.point.y - 40, { steps: 8 } ); await page.mouse.up();
    await page.waitForTimeout( 100 );
    const atomDrag = await page.evaluate( () => ( { q: testModel.moleculeQuaternionProperty.value.toArray(),
      snapshot: molecularSnapshot(), rows: testView.cartesianCoordinatesPanel.rows.map( row => row.string ) } ) );
    nodeAssert.notDeepEqual( atomDrag.q, atomDragStart.q );
    nodeAssert.equal( atomDrag.snapshot, atomDragStart.snapshot ); nodeAssert.deepEqual( atomDrag.rows, alignedRows );
    await page.waitForTimeout( 250 );
    nearArray( await page.evaluate( () => testModel.moleculeQuaternionProperty.value.toArray() ), atomDrag.q );
    console.log( 'PASS grabbing A3 rotates the whole molecule and locked axes; no deformation or orientation snap after release' );

    await page.getByRole( 'checkbox', { name: 'Drag atoms and lone pairs', exact: true } ).press( 'Space', { delay: 100 } );
    const bendingStart = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      const atom = molecule.radialAtoms[ 2 ];
      const ndc = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) ).project( testView.threeCamera );
      return { point: { x: ( ndc.x + 1 ) * testView.screenWidth / 2, y: ( 1 - ndc.y ) * testView.screenHeight / 2 },
        q: testModel.moleculeQuaternionProperty.value.toArray(), viewQ: testView.moleculeView.quaternion.toArray(),
        axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(), snapshot: molecularSnapshot() };
    } );
    await page.mouse.move( bendingStart.point.x, bendingStart.point.y ); await page.mouse.down();
    await page.mouse.move( bendingStart.point.x + 45, bendingStart.point.y - 35, { steps: 8 } );
    await page.waitForTimeout( 100 );
    const duringBend = await page.evaluate( () => ( { controlled: testModel.moleculeProperty.value.radialAtoms[ 2 ].userControlledProperty.value,
      q: testModel.moleculeQuaternionProperty.value.toArray(), viewQ: testView.moleculeView.quaternion.toArray(),
      axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(), snapshot: molecularSnapshot() } ) );
    nodeAssert.ok( duringBend.controlled ); nodeAssert.notEqual( duringBend.snapshot, bendingStart.snapshot );
    nearArray( duringBend.q, bendingStart.q ); nearArray( duringBend.viewQ, bendingStart.viewQ );
    nodeAssert.notDeepEqual( duringBend.axes, bendingStart.axes, 'local frame follows overall molecular orientation during deformation' );
    await page.mouse.up();
    const relaxed = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      for ( let i = 0; i < 120; i++ ) { molecule.update( 1 / 60 ); testView.step( 0 ); }
      const axes = testView.cartesianCoordinatesView.axes;
      const inverse = axes.quaternion.clone().inverse();
      const frameErrors = molecule.radialAtoms.map( atom => {
        const world = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) );
        const local = world.sub( axes.position ).applyQuaternion( inverse );
        const row = testView.cartesianFrame.getCoordinates( atom.positionProperty.value, molecule.centralAtom.positionProperty.value,
          testModel.moleculeQuaternionProperty.value );
        return row.distanceTo( local );
      } );
      return { q: testModel.moleculeQuaternionProperty.value.toArray(), viewQ: testView.moleculeView.quaternion.toArray(),
        controlled: molecule.radialGroups.some( group => group.userControlledProperty.value ), frameErrors: frameErrors };
    } );
    nearArray( relaxed.q, bendingStart.q ); nearArray( relaxed.viewQ, bendingStart.viewQ );
    nodeAssert.equal( relaxed.controlled, false ); nodeAssert.ok( relaxed.frameErrors.every( error => error < 1e-5 ) );
    await page.getByRole( 'checkbox', { name: 'Drag atoms and lone pairs', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'button', { name: 'Reset orientation', exact: true } ).press( 'Space', { delay: 100 } );
    console.log( 'PASS optional original atom deformation, release/relaxation without view snap, and local axes/readouts tracking its reference frame' );

    const beforeHide = await page.evaluate( () => molecularSnapshot() );
    await page.getByRole( 'button', { name: 'Hide GUI', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => !testView.guiNode.visible && !phet.joist.sim.navigationBar.visible );
    nodeAssert.equal( await page.getByRole( 'button', { name: 'Show GUI', exact: true } ).count(), 1 );
    nodeAssert.equal( await page.getByRole( 'checkbox', { name: 'Lock axes to molecule', exact: true } ).count(), 0 );
    await page.screenshot( { path: path.join( outputDir, 'gui-hidden.png' ) } );
    await page.mouse.move( 900, 650 ); await page.mouse.down(); await page.mouse.move( 970, 590, { steps: 8 } ); await page.mouse.up();
    nodeAssert.equal( await page.evaluate( () => molecularSnapshot() ), beforeHide );
    await page.getByRole( 'button', { name: 'Show GUI', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => testView.guiNode.visible && phet.joist.sim.navigationBar.visible );
    nodeAssert.equal( await page.getByRole( 'checkbox', { name: 'Lock axes to molecule', exact: true } ).count(), 1 );
    nodeAssert.equal( await page.evaluate( () => testView.cartesianCoordinatesPanel.lockAxesProperty.value ), true );
    console.log( 'PASS Hide/Show GUI: panels, accessible controls, and navigation hide together; recovery and molecule interaction work' );

    const fallback = await browser.newPage( { viewport: { width: 1000, height: 700 } } );
    fallback.on( 'pageerror', error => errors.push( error.message ) );
    await fallback.goto( `${baseURL}${simPath}?brand=cerium&ea&webgl=false&screens=1` );
    await fallback.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value );
    await fallback.evaluate( () => {
      const screen = phet.joist.sim.simScreens[ 0 ];
      screen.view.cartesianCoordinatesPanel.showProperty.value = true;
      screen.view.cartesianCoordinatesPanel.planeProperty.value = 'YZ';
      screen.view.cartesianCoordinatesPanel.modeProperty.value = 'orbit';
      screen.view.cartesianFrame.rotate( new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.4, 0.8, 0 ) ), screen.model.moleculeQuaternionProperty.value );
      screen.view.step( 0 );
    } );
    await fallback.screenshot( { path: path.join( outputDir, 'canvas-fallback.png' ) } );
    await fallback.close();
    nodeAssert.deepEqual( errors, [] );
    console.log( 'PASS Canvas fallback and zero browser JavaScript errors' );
  }
  catch( error ) {
    await page.screenshot( { path: path.join( outputDir, 'failure.png' ) } ).catch( () => {} );
    throw error;
  }
  finally { await browser.close(); }
} )().catch( error => { console.error( error ); process.exitCode = 1; } );
