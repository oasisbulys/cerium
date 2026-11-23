/* eslint-disable phet/copyright -- Independently authored extension; GPL-3.0-only, not a CU copyright claim. */
// SPDX-License-Identifier: GPL-3.0-only
// Cartesian-coordinate extension, added 2026-11-22.

/**
 * View transforms only. Never writes to a PairGroup, velocity, bond, or VSEPR configuration.
 * The molecule quaternion maps model coordinates to world coordinates; the orbit quaternion maps
 * the original camera pose to its current pose. Coordinates are relative to the central atom.
 */
/** @author Cartesian-coordinate extension contributors */
class CartesianFrame {
  constructor() {
    this.roomEnabled = false;
    this.roomYaw = -0.35;
    this.roomPitch = -0.18;
    this.rotationMode = 'molecule';
    this.lockAxesToMolecule = true;
    this.textbookLocked = false; // the UI enables this by default; pure frame math remains independently usable
    this.alignmentQuaternion = new THREE.Quaternion(); // fixed raw-model -> starting view alignment
    this.molecularFrameQuaternion = new THREE.Quaternion(); // current raw-model -> local molecular frame
    this.textbookViewQuaternion = null; // optional eased display pose; local coordinates keep the actual fitted frame
    this.orbitQuaternion = new THREE.Quaternion();
    // The rendering engine and imported room use Y-up. The lab coordinate convention is Z-up,
    // so map rendered (X, Y, Z) to room (X, -Z, Y) without reflecting the right-handed frame.
    this.sceneToRoomQuaternion = new THREE.Quaternion().setFromEuler( new THREE.Euler( Math.PI / 2, 0, 0 ) );
    this.roomToSceneQuaternion = this.sceneToRoomQuaternion.clone().inverse();
  }

  /** @public */
  get usesMolecularFrame() {
    // Camera orbit retains its original molecular frame. The lock also attaches the axes when
    // rotating the molecule itself, like Local orientation in a 3D modeling application.
    return !this.roomEnabled && ( this.lockAxesToMolecule || this.rotationMode === 'orbit' );
  }

  /** @public */
  getCoordinates( position, centralPosition, moleculeQuaternion ) {
    const relative = new THREE.Vector3().copy( position ).sub( centralPosition );
    const coordinates = this.usesMolecularFrame ? relative.applyQuaternion( this.molecularFrameQuaternion ) :
                        relative.applyQuaternion( this.getMoleculeViewQuaternion( moleculeQuaternion ) );
    return this.roomEnabled ? coordinates.applyQuaternion( this.sceneToRoomQuaternion ) : coordinates;
  }

  /** @public */
  getAxesQuaternion( moleculeQuaternion ) {
    if ( this.roomEnabled ) { return this.roomToSceneQuaternion.clone(); }
    // Follow the molecule's overall orientation, including rotation induced by individual-domain dragging.
    return this.usesMolecularFrame ? this.getMoleculeViewQuaternion( moleculeQuaternion )
      .multiply( this.molecularFrameQuaternion.clone().inverse() ).normalize() : new THREE.Quaternion();
  }

  /** @public */
  getMoleculeViewQuaternion( moleculeQuaternion ) {
    if ( this.textbookLocked ) { return ( this.textbookViewQuaternion || this.molecularFrameQuaternion ).clone(); }
    return moleculeQuaternion.clone().multiply( this.alignmentQuaternion );
  }

  /** @public */
  rotate( delta, moleculeQuaternion ) {
    if ( this.roomEnabled && ( this.textbookLocked || this.rotationMode === 'orbit' ) ) {
      const gesture = new THREE.Euler().setFromQuaternion( delta, 'YXZ' );
      this.setRoomView( this.roomYaw - gesture.y, this.roomPitch - gesture.x );
      return moleculeQuaternion;
    }
    if ( this.textbookLocked || this.rotationMode === 'orbit' ) {
      // Camera-local rotation, with the opposite sign to the apparent motion of the scene.
      this.orbitQuaternion.multiply( delta.clone().inverse() ).normalize();
      return moleculeQuaternion;
    }

    // Convert the screen-relative gesture to the world frame when the camera has already orbited.
    const worldDelta = this.orbitQuaternion.clone().multiply( delta ).multiply( this.orbitQuaternion.clone().inverse() );
    return worldDelta.multiply( moleculeQuaternion ).normalize();
  }

  /** Horizon-preserving orbit inside the laboratory. Pitch limits keep the camera above the floor and below the ceiling. @public */
  setRoomView( yaw, pitch ) {
    this.roomYaw = yaw;
    this.roomPitch = Math.max( -0.65, Math.min( 0.18, pitch ) );
    this.orbitQuaternion.setFromEuler( new THREE.Euler( this.roomPitch, this.roomYaw, 0, 'YXZ' ) );
  }

  /** @public */
  applyCamera( camera, originalPosition, centralWorldPosition ) {
    camera.position.copy( originalPosition ).applyQuaternion( this.orbitQuaternion ).add( centralWorldPosition );
    camera.quaternion.copy( this.orbitQuaternion );
    camera.updateMatrixWorld( true );
  }

  /** @public */
  resetOrientation() {
    this.orbitQuaternion.set( 0, 0, 0, 1 );
  }
}

export default CartesianFrame;
