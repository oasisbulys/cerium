/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only profiling harness. */
/** @author Cartesian-coordinate extension contributors */
'use strict';
/* eslint-disable require-atomic-updates -- This isolated profiling page owns and restores the temporary step hook; no other writer runs. */
// SPDX-License-Identifier: GPL-3.0-only
// Profile the complete simulation at original texture resolution; report the actual renderer, never infer it from hardware alone.
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { chromium } = require( process.env.PLAYWRIGHT_MODULE_PATH || '../../perennial-alias/node_modules/playwright' );
const options = { headless: process.env.PROFILE_HEADFUL !== '1', args: [ '--no-sandbox', '--use-gl=angle', '--use-angle=gl', '--enable-gpu', '--window-position=-2000,-2000' ] };
if ( process.env.BROWSER_EXECUTABLE ) { options.executablePath = process.env.BROWSER_EXECUTABLE; }
const baseURL = process.env.SIM_BASE_URL || 'http://localhost:8080';
const simPath = process.env.SIM_PATH || '/molecule-shapes/molecule-shapes_en.html';
const output = process.env.PROFILE_OUTPUT || path.join( __dirname, 'artifacts/lab-profile.json' );
( async () => {
  const browser = await chromium.launch( options );
  const page = await browser.newPage( { viewport: { width: Number( process.env.PROFILE_WIDTH || 1920 ), height: Number( process.env.PROFILE_HEIGHT || 1080 ) } } );
  try {
    await page.goto( `${baseURL}${simPath}?brand=cerium&screens=1` );
    await page.waitForFunction( () => window.phet?.joist?.sim?.isConstructionCompleteProperty?.value );
    await page.evaluate( () => {
      const screen = phet.joist.sim.simScreens[ 0 ];
      window.testView = screen.view; window.testModel = screen.model;
      const old = testModel.moleculeProperty.value; const PairGroup = old.centralAtom.constructor;
      const Vector3 = old.centralAtom.positionProperty.value.constructor;
      const molecule = new old.constructor(); molecule.addCentralAtom( new PairGroup( new Vector3( 0, 0, 0 ), false ) );
      [ [ 10, 0, 0 ], [ -10, 0, 0 ], [ 0, 10, 0 ], [ 0, -10, 0 ], [ 0, 0, 10 ], [ 0, 0, -10 ] ].forEach( p =>
        molecule.addGroupAndBond( new PairGroup( new Vector3( ...p ), false ), molecule.centralAtom, 1 ) );
      testModel.moleculeProperty.value = molecule;
      testView.resetOrientation();
    } );
    const result = await page.evaluate( async () => {
      const view = testView; const gl = view.threeRenderer.getContext();
      const debug = gl.getExtension( 'WEBGL_debug_renderer_info' );
      const gpu = debug ? gl.getParameter( debug.UNMASKED_RENDERER_WEBGL ) : gl.getParameter( gl.RENDERER );
      const measure = async ( label, orbit ) => {
        await new Promise( resolve => {
          let count = 0; const warm = () => {
 if ( ++count < 60 ) { requestAnimationFrame( warm ); }
 else { resolve(); }
}; requestAnimationFrame( warm );
        } );
        const frames = []; const cpu = []; const times = [];
        let previous = null;
        const originalStep = view.step;
        view.step = function( dt ) {
          if ( orbit ) { this.cartesianFrame.setRoomView( this.cartesianFrame.roomYaw + 0.006, -0.18 ); }
          const start = performance.now(); originalStep.call( this, dt ); cpu.push( performance.now() - start );
        };
        await new Promise( resolve => {
          const collect = now => {
            if ( previous !== null ) { frames.push( now - previous ); }
            previous = now; times.push( now );
            if ( frames.length < 300 ) { requestAnimationFrame( collect ); }
 else { resolve(); }
          }; requestAnimationFrame( collect );
        } );
        view.step = originalStep;
        const stats = values => {
          const sorted = values.slice().sort( ( a, b ) => a - b );
          return { mean: values.reduce( ( a, b ) => a + b, 0 ) / values.length, p95: sorted[ Math.floor( sorted.length * 0.95 ) ], max: sorted[ sorted.length - 1 ] };
        };
        const timing = stats( frames );
        return { label: label, samples: frames.length, averageFPS: 1000 / timing.mean, frameMilliseconds: timing,
          cpuViewStepMilliseconds: stats( cpu ), framesOver25ms: frames.filter( value => value > 25 ).length };
      };
      const studio = await measure( 'Studio / AX6 / solver active', false );
      view.cartesianCoordinatesPanel.labProperty.value = true;
      await view.labEnvironment.loadingPromise;
      if ( view.labEnvironment.error ) { throw new Error( view.labEnvironment.error ); }
      const lab = await measure( 'Lab / AX6 / original textures / solver active', false );
      const orbit = await measure( 'Lab / AX6 / continuously orbiting / solver active', true );
      return { gpuRenderer: gpu, hardwareRenderer: !/swiftshader|llvmpipe|software/i.test( gpu ),
        viewport: [ innerWidth, innerHeight ], pixelRatio: devicePixelRatio, textureSizes: view.labEnvironment.modelData.imageSizes,
        maxAnisotropy: view.threeRenderer.getMaxAnisotropy(), shadowMaps: view.labEnvironment.ceilingLights.map( light => [ light.shadowMapWidth, light.shadowMapHeight ] ),
        measurements: [ studio, lab, orbit ],
        userAgent: navigator.userAgent, capturedAt: new Date().toISOString() };
    } );
    fs.mkdirSync( path.dirname( output ), { recursive: true } ); fs.writeFileSync( output, JSON.stringify( result, null, 2 ) + '\n' );
    console.log( JSON.stringify( result, null, 2 ) );
  }
  finally { await browser.close(); }
} )().catch( error => { console.error( error ); process.exitCode = 1; } );
