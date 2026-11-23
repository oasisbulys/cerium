/* eslint-disable phet/copyright -- Independently authored extension; GPL-3.0-only, not a CU copyright claim. */
// SPDX-License-Identifier: GPL-3.0-only
// Cartesian-coordinate extension, added 2026-11-22.

/** Optional axes, a coordinate plane, and billboard identifiers for radial atoms. */
/** @author Cartesian-coordinate extension contributors */
class CartesianCoordinatesView extends THREE.Object3D {
  constructor() {
    super();

    this.axes = new THREE.Object3D();
    this.add( this.axes );
    this.planes = {};
    this.atomLabels = [];
    this.bookAtomLabels = [];
    this.lonePairLabels = [];
    this.bookLonePairLabels = [];
    this.axisLabels = [];
    this.roomAxisLabels = [];

    const directions = [ new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( 0, 1, 0 ), new THREE.Vector3( 0, 0, 1 ) ];
    const colors = [ 0xff4545, 0x55d86b, 0x4d94ff ];
    [ 'X', 'Y', 'Z' ].forEach( ( name, index ) => {
      const direction = directions[ index ];
      const arrow = new THREE.ArrowHelper( direction, new THREE.Vector3(), 14, colors[ index ], 1, 0.6 );
      // r71 caches ArrowHelper geometry globally, but this sim has a separate renderer per screen.
      // Each renderer must own its geometry (see doc/implementation-notes.md).
      arrow.line.geometry = arrow.line.geometry.clone();
      arrow.cone.geometry = arrow.cone.geometry.clone();
      this.axes.add( arrow );
      const geometry = new THREE.Geometry();
      geometry.vertices.push( direction.clone().multiplyScalar( -14 ), new THREE.Vector3() );
      this.axes.add( new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: colors[ index ] } ) ) );
      const label = CartesianCoordinatesView.createLabel( name, `#${colors[ index ].toString( 16 )}` );
      this.axisLabels.push( label );
      label.position.copy( direction ).multiplyScalar( 15 );
      this.axes.add( label );
      const roomLabel = CartesianCoordinatesView.createLabel( [ 'X · RIGHT', 'Y · BACK', 'Z · UP' ][ index ], `#${colors[ index ].toString( 16 )}`, 384 );
      roomLabel.position.copy( direction ).multiplyScalar( 16 );
      roomLabel.visible = false;
      this.roomAxisLabels.push( roomLabel );
      this.axes.add( roomLabel );
    } );

    [ 'XY', 'XZ', 'YZ' ].forEach( ( name, index ) => {
      const plane = new THREE.Mesh( new THREE.PlaneGeometry( 28, 28 ), new THREE.MeshBasicMaterial( {
        color: [ colors[ 2 ], colors[ 1 ], colors[ 0 ] ][ index ],
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
      } ) );
      if ( name === 'XZ' ) { plane.rotation.x = Math.PI / 2; }
      if ( name === 'YZ' ) { plane.rotation.y = Math.PI / 2; }
      plane.visible = false;
      this.planes[ name ] = plane;
      this.axes.add( plane );
    } );

    for ( let i = 0; i < 6; i++ ) {
      const label = CartesianCoordinatesView.createLabel( `A${i + 1}`, '#ffffff' );
      this.atomLabels.push( label );
      this.add( label );
      const bookLabel = CartesianCoordinatesView.createLabel( `A${i + 1}`, '#ffffff', 512, '' );
      bookLabel.visible = false;
      this.bookAtomLabels.push( bookLabel );
      this.add( bookLabel );
      const pairLabel = CartesianCoordinatesView.createLabel( `LP${i + 1}`, '#ffe28d' );
      const bookPairLabel = CartesianCoordinatesView.createLabel( `LP${i + 1}`, '#ffe28d', 512, '' );
      pairLabel.visible = bookPairLabel.visible = false;
      this.lonePairLabels.push( pairLabel );
      this.bookLonePairLabels.push( bookPairLabel );
      this.add( pairLabel );
      this.add( bookPairLabel );
    }
    this.visible = false;
  }

  /** @private */
  static createLabel( text, color, width = 128, caption = null ) {
    const canvas = document.createElement( 'canvas' );
    canvas.width = width;
    canvas.height = caption === null ? 64 : 128;
    CartesianCoordinatesView.paintLabel( canvas, text, color, caption );
    const texture = new THREE.Texture( canvas );
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite( new THREE.SpriteMaterial( { map: texture, depthTest: false, depthWrite: false } ) );
    sprite.scale.set( caption === null ? 2.4 : 9.6, caption === null ? 1.2 : 2.4, 1 );
    return sprite;
  }

  /** @private - Redraw only when a reference role changes, never on every animation frame. */
  static paintLabel( canvas, text, color, caption ) {
    const context = canvas.getContext( '2d' );
    context.clearRect( 0, 0, canvas.width, canvas.height );
    context.font = 'bold 42px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 6;
    context.strokeStyle = '#000000';
    const y = caption === null ? 32 : 34;
    context.strokeText( text, canvas.width / 2, y );
    context.fillStyle = color;
    context.fillText( text, canvas.width / 2, y );
    if ( caption !== null ) {
      context.font = 'bold 30px sans-serif';
      context.strokeText( caption, canvas.width / 2, 94 );
      context.fillText( caption, canvas.width / 2, 94 );
    }
  }

  /** @public */
  update( molecule, moleculeQuaternion, camera, frame, visible, planeName, referenceEntries = [], showLonePairs = true ) {
    this.visible = visible;
    if ( !visible ) { return; }

    const viewQuaternion = frame.getMoleculeViewQuaternion( moleculeQuaternion );
    this.axes.position.copy( molecule.centralAtom.positionProperty.value ).applyQuaternion( viewQuaternion );
    this.axes.quaternion.copy( frame.getAxesQuaternion( moleculeQuaternion ) );
    Object.keys( this.planes ).forEach( name => {
      this.planes[ name ].visible = name === planeName;
    } );

    // Keep each identifier just above/right of its atom on screen, independent of either frame.
    const labelOffset = new THREE.Vector3( 1.7, 1.7, 0 ).applyQuaternion( camera.quaternion );
    const inverseCameraQuaternion = camera.quaternion.clone().inverse();
    const updateLabels = ( groups, labels, bookLabels, lonePair ) => labels.forEach( ( label, index ) => {
      const group = groups[ index ];
      const id = `${lonePair ? 'LP' : 'A'}${index + 1}`;
      const entry = frame.textbookLocked && !frame.roomEnabled && referenceEntries.find( entry => entry.id === id );
      const bookLabel = bookLabels[ index ];
      const enabled = !lonePair || showLonePairs;
      bookLabel.visible = !!group && !!entry && enabled;
      label.visible = !!group && !entry && enabled;
      if ( group ) {
        label.position.copy( group.positionProperty.value ).applyQuaternion( viewQuaternion ).add( labelOffset );
        if ( entry ) {
          const point = new THREE.Vector3().copy( group.positionProperty.value ).applyQuaternion( viewQuaternion );
          const cameraPoint = point.clone().sub( camera.position ).applyQuaternion( inverseCameraQuaternion );
          const radial = point.clone().sub( this.axes.position ).applyQuaternion( inverseCameraQuaternion );
          const radialLength = Math.max( 1e-6, Math.hypot( radial.x, radial.y ) );
          const x = radial.x / radialLength; const y = radial.y / radialLength;
          const scale = Math.max( 1, -cameraPoint.z ) / 40;
          // Put captions outside the silhouette, rather than across bonds, with equal readable text size at every depth.
          const offset = new THREE.Vector3( ( 3.2 * x + 1.3 * y ) * scale, ( 3.2 * y - 1.3 * x ) * scale, 0 )
            .applyQuaternion( camera.quaternion );
          bookLabel.position.copy( point ).add( offset );
          bookLabel.scale.set( 9.6 * scale, 2.4 * scale, 1 );
          if ( bookLabel.userData.role !== entry.role ) {
            const caption = { plane: 'in page', toward: 'out of page', away: 'behind page' }[ entry.role ];
            CartesianCoordinatesView.paintLabel( bookLabel.material.map.image, entry.id,
              { plane: lonePair ? '#ffe28d' : '#ffffff', toward: '#8dc4ff', away: '#ffc88d' }[ entry.role ], caption );
            bookLabel.material.map.needsUpdate = true;
            bookLabel.userData.role = entry.role;
            bookLabel.userData.caption = caption;
          }
        }
      }
    } );
    updateLabels( molecule.radialAtoms, this.atomLabels, this.bookAtomLabels, false );
    updateLabels( molecule.radialLonePairs, this.lonePairLabels, this.bookLonePairLabels, true );
    this.updateMatrixWorld( true );
    // Keep X/Y/Z equally readable despite perspective foreshortening along the viewing direction.
    const inverseCamera = new THREE.Matrix4().getInverse( camera.matrixWorld );
    this.axisLabels.forEach( label => {
      label.visible = !frame.roomEnabled;
      const depth = Math.max( 1, -label.getWorldPosition().applyMatrix4( inverseCamera ).z );
      label.scale.set( 2.4 * depth / 40, 1.2 * depth / 40, 1 );
    } );
    this.roomAxisLabels.forEach( label => {
      label.visible = frame.roomEnabled;
      const depth = Math.max( 1, -label.getWorldPosition().applyMatrix4( inverseCamera ).z );
      label.scale.set( 6 * depth / 40, 1.2 * depth / 40, 1 );
    } );
  }
}

export default CartesianCoordinatesView;
