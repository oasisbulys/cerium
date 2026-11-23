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
  try {
    const page = await browser.newPage( { viewport: { width: 1400, height: 900 } } );
    page.on( 'pageerror', error => errors.push( error.message ) );
    await page.goto( `${baseURL}${simPath}?brand=cerium&screens=1&ea` );
    await page.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value );
    const stress = await page.evaluate( () => {
      const screen = phet.joist.sim.simScreens[ 0 ]; screen.model.step = () => {};
      window.testView = screen.view; window.testModel = screen.model;
      const old = testModel.moleculeProperty.value;
      const Pair = old.centralAtom.constructor; const Vector = old.centralAtom.positionProperty.value.constructor;
      let seed = 42;
      const random = () => { seed = ( 1664525 * seed + 1013904223 ) % 4294967296; return seed / 4294967296; };
      let maximumLateTurn = 0; let preserved = true; let cases = 0;
      for ( const [ x, e ] of [ [ 3, 0 ], [ 4, 0 ], [ 3, 1 ], [ 2, 2 ], [ 4, 1 ], [ 3, 2 ], [ 6, 0 ], [ 5, 1 ], [ 4, 2 ] ] ) {
        for ( let run = 0; run < 8; run++ ) {
          const molecule = new old.constructor(); molecule.addCentralAtom( new Pair( new Vector( 0, 0, 0 ), false ) );
          for ( let i = 0; i < x + e; i++ ) {
            const point = new Vector( random() * 2 - 1, random() * 2 - 1, random() * 2 - 1 ).normalized().times( i < e ? 7 : 10 );
            molecule.addGroupAndBond( new Pair( point, i < e ), molecule.centralAtom, i < e ? 0 : 1 );
          }
          const tracker = new testView.textbookOrientation.constructor(); let last = null;
          const snapshot = () => JSON.stringify( molecule.groups.map( g => [ g.positionProperty.value.x, g.positionProperty.value.y,
            g.positionProperty.value.z, g.velocityProperty.value.x, g.velocityProperty.value.y, g.velocityProperty.value.z ] ) );
          for ( let step = 0; step < 360; step++ ) {
            molecule.update( 1 / 60 );
            const before = snapshot(); tracker.update( molecule ); preserved = preserved && before === snapshot();
            const q = tracker.quaternion.clone();
            if ( last && step > 180 ) { maximumLateTurn = Math.max( maximumLateTurn, 2 * Math.acos( Math.min( 1, Math.abs( q.dot( last ) ) ) ) ); }
            last = q;
          }
          cases++;
        }
      }
      return { cases: cases, maximumLateTurn: maximumLateTurn, preserved: preserved };
    } );
    nodeAssert.equal( stress.cases, 72 ); nodeAssert.ok( stress.preserved );
    nodeAssert.ok( stress.maximumLateTurn < 1e-5, `Settled frame jitter: ${stress.maximumLateTurn}` );
    console.log( 'PASS 72 seeded VSEPR relaxation cases: no settled frame flips; alignment never writes model state' );

    const transition = await page.evaluate( () => {
      const view = testView; const model = testModel; const old = model.moleculeProperty.value;
      const Pair = old.centralAtom.constructor; const Vector = old.centralAtom.positionProperty.value.constructor;
      const Configuration = old.getCentralVSEPRConfiguration().constructor;
      const qDistance = ( a, b ) => 2 * Math.acos( Math.min( 1, Math.abs( a.dot( b ) ) ) );
      const make = ( x, e ) => {
        const molecule = new old.constructor(); molecule.addCentralAtom( new Pair( new Vector( 0, 0, 0 ), false ) );
        const offset = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.8, -0.6, 0.4 ) );
        Configuration.getConfiguration( x, e ).allOrientations.forEach( ( direction, i ) => {
          const point = new THREE.Vector3().copy( direction ).applyQuaternion( offset ).multiplyScalar( i < e ? 7 : 10 );
          molecule.addGroupAndBond( new Pair( new Vector( point.x, point.y, point.z ), i < e ), molecule.centralAtom, i < e ? 0 : 1 );
        } );
        model.moleculeProperty.value = molecule;
      };
      view.cartesianCoordinatesPanel.textbookLockedProperty.value = true;
      let maximumDisplayTurn = 0; let maximumFrameError = 0;
      for ( const [ x, e ] of [ [ 4, 0 ], [ 3, 0 ], [ 5, 0 ], [ 4, 1 ], [ 3, 2 ], [ 6, 0 ], [ 4, 2 ], [ 4, 0 ] ] ) {
        let previous = view.moleculeView.quaternion.clone(); make( x, e );
        for ( let i = 0; i < 120; i++ ) {
          view.updateMoleculeOrientation( false, 1 / 60 );
          const q = view.moleculeView.quaternion.clone();
          maximumDisplayTurn = Math.max( maximumDisplayTurn, qDistance( q, previous ) ); previous = q;
          const molecule = model.moleculeProperty.value; const atom = molecule.radialAtoms[ 0 ];
          const coordinates = view.cartesianFrame.getCoordinates( atom.positionProperty.value, molecule.centralAtom.positionProperty.value, model.moleculeQuaternionProperty.value );
          const world = new THREE.Vector3().copy( atom.positionProperty.value ).sub( molecule.centralAtom.positionProperty.value ).applyQuaternion( q );
          maximumFrameError = Math.max( maximumFrameError,
            coordinates.applyQuaternion( view.cartesianFrame.getAxesQuaternion( model.moleculeQuaternionProperty.value ) ).distanceTo( world ) );
        }
      }
      const beforeUnlock = view.moleculeView.quaternion.clone();
      view.cartesianCoordinatesPanel.textbookLockedProperty.value = false;
      const unlockTurn = qDistance( beforeUnlock, view.moleculeView.quaternion );
      view.cartesianCoordinatesPanel.modeProperty.value = 'molecule';
      model.moleculeQuaternionProperty.value = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.7, 0.8, 0.3 ) );
      const beforeLock = view.moleculeView.quaternion.clone();
      view.cartesianCoordinatesPanel.textbookLockedProperty.value = true;
      const lockTurn = qDistance( beforeLock, view.moleculeView.quaternion );
      for ( let i = 0; i < 180; i++ ) { view.updateMoleculeOrientation( false, 1 / 60 ); }
      view.step( 0 );
      const diagram = view.cartesianCoordinatesPanel.textbookDiagram;
      const molecule = model.moleculeProperty.value;
      const coordinates = molecule.radialAtoms.map( atom => view.cartesianFrame.getCoordinates( atom.positionProperty.value,
        molecule.centralAtom.positionProperty.value, model.moleculeQuaternionProperty.value ).toArray() );
      return { maximumDisplayTurn: maximumDisplayTurn, maximumFrameError: maximumFrameError, unlockTurn: unlockTurn, lockTurn: lockTurn,
        finalError: qDistance( view.moleculeView.quaternion, view.cartesianFrame.molecularFrameQuaternion ),
        diagram: diagram.visible, description: diagram.accessibleParagraph, ids: diagram.atomLabels.map( label => label.string ), coordinates: coordinates,
        coordinatePanelBottom: view.cartesianCoordinatesPanel.bottom, screenBottom: view.layoutBounds.maxY };
    } );
    nodeAssert.ok( transition.maximumDisplayTurn <= Math.PI / 30 + 1e-7, 'at most six degrees per 60Hz display frame' );
    nodeAssert.ok( transition.maximumFrameError < 1e-8, 'axes and readout agree even during easing' );
    nodeAssert.ok( transition.unlockTurn < 1e-7 && transition.lockTurn < 1e-7, 'neither toggle direction jumps the view' );
    nodeAssert.ok( transition.finalError < 1e-7 );
    nodeAssert.ok( transition.coordinatePanelBottom < transition.screenBottom - 70, 'guide and controls fit above the name panel' );
    console.log( 'PASS bounded transitions, smooth lock/re-lock, no unlock snap, and correct axes/readouts throughout easing' );
    nodeAssert.ok( transition.diagram ); nodeAssert.equal( new Set( transition.ids ).size, 4 );
    const [ left, right, toward, away ] = transition.ids.map( id => transition.coordinates[ Number( id.slice( 1 ) ) - 1 ] );
    nodeAssert.ok( Math.abs( left[ 2 ] ) < 1e-6 && Math.abs( right[ 2 ] ) < 1e-6 );
    nodeAssert.ok( toward[ 2 ] > 8 && away[ 2 ] < -8 );
    nodeAssert.match( transition.description, /solid wedge toward/ ); nodeAssert.match( transition.description, /dashes away/ );
    fs.mkdirSync( outputDir, { recursive: true } );
    await page.screenshot( { path: path.join( outputDir, 'textbook-guide.png' ) } );
    nodeAssert.deepEqual( errors, [] );
    console.log( 'PASS tetrahedral wedge/dash diagram matches all four 3D atom IDs and actual reference-frame depths; zero browser errors' );
  }
  finally { await browser.close(); }
} )().catch( error => { console.error( error ); process.exitCode = 1; } );
