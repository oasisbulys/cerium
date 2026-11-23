/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only integration. */
// SPDX-License-Identifier: GPL-3.0-only
// Added 2026-11-22. Raid's Lab asset remains CC-BY-4.0; see assets/lab/license.txt.
import LabModelLoader from './LabModelLoader.js';

/** @author Cartesian-coordinate extension contributors */
class LabEnvironmentView extends THREE.Object3D {
  constructor() {
    super();
    this.ready = false;
    this.error = null;
    this.loadingPromise = null;
    this.modelData = null;
    this.visible = false;

    // Ceiling illumination and a cool room fill reveal the original equipment geometry.
    // These lights belong only to the lab scene; the original studio lighting is preserved.
    this.add( new THREE.AmbientLight( 0x252b32 ) );
    this.add( new THREE.HemisphereLight( 0xe6f0ff, 0x48505a, 0.42 ) );
    this.ceilingLights = [ [ -24, 24, 4 ], [ 25, 24, -18 ] ].map( ( position, index ) => {
      const light = new THREE.SpotLight( index ? 0xe0edff : 0xffefdf, 0.75, 150, Math.PI / 2.5, 0.6 );
      light.position.set( ...position );
      light.target.position.set( position[ 0 ] * 0.5, -14, position[ 2 ] );
      light.castShadow = true;
      light.shadowMapWidth = 2048; light.shadowMapHeight = 2048;
      light.shadowCameraNear = 1; light.shadowCameraFar = 150; light.shadowCameraFov = 140;
      light.shadowBias = -0.0003; light.shadowDarkness = 0.32;
      this.add( light ); this.add( light.target );
      return light;
    } );

    // A teaching-model display surface sits just above the original laboratory floor.
    const deck = new THREE.Mesh( new THREE.CircleGeometry( 17, 96 ), new THREE.MeshBasicMaterial( {
      color: 0x172936, transparent: true, opacity: 0.82, side: THREE.DoubleSide
    } ) );
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = -13.35;
    this.add( deck );
    const rim = new THREE.Mesh( new THREE.RingGeometry( 16.8, 17, 96 ), new THREE.MeshBasicMaterial( {
      color: 0x75c9dc, transparent: true, opacity: 0.8, side: THREE.DoubleSide
    } ) );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -13.25;
    this.add( rim );

    const grid = new THREE.Geometry();
    for ( let x = -15; x <= 15; x += 5 ) {
      grid.vertices.push( new THREE.Vector3( x, -13.2, -15 ), new THREE.Vector3( x, -13.2, 15 ),
        new THREE.Vector3( -15, -13.2, x ), new THREE.Vector3( 15, -13.2, x ) );
    }
    this.add( new THREE.Line( grid, new THREE.LineBasicMaterial( { color: 0xaed5e0, transparent: true, opacity: 0.4 } ), THREE.LinePieces ) );

    // The room is rendered with Y-up, while its teaching coordinates use X/Y on the floor and Z-up.
    [ [ new THREE.Vector3( 1, 0, 0 ), 0xff7777 ], [ new THREE.Vector3( 0, 0, -1 ), 0x55d86b ] ].forEach( ( [ direction, color ] ) => {
      const arrow = new THREE.ArrowHelper( direction, new THREE.Vector3( 0, -13.05, 0 ), 16, color, 1.3, 0.7 );
      arrow.line.geometry = arrow.line.geometry.clone(); arrow.cone.geometry = arrow.cone.geometry.clone();
      this.add( arrow );
    } );

    [
      [ 'RIGHT  +X', 18, -12.7, 0, '#ff7777' ], [ 'LEFT  −X', -18, -12.7, 0, '#ff7777' ],
      [ 'FRONT  −Y', 0, -12.7, 18, '#55d86b' ], [ 'BACK  +Y', 0, -12.7, -18, '#55d86b' ]
    ].forEach( ( [ text, x, y, z, color ] ) => {
      const canvas = document.createElement( 'canvas' );
      canvas.width = 512; canvas.height = 128;
      const context = canvas.getContext( '2d' );
      context.font = 'bold 48px sans-serif';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.strokeStyle = '#142532'; context.lineWidth = 10;
      context.strokeText( text, 256, 64 ); context.fillStyle = color; context.fillText( text, 256, 64 );
      const texture = new THREE.Texture( canvas ); texture.needsUpdate = true; texture.minFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite( new THREE.SpriteMaterial( { map: texture, depthWrite: false } ) );
      sprite.position.set( x, y, z ); sprite.scale.set( 9, 2.25, 1 ); this.add( sprite );
    } );
  }

  /** Load full-resolution source images once; keep renderer-owned GPU resources separate on each screen. @public */
  load( renderer ) {
    if ( !this.loadingPromise ) {
      renderer.shadowMapType = THREE.PCFSoftShadowMap;
      this.loadingPromise = LabModelLoader.load( renderer ).then( data => {
        this.modelData = data;
        this.add( data.root );
        this.ready = true;
      } ).catch( error => {
        this.error = error.message;
      } );
    }
    return this.loadingPromise;
  }
}
export default LabEnvironmentView;
