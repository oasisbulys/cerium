/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only integration tests. */
/** @author Cartesian-coordinate extension contributors */
'use strict';
// SPDX-License-Identifier: GPL-3.0-only
const nodeAssert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { chromium } = require( process.env.PLAYWRIGHT_MODULE_PATH || '../../perennial-alias/node_modules/playwright' );
const baseURL = process.env.SIM_BASE_URL || 'http://localhost:8080';
const simPath = process.env.SIM_PATH || '/molecule-shapes/molecule-shapes_en.html';
const outputDir = process.env.TEST_OUTPUT_DIR || path.join( __dirname, 'artifacts' );
fs.mkdirSync( outputDir, { recursive: true } );
const options = { headless: true, args: [ '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader' ] };
if ( process.env.BROWSER_EXECUTABLE ) { options.executablePath = process.env.BROWSER_EXECUTABLE; }
const near = ( a, b, tolerance = 1e-5 ) => a.forEach( ( v, i ) => nodeAssert.ok( Math.abs( v - b[ i ] ) < tolerance, `${a} != ${b}` ) );
( async () => {
  const browser = await chromium.launch( options );
  const page = await browser.newPage( { viewport: { width: 1400, height: 900 } } );
  const errors = [];
  page.on( 'pageerror', error => { errors.push( error.message ); console.error( error.message ); } );
  try {
    await page.goto( `${baseURL}${simPath}?brand=cerium&ea` );
    await page.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value );
    await page.evaluate( () => {
      const sim = phet.joist.sim;
      sim.selectedScreenProperty.value = sim.simScreens[ 0 ];
      window.testView = sim.simScreens[ 0 ].view;
      window.testModel = sim.simScreens[ 0 ].model;
      testModel.step = () => {};
      window.molecularSnapshot = () => JSON.stringify( testModel.moleculeProperty.value.groups.map( group => [ group.positionProperty.value.x,
        group.positionProperty.value.y, group.positionProperty.value.z, group.velocityProperty.value.x,
        group.velocityProperty.value.y, group.velocityProperty.value.z, group.isLonePair ] ) );
      const old = testModel.moleculeProperty.value;
      const PairGroup = old.centralAtom.constructor;
      const Vector3 = old.centralAtom.positionProperty.value.constructor;
      const molecule = new old.constructor();
      molecule.addCentralAtom( new PairGroup( new Vector3( 0, 0, 0 ), false ) );
      [ [ 10, 0, 0 ], [ -10, 0, 0 ], [ 0, 10, 0 ], [ 0, -10, 0 ], [ 0, 0, 10 ], [ 0, 0, -10 ] ].forEach( p =>
        molecule.addGroupAndBond( new PairGroup( new Vector3( ...p ), false ), molecule.centralAtom, 1 ) );
      testModel.moleculeProperty.value = molecule;
      testView.resetOrientation();
    } );
    const initial = await page.evaluate( () => ( { snapshot: molecularSnapshot(), camera: testView.cartesianFrame.orbitQuaternion.toArray(),
      mode: testView.cartesianCoordinatesPanel.modeProperty.value, lock: testView.cartesianCoordinatesPanel.lockAxesProperty.value } ) );
    await page.getByRole( 'checkbox', { name: 'Lab environment', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => testView.labEnvironment.ready || testView.labEnvironment.error, null, { timeout: 60000 } );
    const loaded = await page.evaluate( () => ( { error: testView.labEnvironment.error, textures: testView.labEnvironment.modelData?.imageSizes,
      mode: testView.cartesianFrame.rotationMode, local: testView.cartesianFrame.usesMolecularFrame,
      axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(), snapshot: molecularSnapshot(),
      visible: testView.labLearningPanel.visible, room: testView.labEnvironment.visible } ) );
    nodeAssert.equal( loaded.error, null ); nodeAssert.equal( loaded.textures.length, 11 );
    nodeAssert.equal( loaded.textures.filter( size => size[ 0 ] === 2048 ).length, 4 );
    nodeAssert.equal( loaded.mode, 'orbit' ); nodeAssert.equal( loaded.local, false );
    near( loaded.axes, [ -Math.SQRT1_2, 0, 0, Math.SQRT1_2 ] ); nodeAssert.equal( loaded.snapshot, initial.snapshot ); nodeAssert.ok( loaded.visible && loaded.room );
    await page.screenshot( { path: path.join( outputDir, 'lab-home.png' ) } );
    console.log( 'PASS full-resolution lab loading, original 11 images, fixed room axes, and preserved molecule state' );

    const lighting = await page.evaluate( () => {
      const view = testView; const renderer = view.threeRenderer; const environment = view.labEnvironment;
      const normals = [];
      environment.modelData.root.traverse( object => {
        if ( object instanceof THREE.Mesh ) { normals.push( object.geometry.attributes.normal?.array.length > 0 && object.castShadow && object.receiveShadow ); }
      } );
      const target = new THREE.WebGLRenderTarget( 64, 64, { format: THREE.RGBAFormat, minFilter: THREE.LinearFilter } );
      const lights = [];
      environment.traverse( object => { if ( object instanceof THREE.Light ) { lights.push( object ); } } );
      const brightness = () => {
        renderer.render( view.labScene, view.threeCamera, target );
        const pixels = new Uint8Array( 64 * 64 * 4 );
        renderer.readRenderTargetPixels( target, 0, 0, 64, 64, pixels );
        return pixels.reduce( ( sum, value, index ) => sum + ( index % 4 === 3 ? 0 : value ), 0 );
      };
      let lit; let unlit;
      try {
        renderer.shadowMapEnabled = true;
        lit = brightness();
        lights.forEach( light => { light.visible = false; } );
        unlit = brightness();
      }
      finally {
        lights.forEach( light => { light.visible = true; } );
        renderer.shadowMapEnabled = false;
        renderer.setRenderTarget( null ); target.dispose(); view.render();
      }
      return { lit: lit, unlit: unlit, normals: normals,
        phong: environment.modelData.materials.every( material => material instanceof THREE.MeshPhongMaterial ),
        shadowSizes: environment.ceilingLights.map( light => [ light.shadowMap.width, light.shadowMap.height ] ),
        labels: view.cartesianCoordinatesView.roomAxisLabels.every( label => label.visible ),
        snapshot: molecularSnapshot() };
    } );
    nodeAssert.ok( lighting.phong && lighting.normals.length === 29 && lighting.normals.every( Boolean ) );
    nodeAssert.ok( lighting.lit > lighting.unlit * 1.5, 'the room responds to lighting rather than emitting unlit color' );
    nodeAssert.deepEqual( lighting.shadowSizes, [ [ 2048, 2048 ], [ 2048, 2048 ] ] );
    nodeAssert.ok( lighting.labels ); nodeAssert.equal( lighting.snapshot, initial.snapshot );
    nodeAssert.ok( await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).isChecked() );
    nodeAssert.equal( await page.getByRole( 'checkbox', { name: 'Drag atoms and lone pairs', exact: true } ).count(), 0 );
    console.log( 'PASS source surface normals, lit materials, two soft-shadow maps, and room-direction axis labels' );

    const beforeOrbit = await page.evaluate( () => ( { camera: testView.threeCamera.position.toArray(), q: testModel.moleculeQuaternionProperty.value.toArray(),
      rows: testView.cartesianCoordinatesPanel.rows.map( row => row.string ) } ) );
    await page.mouse.move( 1020, 630 ); await page.mouse.down(); await page.mouse.move( 1080, 580, { steps: 8 } ); await page.mouse.up();
    await page.waitForTimeout( 100 );
    const orbit = await page.evaluate( () => ( { camera: testView.threeCamera.position.toArray(), q: testModel.moleculeQuaternionProperty.value.toArray(),
      rows: testView.cartesianCoordinatesPanel.rows.map( row => row.string ), axes: testView.cartesianCoordinatesView.axes.quaternion.toArray(),
      up: new THREE.Vector3( 0, 1, 0 ).applyQuaternion( testView.threeCamera.quaternion ).y,
      roomUp: new THREE.Vector3( 0, 0, 1 ).applyQuaternion( testView.cartesianCoordinatesView.axes.quaternion ).y } ) );
    nodeAssert.notDeepEqual( orbit.camera, beforeOrbit.camera ); near( orbit.q, beforeOrbit.q );
    nodeAssert.deepEqual( orbit.rows, beforeOrbit.rows ); near( orbit.axes, [ -Math.SQRT1_2, 0, 0, Math.SQRT1_2 ] );
    nodeAssert.ok( orbit.up > 0.7 && orbit.roomUp > 0.99 );
    console.log( 'PASS room camera orbit keeps a stable horizon and room-relative coordinates' );

    for ( const name of [ 'Front', 'Side', 'Above', 'Home' ] ) {
      await page.getByRole( 'button', { name: `Lab ${name.toLowerCase()} view`, exact: true } ).press( 'Space', { delay: 100 } );
      await page.waitForTimeout( 50 );
      nodeAssert.equal( await page.evaluate( () => molecularSnapshot() ), initial.snapshot );
    }
    await page.getByRole( 'button', { name: 'Inspect next atom', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => testView.labLearningPanel.selectedAtomProperty.value === 1 );
    const descriptions = await page.evaluate( () => {
      testView.labLearningPanel.selectedAtomProperty.value = 3;
      testView.step( 0 );
      return { text: testView.labLearningPanel.rows.map( row => row.string ), point: testView.roomPositionGuides.point.toArray(),
        guideEnds: testView.roomPositionGuides.paths[ 1 ].geometry.vertices[ 0 ].toArray(), foot: testView.roomPositionGuides.foot.position.toArray() };
    } );
    nodeAssert.ok( descriptions.text[ 2 ].includes( 'below' ) ); near( descriptions.point, [ 0, -10, 0 ] ); near( descriptions.foot, [ 0, 0, 0 ] );
    nodeAssert.equal( descriptions.guideEnds[ 1 ], 0 );
    await page.screenshot( { path: path.join( outputDir, 'lab-below-plane.png' ) } );
    console.log( 'PASS selecting atoms, plain-language below/above directions, Z-up coordinates, and correct XY height projections' );

    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'radio', { name: 'Molecule-only rotation', exact: true } ).press( 'Space', { delay: 100 } );
    const roomBeforeRotation = await page.evaluate( () => ( { matrix: testView.labEnvironment.modelData.root.matrixWorld.toArray(), camera: testView.threeCamera.position.toArray() } ) );
    await page.mouse.move( 1020, 630 ); await page.mouse.down(); await page.mouse.move( 1085, 580, { steps: 8 } ); await page.mouse.up();
    await page.waitForTimeout( 100 );
    const rotation = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      const atom = molecule.radialAtoms[ testView.labLearningPanel.selectedAtomProperty.value ];
      const world = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) );
      return { matrix: testView.labEnvironment.modelData.root.matrixWorld.toArray(), camera: testView.threeCamera.position.toArray(),
        point: testView.roomPositionGuides.point.toArray(), world: world.toArray(), snapshot: molecularSnapshot() };
    } );
    near( rotation.matrix, roomBeforeRotation.matrix ); near( rotation.camera, roomBeforeRotation.camera ); near( rotation.point, rotation.world );
    nodeAssert.equal( rotation.snapshot, initial.snapshot );
    await page.getByRole( 'checkbox', { name: 'Show atom position guides', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => !testView.roomPositionGuides.visible );
    await page.getByRole( 'checkbox', { name: 'Show atom position guides', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'checkbox', { name: 'Show all atom coordinates', exact: true } ).press( 'Space', { delay: 100 } );
    nodeAssert.equal( await page.getByRole( 'checkbox', { name: 'Lock axes to molecule', exact: true } ).count(), 0 );
    console.log( 'PASS molecule-only rotation leaves the lab fixed and all room guides match rendered atom positions' );

    await page.getByRole( 'button', { name: 'Hide GUI', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => !testView.guiNode.visible );
    await page.screenshot( { path: path.join( outputDir, 'lab-clean.png' ) } );
    await page.getByRole( 'button', { name: 'Show GUI', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'checkbox', { name: 'Lab environment', exact: true } ).press( 'Space', { delay: 100 } );
    const studio = await page.evaluate( () => ( { room: testView.labEnvironment.visible, panel: testView.labLearningPanel.visible,
      camera: testView.cartesianFrame.orbitQuaternion.toArray(), mode: testView.cartesianCoordinatesPanel.modeProperty.value,
      lock: testView.cartesianCoordinatesPanel.lockAxesProperty.value, snapshot: molecularSnapshot() } ) );
    nodeAssert.equal( studio.room, false ); nodeAssert.equal( studio.panel, false ); near( studio.camera, initial.camera );
    nodeAssert.equal( studio.mode, initial.mode ); nodeAssert.equal( studio.lock, initial.lock ); nodeAssert.equal( studio.snapshot, initial.snapshot );
    console.log( 'PASS lab Hide/Show GUI, studio state restoration, and no browser JavaScript errors' );
    // Re-entering reuses renderer-local textures rather than allocating them on each toggle.
    const repeated = await page.evaluate( () => {
      const textures = testView.labEnvironment.modelData.textures;
      for ( let i = 0; i < 6; i++ ) {
        testView.cartesianCoordinatesPanel.labProperty.value = true;
        testView.cartesianCoordinatesPanel.labProperty.value = false;
      }
      return textures === testView.labEnvironment.modelData.textures;
    } );
    nodeAssert.ok( repeated );
    await page.getByRole( 'checkbox', { name: 'Lab environment', exact: true } ).press( 'Space', { delay: 100 } );
    await page.getByRole( 'checkbox', { name: 'Drag atoms and lone pairs', exact: true } ).press( 'Space', { delay: 100 } );
    const dragPoint = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      for ( const atom of molecule.radialAtoms ) {
        const ndc = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) ).project( testView.threeCamera );
        const point = { x: ( ndc.x + 1 ) * testView.screenWidth / 2, y: ( 1 - ndc.y ) * testView.screenHeight / 2 };
        if ( point.x > 380 && point.x < 1050 && point.y > 170 && point.y < 560 && testView.getElectronPairUnderPointer( { point: point }, false ) === atom ) {
          return { ...point, index: molecule.radialAtoms.indexOf( atom ) };
        }
      }
      return null;
    } );
    nodeAssert.ok( dragPoint );
    const beforeBend = await page.evaluate( () => molecularSnapshot() );
    await page.mouse.move( dragPoint.x, dragPoint.y ); await page.mouse.down();
    await page.mouse.move( dragPoint.x + 35, dragPoint.y + 30, { steps: 8 } ); await page.mouse.up();
    await page.waitForTimeout( 100 );
    nodeAssert.notEqual( await page.evaluate( () => molecularSnapshot() ), beforeBend );
    nodeAssert.equal( await page.evaluate( () => testView.labLearningPanel.selectedAtomProperty.value ), dragPoint.index );
    const afterBend = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      for ( let i = 0; i < 120; i++ ) { molecule.update( 1 / 60 ); }
      testView.step( 0 );
      const atom = molecule.radialAtoms[ testView.labLearningPanel.selectedAtomProperty.value ];
      const expected = testView.moleculeView.localToWorld( new THREE.Vector3().copy( atom.positionProperty.value ) );
      return { point: testView.roomPositionGuides.point.toArray(), expected: expected.toArray(), axes: testView.cartesianCoordinatesView.axes.quaternion.toArray() };
    } );
    near( afterBend.point, afterBend.expected ); near( afterBend.axes, [ -Math.SQRT1_2, 0, 0, Math.SQRT1_2 ] );
    console.log( 'PASS original individual-atom deformation, click-to-inspect selection, relaxation, and stable world axes in the lab' );
    const beforeLock = await page.evaluate( () => molecularSnapshot() );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space', { delay: 100 } );
    await page.waitForFunction( () => Math.abs( testView.moleculeView.quaternion.dot( testView.cartesianFrame.molecularFrameQuaternion ) ) > 1 - 1e-10 );
    const relocked = await page.evaluate( () => ( { snapshot: molecularSnapshot(), view: testView.moleculeView.quaternion.toArray(),
      textbook: testView.cartesianFrame.molecularFrameQuaternion.toArray(), mode: testView.cartesianFrame.rotationMode,
      drag: testView.cartesianCoordinatesPanel.dragAtomsProperty.value } ) );
    nodeAssert.equal( relocked.snapshot, beforeLock ); near( relocked.view, relocked.textbook );
    nodeAssert.equal( relocked.mode, 'orbit' ); nodeAssert.equal( relocked.drag, false );
    console.log( 'PASS textbook orientation is locked by default, explicit unlocking enables manipulation, and re-locking realigns only the view' );

    const realResults = await page.evaluate( async () => {
      const sim = phet.joist.sim; const screen = sim.simScreens[ 1 ];
      screen.model.step = () => {};
      sim.selectedScreenProperty.value = screen;
      const view = screen.view; const model = screen.model;
      view.cartesianCoordinatesPanel.labProperty.value = true;
      await view.labEnvironment.loadingPromise;
      const results = [];
      model.realMoleculeShapeProperty.validValues.forEach( shape => {
        model.realMoleculeShapeProperty.value = shape;
        for ( const real of [ true, false ] ) {
          model.showRealViewProperty.value = real;
          const before = JSON.stringify( model.moleculeProperty.value.groups.map( group => [ group.positionProperty.value.x, group.positionProperty.value.y, group.positionProperty.value.z ] ) );
          view.step( 0 );
          results.push( before === JSON.stringify( model.moleculeProperty.value.groups.map( group => [ group.positionProperty.value.x, group.positionProperty.value.y, group.positionProperty.value.z ] ) ) &&
            view.labEnvironment.ready && !view.cartesianFrame.usesMolecularFrame && view.roomPositionGuides.point.toArray().every( Number.isFinite ) );
        }
      } );
      sim.selectedScreenProperty.value = sim.simScreens[ 0 ];
      testModel.moleculeProperty.value.removeAllGroups(); testView.step( 0 );
      return { results: results, emptyGuides: testView.roomPositionGuides.visible, emptyText: testView.labLearningPanel.atomName.string };
    } );
    nodeAssert.equal( realResults.results.length, 26 ); nodeAssert.ok( realResults.results.every( Boolean ) );
    nodeAssert.equal( realResults.emptyGuides, false ); nodeAssert.ok( realResults.emptyText.includes( 'Add an atom' ) );
    console.log( 'PASS both screens, all 13 real presets in real/model views, empty molecules, and repeat-toggle resource reuse' );

    await page.evaluate( () => { testView.cartesianCoordinatesPanel.labProperty.value = false; } );
    const fallback = await browser.newPage();
    fallback.on( 'pageerror', error => errors.push( error.message ) );
    await fallback.goto( `${baseURL}${simPath}?brand=cerium&screens=1&webgl=false&ea` );
    await fallback.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value, null, { timeout: 60000 } );
    nodeAssert.ok( await fallback.getByRole( 'checkbox', { name: 'Lab environment', exact: true } ).isDisabled() );
    await fallback.close();
    console.log( 'PASS Canvas fallback keeps the core simulation available with the WebGL lab control disabled' );

    nodeAssert.deepEqual( errors, [] );
  }
  catch( error ) {
    await page.screenshot( { path: path.join( outputDir, 'lab-failure.png' ) } ).catch( () => {} );
    throw error;
  }
  finally { await browser.close(); }
} )().catch( error => { console.error( error ); process.exitCode = 1; } );
