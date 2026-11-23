/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only integration. */
// SPDX-License-Identifier: GPL-3.0-only
// Added 2026-11-22. The imported Lab model/textures remain CC-BY-4.0, by Raid; see assets/lab/license.txt.
import LabSceneData from '../../data/LabSceneData.js';

/** @author Cartesian-coordinate extension contributors */
// A small, asset-specific static glTF 2 adapter for the simulation's preserved Three.js r71 renderer.
// No model conversion, image resizing, shader replacement in the molecular renderer, or external network requests.
const decodedBuffers = [];
const accessorCache = new Map();
let imagePromise = null;

const readAccessor = index => {
  if ( accessorCache.has( index ) ) { return accessorCache.get( index ); }
  const gltf = LabSceneData.gltf;
  const accessor = gltf.accessors[ index ];
  const view = gltf.bufferViews[ accessor.bufferView ];
  if ( !decodedBuffers[ view.buffer ] ) {
    const binary = window.atob( LabSceneData.buffers[ view.buffer ] );
    const bytes = new Uint8Array( binary.length );
    for ( let i = 0; i < binary.length; i++ ) { bytes[ i ] = binary.charCodeAt( i ); }
    decodedBuffers[ view.buffer ] = bytes.buffer;
  }
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[ accessor.type ];
  const constructors = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const ArrayType = constructors[ accessor.componentType ];
  const size = ArrayType.BYTES_PER_ELEMENT;
  const bytes = new DataView( decodedBuffers[ view.buffer ] );
  const values = new ArrayType( accessor.count * components );
  const start = ( view.byteOffset || 0 ) + ( accessor.byteOffset || 0 );
  const stride = view.byteStride || components * size;
  const getters = { 5121: 'getUint8', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };
  for ( let row = 0; row < accessor.count; row++ ) {
    for ( let column = 0; column < components; column++ ) {
      values[ row * components + column ] = bytes[ getters[ accessor.componentType ] ]( start + row * stride + column * size, true );
    }
  }
  accessorCache.set( index, values );
  return values;
};

const loadImages = () => {
  if ( !imagePromise ) {
    imagePromise = Promise.all( LabSceneData.images.map( uri => new Promise( ( resolve, reject ) => {
      const image = new window.Image();
      image.onload = () => resolve( image );
      image.onerror = () => reject( new Error( 'The bundled Lab texture could not be decoded.' ) );
      image.src = uri;
    } ) ) );
  }
  return imagePromise;
};

// Independent painted-metal grain; the original color maps remain unchanged.
// r71 shares a UV transform between maps, so this fills the atlas without changing its UVs.
const createSurfaceGrain = renderer => {
  const canvas = document.createElement( 'canvas' );
  canvas.width = 1024; canvas.height = 1024;
  const context = canvas.getContext( '2d' );
  const image = context.createImageData( 1024, 1024 );
  let seed = 73421;
  for ( let i = 0; i < image.data.length; i += 4 ) {
    seed = ( seed * 1664525 + 1013904223 ) % 4294967296;
    const value = 120 + Math.floor( seed / 268435456 );
    image.data[ i ] = value; image.data[ i + 1 ] = value; image.data[ i + 2 ] = value; image.data[ i + 3 ] = 255;
  }
  context.putImageData( image, 0, 0 );
  const texture = new THREE.Texture( canvas );
  texture.flipY = false;
  texture.anisotropy = renderer.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
};

const LabModelLoader = {
  /** Renderer-local geometry/materials/textures, with shared immutable source arrays and decoded image pixels. */
  async load( renderer ) {
    const gltf = LabSceneData.gltf;
    const images = await loadImages();
    const textures = gltf.textures.map( definition => {
      const texture = new THREE.Texture( images[ definition.source ] );
      texture.flipY = false; // glTF UV origin is the top-left corner of the image.
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearMipMapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.getMaxAnisotropy();
      texture.needsUpdate = true;
      return texture;
    } );
    const surfaceGrain = createSurfaceGrain( renderer );
    const materials = gltf.materials.map( ( definition, index ) => {
      const pbr = definition.pbrMetallicRoughness || {};
      const factor = pbr.baseColorFactor || [ 1, 1, 1, 1 ];
      const paintedMetal = [ 2, 4, 5, 6, 7 ].includes( index );
      // The source has no nonzero emissive factor: its cabinets should respond to light, not glow unlit.
      // Approximate the source's rough nonmetal PBR materials with r71's supported Phong lighting model.
      return new THREE.MeshPhongMaterial( {
        map: pbr.baseColorTexture ? textures[ pbr.baseColorTexture.index ] : null,
        color: new THREE.Color( factor[ 0 ], factor[ 1 ], factor[ 2 ] ),
        specular: paintedMetal ? 0x303438 : 0x171b20,
        shininess: paintedMetal ? 45 : 18,
        bumpMap: paintedMetal ? surfaceGrain : null,
        bumpScale: 0.025,
        side: definition.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        transparent: definition.alphaMode === 'BLEND',
        opacity: factor[ 3 ]
      } );
    } );
    const buildNode = index => {
      const definition = gltf.nodes[ index ];
      const node = new THREE.Object3D();
      node.name = definition.name || `Lab node ${index}`;
      if ( definition.matrix ) { node.applyMatrix( new THREE.Matrix4().fromArray( definition.matrix ) ); }
      else {
        if ( definition.translation ) { node.position.fromArray( definition.translation ); }
        if ( definition.rotation ) { node.quaternion.fromArray( definition.rotation ); }
        if ( definition.scale ) { node.scale.fromArray( definition.scale ); }
      }
      if ( definition.mesh !== undefined ) {
        gltf.meshes[ definition.mesh ].primitives.forEach( primitive => {
          const geometry = new THREE.BufferGeometry();
          geometry.addAttribute( 'position', new THREE.BufferAttribute( readAccessor( primitive.attributes.POSITION ), 3 ) );
          geometry.addAttribute( 'normal', new THREE.BufferAttribute( readAccessor( primitive.attributes.NORMAL ), 3 ) );
          if ( primitive.attributes.TEXCOORD_0 !== undefined ) {
            geometry.addAttribute( 'uv', new THREE.BufferAttribute( readAccessor( primitive.attributes.TEXCOORD_0 ), 2 ) );
          }
          if ( primitive.indices !== undefined ) {
            geometry.addAttribute( 'index', new THREE.BufferAttribute( readAccessor( primitive.indices ), 1 ) );
          }
          geometry.computeBoundingSphere();
          const mesh = new THREE.Mesh( geometry, materials[ primitive.material ] );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          node.add( mesh );
        } );
      }
      ( definition.children || [] ).forEach( child => node.add( buildNode( child ) ) );
      return node;
    };
    const root = new THREE.Object3D();
    gltf.scenes[ gltf.scene || 0 ].nodes.forEach( index => root.add( buildNode( index ) ) );
    root.updateMatrixWorld( true );
    const bounds = new THREE.Box3().setFromObject( root );
    const center = bounds.center();
    const scale = 0.08;
    root.scale.set( scale, scale, scale );
    root.position.set( -center.x * scale, -14 - bounds.min.y * scale, -center.z * scale );
    root.updateMatrixWorld( true );
    return { root: root, textures: textures, materials: materials, surfaceGrain: surfaceGrain,
      imageSizes: images.map( image => [ image.naturalWidth, image.naturalHeight ] ) };
  }
};

export default LabModelLoader;
