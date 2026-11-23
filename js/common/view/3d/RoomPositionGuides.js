/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension. */
// SPDX-License-Identifier: GPL-3.0-only
// Added 2026-11-22. Selected-atom guides use world directions, never the camera or local molecular frame.
/** @author Cartesian-coordinate extension contributors */
class RoomPositionGuides extends THREE.Object3D {
  constructor() {
    super();
    this.visible = false;
    this.paths = [ 0xff7777, 0x76ef9a, 0x80b9ff ].map( color => {
      const geometry = new THREE.Geometry();
      for ( let i = 0; i < 48; i++ ) { geometry.vertices.push( new THREE.Vector3() ); }
      const line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: color, depthTest: false, transparent: true, opacity: 0.9 } ), THREE.LinePieces );
      this.add( line );
      return line;
    } );
    this.heightPlane = new THREE.Mesh( new THREE.PlaneGeometry( 28, 28 ), new THREE.MeshBasicMaterial( {
      color: 0x6adba1, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false
    } ) );
    this.heightPlane.rotation.x = -Math.PI / 2;
    this.add( this.heightPlane );
    const heightGrid = new THREE.Geometry();
    for ( let offset = -14; offset <= 14; offset += 7 ) {
      heightGrid.vertices.push( new THREE.Vector3( offset, 0, -14 ), new THREE.Vector3( offset, 0, 14 ),
        new THREE.Vector3( -14, 0, offset ), new THREE.Vector3( 14, 0, offset ) );
    }
    this.add( new THREE.Line( heightGrid, new THREE.LineBasicMaterial( { color: 0x76ef9a, transparent: true, opacity: 0.5, depthWrite: false } ), THREE.LinePieces ) );
    this.halo = new THREE.Mesh( new THREE.RingGeometry( 2.8, 2.94, 64 ), new THREE.MeshBasicMaterial( {
      color: 0xffe292, side: THREE.DoubleSide, depthTest: false, depthWrite: false
    } ) );
    this.add( this.halo );
    this.foot = new THREE.Mesh( new THREE.RingGeometry( 0.32, 0.44, 32 ), new THREE.MeshBasicMaterial( {
      color: 0x76ef9a, side: THREE.DoubleSide, depthTest: false, depthWrite: false
    } ) );
    this.foot.rotation.x = -Math.PI / 2;
    this.add( this.foot );
    this.point = new THREE.Vector3();
  }

  /** @public */
  update( point, centralWorld, camera, planeName ) {
    this.point.copy( point );
    this.position.copy( centralWorld );
    const origin = new THREE.Vector3();
    const alongX = new THREE.Vector3( point.x, 0, 0 );
    const floorPoint = new THREE.Vector3( point.x, 0, point.z );
    const endpoints = [ [ origin, alongX ], [ floorPoint, point ], [ alongX, floorPoint ] ];
    this.paths.forEach( ( line, index ) => {
      const [ start, end ] = endpoints[ index ];
      for ( let i = 0; i < 24; i++ ) {
        line.geometry.vertices[ i * 2 ].copy( start ).lerp( end, i / 24 );
        line.geometry.vertices[ i * 2 + 1 ].copy( start ).lerp( end, ( i + 0.58 ) / 24 );
      }
      line.geometry.verticesNeedUpdate = true;
      line.geometry.computeBoundingSphere();
    } );
    this.heightPlane.visible = planeName !== 'XY';
    this.halo.position.copy( point ); this.halo.quaternion.copy( camera.quaternion );
    this.foot.position.copy( floorPoint );
  }
}
export default RoomPositionGuides;
