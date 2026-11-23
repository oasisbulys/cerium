/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only regression tests. */
/** @author Cartesian-coordinate extension contributors */
'use strict';
// SPDX-License-Identifier: GPL-3.0-only
const nodeAssert = require( 'node:assert/strict' );
const path = require( 'node:path' );
const fs = require( 'node:fs' );
const { chromium } = require( process.env.PLAYWRIGHT_MODULE_PATH || '../../perennial-alias/node_modules/playwright' );
const options = { headless: true, args: [ '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader' ] };
if ( process.env.BROWSER_EXECUTABLE ) { options.executablePath = process.env.BROWSER_EXECUTABLE; }
const baseURL = process.env.SIM_BASE_URL || 'http://localhost:8080';
const simPath = process.env.SIM_PATH || '/molecule-shapes/molecule-shapes_en.html';
const outputDir = process.env.TEST_OUTPUT_DIR || path.join( __dirname, 'artifacts' );

( async () => {
  const browser = await chromium.launch( options );
  const errors = [];
  fs.mkdirSync( outputDir, { recursive: true } );
  try {
    const page = await browser.newPage( { viewport: { width: 1400, height: 900 } } );
    page.on( 'pageerror', error => errors.push( error.message ) );
    await page.goto( `${baseURL}${simPath}?brand=cerium&ea` );
    await page.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value );
    await page.evaluate( () => {
      const sim = phet.joist.sim; sim.selectedScreenProperty.value = sim.simScreens[ 0 ];
      sim.simScreens.forEach( screen => { screen.model.step = () => {}; } );
      window.testView = sim.simScreens[ 0 ].view; window.testModel = sim.simScreens[ 0 ].model;
      const example = testModel.moleculeProperty.value;
      const Pair = example.centralAtom.constructor; const Vector = example.centralAtom.positionProperty.value.constructor;
      const Configuration = example.getCentralVSEPRConfiguration().constructor;
      testView.makeReferenceMolecule = ( x, e, reset = true ) => {
        const molecule = new example.constructor(); molecule.addCentralAtom( new Pair( new Vector( 0, 0, 0 ), false ) );
        const rotation = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.6, -0.7, 1.1 ) );
        Configuration.getConfiguration( x, e ).allOrientations.forEach( ( direction, i ) => {
          const point = new THREE.Vector3().copy( direction ).applyQuaternion( rotation ).multiplyScalar( i < e ? 7 : 10 );
          molecule.addGroupAndBond( new Pair( new Vector( point.x, point.y, point.z ), i < e ), molecule.centralAtom, i < e ? 0 : 1 );
        } );
        testModel.moleculeProperty.value = molecule;
        if ( reset ) { testView.resetOrientation(); }
        testView.step( 0 );
      };
      testView.checkReference = ( view, model ) => {
        const molecule = model.moleculeProperty.value; const panel = view.cartesianCoordinatesPanel;
        const frame = view.cartesianFrame; const diagram = panel.textbookDiagram;
        const snapshot = () => JSON.stringify( molecule.groups.map( g => [ g.positionProperty.value.x, g.positionProperty.value.y, g.positionProperty.value.z,
          g.velocityProperty.value.x, g.velocityProperty.value.y, g.velocityProperty.value.z ] ) );
        const before = snapshot(); view.step( 0 );
        let error = 0; let rolesCorrect = true; let typesCorrect = true;
        diagram.entries.forEach( entry => {
          const group = molecule.radialGroups.find( candidate => candidate.id === entry.groupId );
          const actual = frame.getCoordinates( group.positionProperty.value, molecule.centralAtom.positionProperty.value,
            model.moleculeQuaternionProperty.value ).normalize();
          error = Math.max( error, actual.distanceTo( entry.direction ) );
          const depth = actual[ diagram.reference.depthAxis ] * diagram.reference.depthSign;
          rolesCorrect = rolesCorrect && ( entry.role === 'plane' ? Math.abs( depth ) < 1e-6 : entry.role === 'toward' ? depth > 0 : depth < 0 );
          typesCorrect = typesCorrect && ( entry.lonePair === group.isLonePair ) && ( entry.slot < molecule.radialLonePairs.length ) === group.isLonePair;
        } );
        const projected = molecule.radialAtoms.map( group => new THREE.Vector3().copy( group.positionProperty.value )
          .applyQuaternion( view.moleculeView.quaternion ).project( view.threeCamera ) );
        let separation = Infinity;
        projected.forEach( ( a, i ) => projected.slice( i + 1 ).forEach( b => {
          separation = Math.min( separation, Math.hypot( ( a.x - b.x ) * view.screenWidth / 2, ( a.y - b.y ) * view.screenHeight / 2 ) );
        } ) );
        const pairProjections = molecule.radialLonePairs.map( pair => {
          const pairView = view.moleculeView.lonePairViews.find( candidate => candidate.group === pair );
          return pairView.localToWorld( new THREE.Vector3( 0, 5, 0 ) ).project( view.threeCamera );
        } );
        let pairSeparation = Infinity;
        pairProjections.forEach( ( a, i ) => pairProjections.slice( i + 1 ).forEach( b => {
          pairSeparation = Math.min( pairSeparation, Math.hypot( ( a.x - b.x ) * view.screenWidth / 2, ( a.y - b.y ) * view.screenHeight / 2 ) );
        } ) );
        const cameraInverse = frame.orbitQuaternion.clone().inverse();
        const spherePoints = [ new THREE.Vector3(), ...molecule.radialAtoms.map( group => new THREE.Vector3().copy( group.positionProperty.value )
          .applyQuaternion( view.moleculeView.quaternion ) ) ];
        const sphereRadii = spherePoints.map( point => 2 / -point.clone().sub( view.threeCamera.position ).applyQuaternion( cameraInverse ).z *
          view.threeCamera.projectionMatrix.elements[ 5 ] );
        const sphereProjections = spherePoints.map( point => point.project( view.threeCamera ) );
        let clearance = Infinity;
        sphereProjections.forEach( ( a, i ) => sphereProjections.slice( i + 1 ).forEach( ( b, k ) => {
          clearance = Math.min( clearance, Math.hypot( ( a.x - b.x ) * view.threeCamera.aspect, a.y - b.y ) - sphereRadii[ i ] - sphereRadii[ i + k + 1 ] );
        } ) );
        const captionsCorrect = diagram.entries.every( entry => {
          const labels = entry.lonePair ? view.cartesianCoordinatesView.bookLonePairLabels : view.cartesianCoordinatesView.bookAtomLabels;
          const label = labels[ Number( entry.id.slice( entry.lonePair ? 2 : 1 ) ) - 1 ];
          return label.visible && label.userData.role === entry.role && label.userData.caption ===
            { plane: 'in page', toward: 'out of page', away: 'behind page' }[ entry.role ];
        } );
        const centerProjection = new THREE.Vector3().project( view.threeCamera );
        const upProjection = new THREE.Vector3( 0, diagram.reference.page === 'XY' ? 10 : 0,
          diagram.reference.page === 'XZ' ? 10 : 0 ).project( view.threeCamera );
        const upSlope = Math.abs( ( upProjection.x - centerProjection.x ) * view.threeCamera.aspect / ( upProjection.y - centerProjection.y ) );
        const texts = diagram.children.filter( child => typeof child.string === 'string' );
        let overlaps = 0; const overlapPairs = [];
        texts.forEach( ( a, i ) => texts.slice( i + 1 ).forEach( b => { if ( a.bounds.intersectsBounds( b.bounds ) ) { overlaps++; overlapPairs.push( [ a.string, b.string ] ); } } ) );
        return { x: molecule.radialAtoms.length, e: molecule.radialLonePairs.length, visible: diagram.visible, error: error,
          captionsCorrect: captionsCorrect, upSlope: upSlope, rolesCorrect: rolesCorrect, typesCorrect: typesCorrect, preserved: before === snapshot(), overlaps: overlaps, overlapPairs: overlapPairs,
          ids: diagram.atomLabels.map( text => text.string ).sort(), pairs: diagram.entries.filter( entry => entry.lonePair ).length,
          pairIds: diagram.entries.filter( entry => entry.lonePair ).map( entry => entry.id ).sort(),
          page: diagram.reference.page, from: diagram.reference.from, up: diagram.reference.up,
          bestViewError: 1 - Math.abs( frame.orbitQuaternion.dot( view.homeOrbitQuaternion ) ), pairSeparation: pairSeparation, separation: separation, clearance: clearance,
          panelBottom: panel.bottom, screenBottom: view.layoutBounds.maxY, namePanelTop: view.geometryNamePanel.top };
      };
    } );
    const cases = await page.evaluate( () => {
      const results = [];
      for ( let x = 0; x <= 6; x++ ) {
        for ( let e = 0; x + e <= 6; e++ ) {
          testView.makeReferenceMolecule( x, e ); results.push( testView.checkReference( testView, testModel ) );
        }
      }
      return results;
    } );
    fs.writeFileSync( path.join( outputDir, 'textbook-references.json' ), JSON.stringify( cases, null, 2 ) );
    nodeAssert.equal( cases.length, 28 );
    cases.forEach( entry => {
      const context = `AX${entry.x}E${entry.e}: ${JSON.stringify( entry )}`;
      nodeAssert.ok( entry.visible && entry.preserved && entry.typesCorrect && entry.rolesCorrect && entry.captionsCorrect, context );
      nodeAssert.ok( entry.error < 1e-6 && entry.bestViewError < 1e-12 && entry.upSlope < 0.07, context );
      nodeAssert.deepEqual( entry.ids, Array.from( { length: entry.x }, ( _, i ) => `A${i + 1}` ), context );
      nodeAssert.equal( entry.pairs, entry.e, context );
      nodeAssert.deepEqual( entry.pairIds, Array.from( { length: entry.e }, ( _, i ) => `LP${i + 1}` ), context );
      nodeAssert.equal( entry.overlaps, 0, context );
      if ( ( entry.x === 3 && entry.e >= 2 ) || ( entry.x === 2 && entry.e === 2 ) ) {
        nodeAssert.ok( entry.pairSeparation > 50, `Lone-pair electrons must stay separately visible at home: ${context}` );
      }
      nodeAssert.ok( entry.panelBottom + 5 < entry.namePanelTop, context );
      if ( entry.x > 1 ) {
        nodeAssert.ok( entry.separation > 50 && entry.clearance > 0, `Atoms must remain separately visible at home: ${context}` );
      }
    } );
    console.log( 'PASS 28 reference diagrams: atom IDs, lone pairs, page/depth signs, best-view defaults, no label overlap, visible atoms, model state preserved' );

    const transitions = await page.evaluate( () => {
      const qDistance = ( a, b ) => 2 * Math.acos( Math.min( 1, Math.abs( a.dot( b ) ) ) );
      let maximumTurn = 0; let maximumJump = 0; let finalError = 0;
      for ( const [ x, e ] of [ [ 3, 0 ], [ 4, 0 ], [ 5, 0 ], [ 6, 0 ], [ 4, 2 ] ] ) {
        let previous = testView.cartesianFrame.orbitQuaternion.clone();
        testView.makeReferenceMolecule( x, e, false );
        maximumJump = Math.max( maximumJump, qDistance( previous, testView.cartesianFrame.orbitQuaternion ) );
        for ( let step = 0; step < 300; step++ ) {
          testView.updateMoleculeOrientation( false, 1 / 60 );
          const current = testView.cartesianFrame.orbitQuaternion;
          maximumTurn = Math.max( maximumTurn, qDistance( previous, current ) ); previous = current.clone();
        }
        finalError = Math.max( finalError, qDistance( previous, testView.homeOrbitQuaternion ) );
      }
      return { maximumTurn: maximumTurn, maximumJump: maximumJump, finalError: finalError };
    } );
    nodeAssert.ok( transitions.maximumJump < 1e-7 && transitions.maximumTurn <= Math.PI / 60 + 1e-7 && transitions.finalError < 1e-7 );
    console.log( 'PASS geometry changes smoothly restore the recommended camera with no immediate jump and at most 3 degrees per 60 Hz frame' );

    await page.evaluate( () => {
      testView.makeReferenceMolecule( 3, 0 ); testView.makeReferenceMolecule( 6, 0, false );
    } );
    await page.mouse.move( 950, 650 ); await page.mouse.down();
    await page.mouse.move( 1000, 600, { steps: 6 } ); await page.mouse.up();
    const gesture = await page.evaluate( () => {
      const before = testView.cartesianFrame.orbitQuaternion.clone();
      const pending = testView.bookCameraPending;
      for ( let i = 0; i < 180; i++ ) { testView.updateMoleculeOrientation( false, 1 / 60 ); }
      return { pending: pending, retained: before.equals( testView.cartesianFrame.orbitQuaternion ) };
    } );
    nodeAssert.ok( !gesture.pending && gesture.retained, 'Orbiting cancels automatic camera alignment without pulling back after release' );

    // Orbiting retains reference identities, and orientation reset restores the recommended camera.
    await page.evaluate( () => testView.makeReferenceMolecule( 4, 0 ) );
    const orbit = await page.evaluate( () => {
      const diagram = testView.cartesianCoordinatesPanel.textbookDiagram;
      const before = JSON.stringify( diagram.entries );
      testView.cartesianFrame.orbitQuaternion.setFromEuler( new THREE.Euler( 0.7, 0.8, 0.2 ) ); testView.step( 0 );
      const retained = before === JSON.stringify( diagram.entries );
      testView.resetOrientation(); testView.step( 0 );
      return { retained: retained, ...testView.checkReference( testView, testModel ) };
    } );
    nodeAssert.ok( orbit.retained && orbit.bestViewError < 1e-12 );
    await page.screenshot( { path: path.join( outputDir, 'textbook-guide.png' ) } );
    for ( const [ name, x, e ] of [ [ 'planar', 3, 0 ], [ 'bent', 2, 2 ], [ 'pyramidal', 3, 1 ],
      [ 'bipyramidal', 5, 0 ], [ 'seesaw', 4, 1 ], [ 't-shaped', 3, 2 ], [ 't-shaped-three-lone-pairs', 3, 3 ], [ 'square-planar', 4, 2 ], [ 'square-pyramidal', 5, 1 ], [ 'octahedral', 6, 0 ] ] ) {
      await page.evaluate( ( [ x, e ] ) => testView.makeReferenceMolecule( x, e ), [ x, e ] );
      await page.screenshot( { path: path.join( outputDir, `reference-${name}.png` ) } );
    }

    await page.evaluate( () => testView.makeReferenceMolecule( 3, 1 ) );
    const hiddenPairs = await page.evaluate( () => {
      testModel.showLonePairsProperty.value = false; testView.step( 0 );
      const hidden = testView.cartesianCoordinatesView.bookLonePairLabels.every( label => !label.visible ) &&
        testView.cartesianCoordinatesView.lonePairLabels.every( label => !label.visible );
      testModel.showLonePairsProperty.value = true; testView.step( 0 );
      return hidden;
    } );
    nodeAssert.ok( hiddenPairs, 'Show Lone Pairs also controls the new cloud labels' );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space' );
    await page.getByRole( 'checkbox', { name: 'Drag atoms and lone pairs', exact: true } ).press( 'Space' );
    const pairStart = await page.evaluate( () => {
      const pair = testModel.moleculeProperty.value.radialLonePairs[ 0 ];
      const pairView = testView.moleculeView.lonePairViews.find( candidate => candidate.group === pair );
      const ndc = pairView.localToWorld( new THREE.Vector3( 0, 4.2, 0 ) ).project( testView.threeCamera );
      const point = { x: ( ndc.x + 1 ) * testView.screenWidth / 2, y: ( 1 - ndc.y ) * testView.screenHeight / 2 };
      return { point: point, hit: testView.getElectronPairUnderPointer( { point: point }, false ) === pair };
    } );
    nodeAssert.ok( pairStart.hit, 'The labelled LP1 cloud is pickable' );
    await page.mouse.move( pairStart.point.x, pairStart.point.y ); await page.mouse.down();
    await page.mouse.move( pairStart.point.x + 65, pairStart.point.y + 15, { steps: 8 } );
    const repulsion = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value; const pair = molecule.radialLonePairs[ 0 ];
      const before = molecule.radialAtoms.map( atom => atom.positionProperty.value.copy() );
      const atom = molecule.radialAtoms[ 0 ];
      const impulse = atom.getRepulsionImpulse( pair, 1 / 60, 1 );
      const awayImpulse = impulse.dot( atom.positionProperty.value.minus( pair.positionProperty.value ) );
      for ( let step = 0; step < 40; step++ ) { molecule.update( 1 / 60 ); testView.step( 0 ); }
      return { controlled: pair.userControlledProperty.value, awayImpulse: awayImpulse,
        movement: Math.max( ...molecule.radialAtoms.map( ( atom, i ) => atom.positionProperty.value.distance( before[ i ] ) ) ) };
    } );
    nodeAssert.ok( repulsion.controlled && repulsion.awayImpulse > 0 && repulsion.movement > 0.01,
      `Dragging a held lone pair must repel its neighbors: ${JSON.stringify( repulsion )}` );
    await page.mouse.up();
    const relaxedPair = await page.evaluate( () => {
      const molecule = testModel.moleculeProperty.value;
      for ( let step = 0; step < 360; step++ ) { molecule.update( 1 / 60 ); testView.step( 0 ); }
      const directions = molecule.radialGroups.map( group => group.positionProperty.value.normalized() );
      let error = 0;
      directions.forEach( ( a, i ) => directions.slice( i + 1 ).forEach( b => { error = Math.max( error, Math.abs( a.dot( b ) + 1 / 3 ) ); } ) );
      return { error: error, controlled: molecule.radialGroups.some( group => group.userControlledProperty.value ) };
    } );
    nodeAssert.ok( !relaxedPair.controlled && relaxedPair.error < 1e-5 );
    await page.getByRole( 'checkbox', { name: 'Drag atoms and lone pairs', exact: true } ).press( 'Space' );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space' );
    console.log( 'PASS named LP cloud picking/dragging, outward repulsion impulse, neighboring atom motion, release/relaxation, and cloud-label visibility' );

    const real = await page.evaluate( () => {
      const sim = phet.joist.sim; const screen = sim.simScreens[ 1 ]; sim.selectedScreenProperty.value = screen;
      const view = screen.view; const model = screen.model; const results = [];
      model.realMoleculeShapeProperty.validValues.forEach( shape => {
        model.realMoleculeShapeProperty.value = shape;
        for ( const real of [ true, false ] ) {
          model.showRealViewProperty.value = real; view.resetOrientation(); view.step( 0 );
          const result = testView.checkReference( view, model );
          results.push( { ...result, real: real, name: shape.displayName } );
        }
      } );
      sim.selectedScreenProperty.value = sim.simScreens[ 0 ];
      return results;
    } );
    nodeAssert.equal( real.length, 26 );
    real.forEach( entry => {
      nodeAssert.ok( entry.visible && entry.preserved && entry.typesCorrect );
      nodeAssert.equal( entry.ids.length, entry.x ); nodeAssert.equal( entry.pairs, entry.e );
      if ( !entry.real ) { nodeAssert.ok( entry.rolesCorrect && entry.error < 1e-6 ); }
      // Measured real molecules may differ from their ideal reference; their actual coordinates remain in the table.
    } );
    await page.evaluate( () => testView.makeReferenceMolecule( 4, 0 ) );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space' );
    await page.waitForFunction( () => !testView.cartesianCoordinatesPanel.textbookDiagram.visible );
    await page.getByRole( 'checkbox', { name: 'Lock textbook orientation', exact: true } ).press( 'Space' );
    await page.waitForFunction( () => testView.cartesianCoordinatesPanel.textbookDiagram.visible );
    nodeAssert.deepEqual( errors, [] );
    console.log( 'PASS all 13 real presets in real/model views, camera orbit/reset, textbook toggle visibility, and zero browser errors' );
  }
  finally { await browser.close(); }
} )().catch( error => { console.error( error ); process.exitCode = 1; } );
