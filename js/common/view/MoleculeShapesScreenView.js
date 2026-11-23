// Copyright 2014-2026, University of Colorado Boulder
// Modified 2026-11-22: Cartesian frames, textbook view alignment, camera orbit, and Hide GUI (GPL-3.0-only).

/**
 * Base view for all "show a single molecule in the center" screens
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import BooleanProperty from '../../../../axon/js/BooleanProperty.js';
import Property from '../../../../axon/js/Property.js';
import Bounds2 from '../../../../dot/js/Bounds2.js';
import Matrix3 from '../../../../dot/js/Matrix3.js';
import Plane3 from '../../../../dot/js/Plane3.js';
import Ray3 from '../../../../dot/js/Ray3.js';
import Sphere3 from '../../../../dot/js/Sphere3.js';
import Vector3 from '../../../../dot/js/Vector3.js';
import ScreenView from '../../../../joist/js/ScreenView.js';
import MobiusQueryParameters from '../../../../mobius/js/MobiusQueryParameters.js';
import PhetFont from '../../../../scenery-phet/js/PhetFont.js';
import ResetAllButton from '../../../../scenery-phet/js/buttons/ResetAllButton.js';
import ContextLossFailureDialog from '../../../../scenery-phet/js/ContextLossFailureDialog.js';
import Mouse from '../../../../scenery/js/input/Mouse.js';
import HBox from '../../../../scenery/js/layout/nodes/HBox.js';
import VBox from '../../../../scenery/js/layout/nodes/VBox.js';
import AlignBox from '../../../../scenery/js/layout/nodes/AlignBox.js';
import animatedPanZoomSingleton from '../../../../scenery/js/listeners/animatedPanZoomSingleton.js';
import DOM from '../../../../scenery/js/nodes/DOM.js';
import Node from '../../../../scenery/js/nodes/Node.js';
import Text from '../../../../scenery/js/nodes/Text.js';
import Rectangle from '../../../../scenery/js/nodes/Rectangle.js';
import TextPushButton from '../../../../sun/js/buttons/TextPushButton.js';
import Tandem from '../../../../tandem/js/Tandem.js';
import MoleculeShapesGlobals from '../MoleculeShapesGlobals.js';
import CartesianCoordinatesView from './3d/CartesianCoordinatesView.js';
import LabEnvironmentView from './3d/LabEnvironmentView.js';
import RoomPositionGuides from './3d/RoomPositionGuides.js';
import LabelWebGLView from './3d/LabelWebGLView.js';
import CartesianCoordinatesPanel from './CartesianCoordinatesPanel.js';
import CartesianFrame from './CartesianFrame.js';
import LabLearningPanel from './LabLearningPanel.js';
import MoleculeShapesPanel from './MoleculeShapesPanel.js';
import GeometryNamePanel from './GeometryNamePanel.js';
import LabelFallbackNode from './LabelFallbackNode.js';
import MoleculeShapesColors from './MoleculeShapesColors.js';
import TextbookOrientation from './TextbookOrientation.js';
import TextbookGeometry from './TextbookGeometry.js';
import TextbookReference from './TextbookReference.js';

// Shared across screens so presentation mode has the same state throughout the simulation.
const showGUIProperty = new BooleanProperty( true );

class MoleculeShapesScreenView extends ScreenView {

  /**
   * @param {ModelMoleculesModel} model the model for the entire screen
   * @public {Tandem} tandem
   */
  constructor( model, tandem ) {
    super( {
      tandem: tandem
    } );

    const self = this;

    this.model = model; // @private {ModelMoleculesModel}

    // our target for drags that don't hit other UI components
    this.backgroundEventTarget = Rectangle.bounds( this.layoutBounds, {} ); // @private
    this.addChild( this.backgroundEventTarget );

    // updated in layout
    this.activeScale = 1; // @private scale applied to interaction that isn't directly tied to screen coordinates (rotation)
    this.screenWidth = null; // @public
    this.screenHeight = null; // @public

    // main three.js Scene setup
    this.threeScene = new THREE.Scene(); // @private

    this.threeCamera = new THREE.PerspectiveCamera(); // @private will set the projection parameters on layout
    this.threeCamera.near = 1;
    this.threeCamera.far = 100;

    // @public {THREE.Renderer}
    this.threeRenderer = MoleculeShapesGlobals.useWebGLProperty.value ? new THREE.WebGLRenderer( {
      antialias: MobiusQueryParameters.threeRendererAntialias,
      preserveDrawingBuffer: MobiusQueryParameters.threeRendererPreserveDrawingBuffer
    } ) : new THREE.CanvasRenderer( {
      devicePixelRatio: 1 // hopefully helps performance a bit
    } );

    this.threeRenderer.setPixelRatio( MobiusQueryParameters.threeRendererPixelRatio );

    // @private {ContextLossFailureDialog|null} - dialog shown on context loss, constructed
    // lazily because Dialog requires sim bounds during construction
    this.contextLossDialog = null;

    // In the event of a context loss, we'll just show a dialog. See https://github.com/phetsims/molecule-shapes/issues/100
    if ( MoleculeShapesGlobals.useWebGLProperty.value ) {
      this.threeRenderer.context.canvas.addEventListener( 'webglcontextlost', event => {
        event.preventDefault();

        this.showContextLossDialog();

        if ( document.domain === 'phet.colorado.edu' ) {
          window._gaq && window._gaq.push( [ '_trackEvent', 'WebGL Context Loss', `molecule-shapes ${phet.joist.sim.version}`, document.URL ] );
        }
      } );
    }

    MoleculeShapesColors.backgroundProperty.link( color => {
      this.threeRenderer.setClearColor( color.toNumber(), 1 );
    } );

    MoleculeShapesScreenView.addLightsToScene( this.threeScene );

    this.threeCamera.position.copy( MoleculeShapesScreenView.cameraPosition ); // sets the camera's position

    // The extension owns view state only. The original molecule quaternion and solver remain independent.
    this.cartesianFrame = new CartesianFrame();
    // Each geometry gets a readable page-facing home view, with a small turn when it has depth.
    this.homeOrbitQuaternion = new THREE.Quaternion();
    this.bookCameraKey = '';
    this.bookCameraPending = false;
    this.cartesianFrame.orbitQuaternion.copy( this.homeOrbitQuaternion );
    this.textbookOrientation = new TextbookOrientation();
    this.cartesianCoordinatesView = new CartesianCoordinatesView();
    this.threeScene.add( this.cartesianCoordinatesView );
    this.labScene = new THREE.Scene();
    this.labEnvironment = new LabEnvironmentView();
    this.labScene.add( this.labEnvironment );
    this.labMoleculeFill = new THREE.HemisphereLight( 0xe6f0ff, 0x778797, 0.55 );
    this.labMoleculeFill.visible = false;
    this.threeScene.add( this.labMoleculeFill );
    this.roomPositionGuides = new RoomPositionGuides();
    this.threeScene.add( this.roomPositionGuides );
    this.studioOrbitQuaternion = this.homeOrbitQuaternion.clone();

    // @private add the Canvas in with a DOM node that prevents Scenery from applying transformations on it
    this.moleculeNode = new DOM( this.threeRenderer.domElement, {
      preventTransform: true, // Scenery 0.2 override for transformation
      pickable: false,
      tandem: tandem.createTandem( 'moleculeNode' )
    } );
    // don't do bounds detection, it's too expensive. We're not pickable anyways
    this.moleculeNode.invalidateDOM = () => this.moleculeNode.invalidateSelf( new Bounds2( 0, 0, 0, 0 ) );
    this.moleculeNode.invalidateDOM();
    this.moleculeNode.invalidateDOM();

    // support Scenery/Joist 0.2 screenshot (takes extra work to output)
    this.moleculeNode.renderToCanvasSelf = ( wrapper, matrix ) => {
      let canvas = null;

      // Extract out the backing scale based on our trail
      // Guaranteed to be affine, 1:1 aspect ratio and axis-aligned
      const backingScale = matrix.timesMatrix( this.getUniqueTrail().getMatrix().inverted() ).m00();

      const effectiveWidth = Math.ceil( backingScale * this.screenWidth );
      const effectiveHeight = Math.ceil( backingScale * this.screenHeight );

      // This WebGL workaround is so we can avoid the preserveDrawingBuffer setting that would impact performance.
      // We render to a framebuffer and extract the pixel data directly, since we can't create another renderer and
      // share the view (three.js constraint).
      if ( MoleculeShapesGlobals.useWebGLProperty.value ) {

        // set up a framebuffer (target is three.js terminology) to render into
        const target = new THREE.WebGLRenderTarget( effectiveWidth, effectiveHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBAFormat
        } );
        // render our screen content into the framebuffer
        this.render( target );

        // set up a buffer for pixel data, in the exact typed formats we will need
        const buffer = new window.ArrayBuffer( effectiveWidth * effectiveHeight * 4 );
        const imageDataBuffer = new window.Uint8ClampedArray( buffer );
        const pixels = new window.Uint8Array( buffer );

        // read the pixel data into the buffer
        const gl = this.threeRenderer.getContext();
        gl.readPixels( 0, 0, effectiveWidth, effectiveHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels );

        // create a Canvas with the correct size, and fill it with the pixel data
        canvas = document.createElement( 'canvas' );
        canvas.width = effectiveWidth;
        canvas.height = effectiveHeight;
        const tmpContext = canvas.getContext( '2d' );
        const imageData = tmpContext.createImageData( effectiveWidth, effectiveHeight );
        imageData.data.set( imageDataBuffer );
        tmpContext.putImageData( imageData, 0, 0 );
      }
      else {
        // If just falling back to Canvas, we can directly render out!
        canvas = this.threeRenderer.domElement;
      }

      const context = wrapper.context;
      context.save();

      // Take the pixel ratio into account, see https://github.com/phetsims/molecule-shapes/issues/149
      const inverse = 1 / ( window.devicePixelRatio || 1 );

      if ( MoleculeShapesGlobals.useWebGLProperty.value ) {
        context.setTransform( 1, 0, 0, -1, 0, effectiveHeight ); // no need to take pixel scaling into account
      }
      else {
        context.setTransform( inverse, 0, 0, inverse, 0, 0 );
      }
      context.drawImage( canvas, 0, 0 );
      context.restore();
    };

    this.addChild( this.moleculeNode );

    // Keep all controls in one visibility subtree, separate from the molecule and its labels.
    this.guiNode = new Node();
    this.addChild( this.guiNode );

    // overlay Scene for bond-angle labels (if WebGL)
    this.overlayScene = new THREE.Scene(); // @private
    this.overlayCamera = new THREE.OrthographicCamera(); // @private
    this.overlayCamera.position.z = 50; // @private

    this.resetAllButton = new ResetAllButton( {
      right: this.layoutBounds.maxX - 10,
      bottom: this.layoutBounds.maxY - 10,
      listener: () => {
        model.reset();
        this.cartesianCoordinatesPanel.reset();
        this.labLearningPanel.selectedAtomProperty.reset();
        this.labLearningPanel.guidesProperty.reset();
        this.resetOrientation();
      },
      tandem: tandem.createTandem( 'resetAllButton' )
    } );
    this.guiNode.addChild( this.resetAllButton );

    const geometryNamePanel = new AlignBox( new GeometryNamePanel( model, tandem.createTandem( 'namePanel' ) ), {
      alignBounds: this.layoutBounds,
      xAlign: 'left',
      yAlign: 'bottom',
      margin: 10
    } );
    this.guiNode.addChild( geometryNamePanel );
    this.geometryNamePanel = geometryNamePanel.children[ 0 ];

    this.cartesianCoordinatesPanel = new CartesianCoordinatesPanel( this.cartesianFrame, () => this.resetOrientation(), MoleculeShapesGlobals.useWebGLProperty.value );
    this.guiNode.addChild( new AlignBox( this.cartesianCoordinatesPanel, {
      alignBounds: this.layoutBounds,
      xAlign: 'left',
      yAlign: 'top',
      margin: 10
    } ) );
    this.labLearningPanel = new LabLearningPanel( () => this.model.moleculeProperty.value );
    this.labLearningPanel.localBoundsProperty.link( () => {
      this.labLearningPanel.centerX = this.layoutBounds.centerX + 30;
      this.labLearningPanel.bottom = this.layoutBounds.maxY - 45;
    } );
    this.guiNode.addChild( this.labLearningPanel );
    this.labStatusText = new Text( 'Loading original lab textures…', { font: new PhetFont( 11 ), fill: '#dddddd', maxWidth: 310 } );
    const roomViewButtons = new HBox( { spacing: 7, children: [ 'Front', 'Side', 'Above', 'Home' ].map( name => new TextPushButton( name, {
      tandem: Tandem.OPT_OUT, font: new PhetFont( 12 ), accessibleName: `Lab ${name.toLowerCase()} view`,
      listener: () => this.setRoomView( name.toLowerCase() )
    } ) ) } );
    this.labNavigationPanel = new MoleculeShapesPanel( 'Explore the lab', new VBox( { spacing: 7, align: 'left', children: [
      new Text( 'X left / right · Y front / back · Z up / down', { font: new PhetFont( 11 ), fill: '#eeeeee', maxWidth: 310 } ),
      roomViewButtons,
      this.labStatusText
    ] } ), Tandem.OPT_OUT, { xMargin: 10, yMargin: 8 } );
    this.labNavigationPanel.localBoundsProperty.link( () => {
      this.labNavigationPanel.centerX = this.layoutBounds.centerX - 120;
      this.labNavigationPanel.top = this.layoutBounds.minY + 10;
    } );
    this.guiNode.addChild( this.labNavigationPanel );
    this.cartesianCoordinatesPanel.labProperty.link( enabled => {
      this.bookCameraPending = false;
      this.labLearningPanel.visible = enabled;
      this.labNavigationPanel.visible = enabled;
      this.labEnvironment.visible = enabled;
      this.labMoleculeFill.visible = enabled;
      this.threeCamera.far = enabled ? 250 : 100;
      this.threeCamera.updateProjectionMatrix();
      if ( enabled ) {
        this.studioOrbitQuaternion.copy( this.cartesianFrame.orbitQuaternion );
        this.setRoomView( 'home' );
        this.labEnvironment.load( this.threeRenderer );
      }
      else {
        this.cartesianFrame.orbitQuaternion.copy( this.studioOrbitQuaternion );
      }
      this.updateCameraOrientation();
    } );
    this.cartesianCoordinatesPanel.textbookLockedProperty.lazyLink( locked => {
      if ( !locked ) { this.bookCameraPending = false; }
      this.interruptSubtreeInput();
      // Both toggle directions start at the currently rendered pose. Unlocking must never reset the view,
      // and locking eases from here to the fitted textbook pose over subsequent animation frames.
      const viewedQuaternion = this.moleculeView.quaternion.clone();
      if ( locked ) { this.cartesianFrame.textbookViewQuaternion = viewedQuaternion; }
      else { this.cartesianFrame.alignmentQuaternion.copy( viewedQuaternion ); }
      this.model.moleculeQuaternionProperty.reset();
      this.updateMoleculeOrientation();
    } );

    if ( model.realMoleculeShapeProperty ) {
      model.realMoleculeShapeProperty.lazyLink( () => this.resetOrientation() );
    }

    // we only want to support dragging particles OR rotating the molecule (not both) at the same time
    let draggedParticleCount = 0;
    let isRotating = false;

    const multiDragListener = {
      down: function( event, trail ) {
        if ( !event.canStartPress() ) { return; }

        // if we are already rotating the entire molecule, no more drags can be handled
        if ( isRotating ) {
          return;
        }

        let dragMode = null;
        let draggedParticle = null;
        const pointer = event.pointer;

        const pair = self.getElectronPairUnderPointer( pointer, !( pointer instanceof Mouse ) );
        if ( self.cartesianFrame.roomEnabled && pair && !pair.isLonePair ) {
          const index = model.moleculeProperty.value.radialAtoms.indexOf( pair );
          if ( index >= 0 ) { self.labLearningPanel.selectedAtomProperty.value = index; }
        }
        if ( pair && !self.cartesianFrame.textbookLocked && self.cartesianCoordinatesPanel.dragAtomsProperty.value && !pair.userControlledProperty.value ) {
          // we start dragging that pair group with this pointer, moving it along the sphere where it can exist
          dragMode = 'pairExistingSpherical';
          draggedParticle = pair;
          pair.userControlledProperty.value = true;
          draggedParticleCount++;
        }

          // We don't want to rotate while we are dragging any particles
          // Additionally, don't rotate if we're zoomed into the sim - the pan/zoom listener will interrupt the rotation
          // to start a pan, but not until there is a little bit of pointer movement. If we are zoomed in at all
        // we don't want to allow movement that will soon just get interrupted.
        else if ( draggedParticleCount === 0 && animatedPanZoomSingleton.listener.matrixProperty.value.equalsEpsilon( Matrix3.IDENTITY, 1e-7 ) ) {
          // we rotate the entire molecule with this pointer
          dragMode = 'modelRotate';
          isRotating = true;
        }
        else {
          // can't drag the pair OR rotate the molecule
          return;
        }

        const lastGlobalPoint = pointer.point.copy();

        // If a drag starts on a pair group, input should only be for dragging. Indicate to other listeners that
        // behavior is reserved (specifically the pan/zoom listener that should not interrupt for pan).
        if ( dragMode === 'pairExistingSpherical' ) {
          pointer.reserveForDrag();
        }

        const onEndDrag = function( event, trail ) {
          if ( dragMode === 'pairExistingSpherical' ) {
            draggedParticle.userControlledProperty.value = false;
            draggedParticleCount--;
          }
          else if ( dragMode === 'modelRotate' ) {
            isRotating = false;
          }
          pointer.removeInputListener( this );
          pointer.cursor = null;
        };

        pointer.cursor = 'pointer';
        pointer.addInputListener( {
          // end drag on either up or cancel (not supporting full cancel behavior)
          up: function( event, trail ) {
            this.endDrag( event, trail );
          },
          cancel: function( event, trail ) {
            this.endDrag( event, trail );
          },

          move: function( event, trail ) {
            if ( dragMode === 'modelRotate' ) {

              const delta = pointer.point.minus( lastGlobalPoint );
              lastGlobalPoint.set( pointer.point );

              const scale = 0.007 / self.activeScale; // tuned constant for acceptable drag motion
              const newQuaternion = new THREE.Quaternion().setFromEuler( new THREE.Euler( delta.y * scale, delta.x * scale, 0 ) );
              self.bookCameraPending = false;
              model.moleculeQuaternionProperty.value = self.cartesianFrame.rotate( newQuaternion, model.moleculeQuaternionProperty.value );
              self.updateCameraOrientation();
            }
            else if ( dragMode === 'pairExistingSpherical' ) {
              if ( _.includes( model.moleculeProperty.value.groups, draggedParticle ) ) {
                draggedParticle.dragToPosition( self.getSphericalMoleculePosition( pointer.point, draggedParticle ) );
              }
            }
          },

          // not a Scenery event
          endDrag: onEndDrag,
          interrupt: onEndDrag
        }, true ); // attach the listener so that it can be interrupted from pan and zoom operations
      }
    };
    this.backgroundEventTarget.addInputListener( multiDragListener );

    // Consider updating the cursor even if we don't move? (only if we have mouse movement)? Current development
    // decision is to ignore this edge case in favor of performance.
    this.backgroundEventTarget.addInputListener( {
      mousemove: event => {
        this.backgroundEventTarget.cursor = this.cartesianCoordinatesPanel.dragAtomsProperty.value &&
          this.getElectronPairUnderPointer( event.pointer, false ) ? 'pointer' : 'grab';
      }
    } );

    // update the molecule view's rotation when the model's rotation changes
    model.moleculeQuaternionProperty.link( () => {
      // moleculeView is created in the subtype (not yet). will handle initial rotation in addMoleculeView
      if ( this.moleculeView ) {
        this.updateMoleculeOrientation();
      }
    } );

    // @private - create a pool of angle labels of the desired type
    this.angleLabels = [];
    for ( let i = 0; i < 15; i++ ) {
      if ( MoleculeShapesGlobals.useWebGLProperty.value ) {
        const label = new LabelWebGLView( this.threeRenderer );
        this.angleLabels.push( label );
        this.overlayScene.add( label );
      }
      else {
        const label = new LabelFallbackNode();
        this.angleLabels.push( label );
        this.addChild( label );
      }
    }

    this.layoutListener = () => {
      const screenWidth = this.screenWidth;
      const screenHeight = this.screenHeight;

      const simDimensions = phet.joist.sim.dimensionProperty.value;

      if ( screenWidth && screenHeight ) {
        assert && assert( screenWidth === simDimensions.width );
        assert && assert( screenHeight === simDimensions.height );

        const cameraBounds = this.localToGlobalBounds( new Bounds2( 0, 0, this.layoutBounds.width, this.layoutBounds.height ) );

        // PLEASE SEE ThreeStage.adjustViewOffset for documentation of all of this (not repeated here)
        const halfHeight = this.threeCamera.near * Math.tan( ( Math.PI / 360 ) * this.threeCamera.fov ) / this.threeCamera.zoom;
        const halfWidth = this.threeCamera.aspect * halfHeight;
        const implicitBounds = new Bounds2( 0, 0, this.screenWidth, this.screenHeight ).shifted( cameraBounds.center.negated() );
        const adjustedFullWidth = cameraBounds.width;
        const adjustedFullHeight = cameraBounds.height;
        const oldLeft = -halfWidth;
        const oldTop = halfHeight;
        const newLeft = implicitBounds.left * halfWidth / ( 0.5 * cameraBounds.width );
        const newTop = -implicitBounds.top * halfHeight / ( 0.5 * cameraBounds.height );
        const offsetX = ( newLeft - oldLeft ) * adjustedFullWidth / ( 2 * halfWidth );
        const offsetY = ( oldTop - newTop ) * adjustedFullHeight / ( 2 * halfHeight );
        this.threeCamera.setViewOffset( adjustedFullWidth, adjustedFullHeight, offsetX, offsetY, this.screenWidth, this.screenHeight );
        this.threeCamera.aspect = cameraBounds.width / cameraBounds.height;
        this.threeCamera.updateProjectionMatrix();
      }

      this.moleculeNode.invalidateDOM();
    };

    animatedPanZoomSingleton.listener.matrixProperty.lazyLink( this.layoutListener );

    // We'll want to run a single step initially to load resources. See
    // https://github.com/phetsims/molecule-shapes-basics/issues/14
    this.hasStepped = false; // private {boolean}

    // @private {function}
    this.initialStepListener = () => {
      this.step( 0 );
    };

    const guiLabelProperty = new Property( 'Hide GUI' );
    this.guiToggleButton = new TextPushButton( guiLabelProperty, {
      tandem: Tandem.OPT_OUT,
      accessibleName: guiLabelProperty,
      font: new PhetFont( 12 ),
      baseColor: '#dddddd',
      listener: () => { showGUIProperty.value = !showGUIProperty.value; }
    } );
    this.guiToggleButton.localBoundsProperty.link( () => {
      this.guiToggleButton.centerX = this.layoutBounds.centerX;
      this.guiToggleButton.bottom = this.layoutBounds.maxY - 10;
    } );
    this.addChild( this.guiToggleButton );
    this.showGUIProperty = showGUIProperty;
    showGUIProperty.link( visible => {
      this.guiNode.visible = visible;
      guiLabelProperty.value = visible ? 'Hide GUI' : 'Show GUI';
      // The navigation bar is created by Joist after screen views. It exists by the time this button is used.
      if ( phet.joist.sim && phet.joist.sim.navigationBar ) {
        phet.joist.sim.navigationBar.visible = visible;
      }
    } );

    // Accessibility pdom order
    this.pdomPlayAreaNode.pdomOrder = [
    ];

    this.pdomControlAreaNode.pdomOrder = [
      this.guiToggleButton,
      this.cartesianCoordinatesPanel,
      this.labNavigationPanel,
      this.labLearningPanel,
      geometryNamePanel
    ];
  }

  /**
   * @public
   *
   * @param {THREE.Scene} threeScene
   */
  static addLightsToScene( threeScene ) {
    const ambientLight = new THREE.AmbientLight( 0x191919 ); // closest to 0.1 like the original shader
    threeScene.add( ambientLight );

    const sunLight = new THREE.DirectionalLight( 0xffffff, 0.8 * 0.9 );
    sunLight.position.set( -1.0, 0.5, 2.0 );
    threeScene.add( sunLight );

    const moonLight = new THREE.DirectionalLight( 0xffffff, 0.6 * 0.9 );
    moonLight.position.set( 2.0, -1.0, 1.0 );
    threeScene.add( moonLight );
  }

  /**
   * Duck-typed to have the same API as needed by views
   * @public
   *
   * @returns {Object}
   */
  static createAPIStub( renderer ) {
    return {
      threeRenderer: renderer,
      threeCamera: { position: MoleculeShapesScreenView.cameraPosition },
      checkOutLabel: () => ( {
        setLabel: () => {},
        unsetLabel: () => {}
      } ),
      returnLabel: () => {}
    };
  }

  /**
   * @private
   */
  showContextLossDialog() {
    if ( !this.contextLossDialog ) {
      this.contextLossDialog = new ContextLossFailureDialog();
    }
    this.contextLossDialog.show();
  }

  /**
   * Removes a bond-angle label from the pool to be controlled
   * @public
   */
  checkOutLabel() {
    const label = this.angleLabels.pop();
    assert && assert( label );
    return label;
  }

  /**
   * Returns a bond-angle label to the pool
   * @public
   */
  returnLabel( label ) {
    assert && assert( !_.includes( this.angleLabels, label ) );
    this.angleLabels.push( label );
    label.unsetLabel();
  }

  /**
   * Adds a molcule view.
   * @public
   *
   * @param {MoleculeView} moleculeView
   */
  addMoleculeView( moleculeView ) {
    this.threeScene.add( moleculeView );

    this.updateMoleculeOrientation();
  }

  /**
   * Removes a molcule view.
   * @public
   *
   * @param {MoleculeView} moleculeView
   */
  removeMoleculeView( moleculeView ) {
    this.threeScene.remove( moleculeView );
  }

  /**
   * @private
   * @param {Vector3} screenPoint
   * @returns {THREE.Raycaster}
   */
  getRaycasterFromScreenPoint( screenPoint ) {

    // normalized device coordinates
    const ndcX = 2 * screenPoint.x / this.screenWidth - 1;
    const ndcY = 2 * ( 1 - ( screenPoint.y / this.screenHeight ) ) - 1;

    const mousePoint = new THREE.Vector3( ndcX, ndcY, 0 );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera( mousePoint, this.threeCamera );
    return raycaster;
  }

  /*
   * Global => NDC
   * @public
   *
   * @param {THREE.Vector3} globalPoint
   * @returns {THREE.Vector3}
   */
  convertScreenPointFromGlobalPoint( globalPoint ) {
    globalPoint.project( this.threeCamera );
  }

  /*
   * @private
   *
   * @param {Vector3} screenPoint
   * @returns {Ray3}
   */
  getRayFromScreenPoint( screenPoint ) {
    const threeRay = this.getRaycasterFromScreenPoint( screenPoint ).ray;
    return new Ray3( new Vector3( 0, 0, 0 ).set( threeRay.origin ),
      new Vector3( 0, 0, 0 ).set( threeRay.direction ).normalize() );
  }

  /*
   * @private
   *
   * @param {Pointer} pointer
   * @param {boolean} isTouch - Whether we should use touch regions
   * @returns {PairGroup|null} - The closest pair group, or null
   */
  getElectronPairUnderPointer( pointer, isTouch ) {
    const raycaster = this.getRaycasterFromScreenPoint( pointer.point );
    const worldRay = raycaster.ray;
    const cameraOrigin = worldRay.origin; // THREE.Vector3

    let shortestDistanceSquared = Number.POSITIVE_INFINITY;
    let closestGroup = null;

    const length = this.moleculeView.radialViews.length;
    for ( let i = 0; i < length; i++ ) {
      const view = this.moleculeView.radialViews[ i ];

      const intersectionPoint = view.intersect( worldRay, isTouch ); // THREE.Vector3
      if ( intersectionPoint ) {
        const distance = cameraOrigin.distanceToSquared( intersectionPoint );
        if ( distance < shortestDistanceSquared ) {
          shortestDistanceSquared = distance;
          closestGroup = view.group;
        }
      }
    }

    return closestGroup;
  }

  /**
   * The position in the moleculeView's coordinate system (where z=0 in the view coordinate system) for a
   * corresponding screenPoint.
   * @public
   *
   * @param {Vector2} screenPoint
   * @returns {THREE.Vector3} - in the moleculeView's local coordinate system
   */
  getPlanarMoleculePosition( screenPoint ) {
    const cameraRay = this.getRayFromScreenPoint( screenPoint );
    // Use the camera-facing plane through the central atom, including after an orbit. At the original
    // camera pose this is exactly the original XY plane, so adding groups retains its original behavior.
    const centralWorld = new THREE.Vector3().copy( this.model.moleculeProperty.value.centralAtom.positionProperty.value )
      .applyQuaternion( this.cartesianFrame.getMoleculeViewQuaternion( this.model.moleculeQuaternionProperty.value ) );
    const normal = new THREE.Vector3( 0, 0, 1 ).applyQuaternion( this.threeCamera.quaternion );
    const plane = new Plane3( new Vector3( normal.x, normal.y, normal.z ), normal.dot( centralWorld ) );
    const intersection = plane.intersectWithRay( cameraRay );
    const position = new THREE.Vector3( intersection.x, intersection.y, intersection.z );

    this.moleculeView.worldToLocal( position );

    return position;
  }

  /*
   * Returns the closest molecule model-space point on the sphere whose radius is the bond's radius.
   * @public
   *
   * @param {Vector3} screenPoint
   * @param {PairGroup} draggedParticle
   * @returns {Vector3}
   */
  getSphericalMoleculePosition( screenPoint, draggedParticle ) {

    // our main transform matrix and inverse
    const threeMatrix = this.moleculeView.matrix.clone();
    const threeInverseMatrix = new THREE.Matrix4();
    threeInverseMatrix.getInverse( threeMatrix );

    const raycaster = this.getRaycasterFromScreenPoint( screenPoint ); // {THREE.Raycaster}

    const ray = raycaster.ray.clone(); // {THREE.Ray}
    ray.applyMatrix4( threeInverseMatrix ); // global to local

    const localCameraPosition = new Vector3( 0, 0, 0 ).set( ray.origin );
    const localCameraDirection = new Vector3( 0, 0, 0 ).set( ray.direction ).normalize();

    // how far we will end up from the center atom
    const finalDistance = this.model.moleculeProperty.value.getIdealDistanceFromCenter( draggedParticle );

    // our sphere to cast our ray against
    const sphere = new Sphere3( new Vector3( 0, 0, 0 ), finalDistance );

    const epsilon = 0.000001;
    const intersections = sphere.intersections( new Ray3( localCameraPosition, localCameraDirection ), epsilon );
    if ( intersections.length === 0 ) {
      /*
       * Compute the point where the closest line through the camera and tangent to our bounding sphere intersects the sphere
       * ie, think 2d. we have a unit sphere centered at the origin, and a camera at (d,0). Our tangent point satisfies two
       * important conditions:
       * - it lies on the sphere. x^2 + y^2 == 1
       * - vector to the point (x,y) is tangent to the vector from (x,y) to our camera (d,0). thus (x,y) . (d-y, -y) == 0
       * Solve, and we get x = 1/d  plug back in for y (call that height), and we have our 2d solution.
       *
       * Now, back to 3D. Since camera is (0,0,d), our z == 1/d and our x^2 + y^2 == (our 2D y := height), then rescale them out of the unit sphere
       */

      const distanceFromCamera = localCameraPosition.distance( Vector3.ZERO );

      // first, calculate it in unit-sphere, as noted above
      const d = distanceFromCamera / finalDistance; // scaled distance to the camera (from the origin)
      const z = 1 / d; // our result z (down-scaled)
      const height = Math.sqrt( d * d - 1 ) / d; // our result (down-scaled) magnitude of (x,y,0), which is the radius of the circle composed of all points that could be tangent

      /*
       * Since our camera isn't actually on the z-axis, we need to calculate two vectors. One is the direction towards
       * the camera (planeNormal, easy!), and the other is the direction perpendicular to the planeNormal that points towards
       * the mouse pointer (planeHitDirection).
       */

      // intersect our camera ray against our perpendicular plane (perpendicular to our camera position from the origin) to determine the orientations
      const planeNormal = localCameraPosition.normalized();
      const t = -( localCameraPosition.magnitude ) / ( planeNormal.dot( localCameraDirection ) );
      const planeHitDirection = localCameraPosition.plus( localCameraDirection.times( t ) ).normalized();

      // use the above plane hit direction (perpendicular to the camera) and plane normal (collinear with the camera) to calculate the result
      const downscaledResult = planeHitDirection.times( height ).plus( planeNormal.times( z ) );

      // scale it back to our sized sphere
      return downscaledResult.times( finalDistance );
    }
    else {
      // pick the hitPoint closer to our current point (won't flip to the other side of our sphere)
      return intersections[ 0 ].hitPoint.distance( draggedParticle.positionProperty.value ) < intersections[ 1 ].hitPoint.distance( draggedParticle.positionProperty.value ) ?
             intersections[ 0 ].hitPoint :
             intersections[ 1 ].hitPoint;
    }
  }

  /**
   * @override
   * @protected
   */
  layout( viewBounds ) {
    super.layout( viewBounds );

    const simDimensions = phet.joist.sim.dimensionProperty.value;
    const width = simDimensions.width;
    const height = simDimensions.height;

    this.threeRenderer.setSize( width, height );

    this.backgroundEventTarget.setRectBounds( this.globalToLocalBounds( new Bounds2( 0, 0, width, height ) ) );

    this.screenWidth = width;
    this.screenHeight = height;

    // field of view (FOV) computation for the isometric view scaling we use
    const sx = width / this.layoutBounds.width;
    const sy = height / this.layoutBounds.height;
    if ( sx !== 0 && sy !== 0 ) {
      this.activeScale = sy > sx ? sx : sy;

      this.layoutListener();

      this.overlayCamera.left = 0;
      this.overlayCamera.right = width;
      this.overlayCamera.top = 0; // will this inversion work?
      this.overlayCamera.bottom = height;
      this.overlayCamera.near = 1;
      this.overlayCamera.far = 100;

      // three.js requires this to be called after changing the parameters
      this.overlayCamera.updateProjectionMatrix();
    }

    if ( !this.hasStepped && !phet.joist.sim.frameEndedEmitter.hasListener( this.initialStepListener ) ) {
      phet.joist.sim.frameEndedEmitter.addListener( this.initialStepListener );
    }
  }

  /**
   * @public
   *
   * @param {number} dt - Amount of time elapsed
   */
  step( dt ) {
    this.updateMoleculeOrientation( false, dt );
    this.updateCameraOrientation();
    this.moleculeView.updateView();

    const molecule = this.model.moleculeProperty.value;
    const quaternion = this.model.moleculeQuaternionProperty.value;
    const panel = this.cartesianCoordinatesPanel;
    panel.update( molecule, quaternion, this.cartesianFrame, this.textbookOrientation );
    this.cartesianCoordinatesView.update( molecule, quaternion, this.threeCamera, this.cartesianFrame,
      panel.showProperty.value, panel.planeProperty.value, panel.textbookDiagram.entries, this.model.showLonePairsProperty.value );
    const room = this.cartesianFrame.roomEnabled;
    const count = molecule.radialAtoms.length;
    if ( this.labLearningPanel.selectedAtomProperty.value >= count ) { this.labLearningPanel.selectedAtomProperty.value = 0; }
    const atom = molecule.radialAtoms[ this.labLearningPanel.selectedAtomProperty.value ];
    this.roomPositionGuides.visible = room && panel.showProperty.value && this.labLearningPanel.guidesProperty.value && !!atom;
    if ( room ) {
      const point = atom ? this.cartesianFrame.getCoordinates( atom.positionProperty.value, molecule.centralAtom.positionProperty.value, quaternion ) : null;
      this.labLearningPanel.update( molecule, point );
      if ( point ) {
        const moleculeViewQuaternion = this.cartesianFrame.getMoleculeViewQuaternion( quaternion );
        const centralWorld = new THREE.Vector3().copy( molecule.centralAtom.positionProperty.value ).applyQuaternion( moleculeViewQuaternion );
        const scenePoint = new THREE.Vector3().copy( atom.positionProperty.value )
          .sub( molecule.centralAtom.positionProperty.value ).applyQuaternion( moleculeViewQuaternion );
        this.roomPositionGuides.update( scenePoint, centralWorld, this.threeCamera, panel.planeProperty.value );
      }
      this.labStatusText.string = this.labEnvironment.error ? 'Lab could not load. Turn Lab environment off to return.' :
        this.labEnvironment.ready ? 'Drag to look around · click an atom to inspect' : 'Loading original lab textures…';
    }

    this.render( undefined );

    if ( !this.hasStepped ) {
      phet.joist.sim.frameEndedEmitter.removeListener( this.initialStepListener );
      this.hasStepped = true;
    }
  }

  /**
   * Renders the simulation to a specific rendering target
   * @public
   *
   * @param {THREE.WebGLRenderTarget|undefined} target - undefined for the default target
   */
  render( target ) {
    // The environment provides a consistent world reference. Keep the teaching model legible over room furniture.
    if ( this.cartesianFrame.roomEnabled ) {
      this.threeRenderer.setClearColor( 0x172936, 1 );
      this.threeRenderer.shadowMapEnabled = true;
      this.threeRenderer.render( this.labScene, this.threeCamera, target );
      this.threeRenderer.shadowMapEnabled = false;
      this.threeRenderer.autoClear = false;
      this.threeRenderer.clearDepth();
    }
    else {
      this.threeRenderer.setClearColor( MoleculeShapesColors.backgroundProperty.value.toNumber(), 1 );
    }
    this.threeRenderer.render( this.threeScene, this.threeCamera, target );
    this.threeRenderer.autoClear = false;
    // then render the 2D overlay on top, without clearing the Canvas in-between
    this.threeRenderer.render( this.overlayScene, this.overlayCamera, target );
    this.threeRenderer.autoClear = true;
  }

  /** @public */
  // Reset only view orientation; retain atoms, lone pairs, velocities, planes, and the selected mode.
  resetOrientation() {
    this.interruptSubtreeInput();
    this.model.moleculeQuaternionProperty.reset();
    this.updateBookCamera( 0, true );
    this.cartesianFrame.resetOrientation();
    if ( this.cartesianFrame.roomEnabled ) { this.cartesianFrame.setRoomView( -0.35, -0.18 ); }
    else { this.cartesianFrame.orbitQuaternion.copy( this.homeOrbitQuaternion ); }
    this.updateMoleculeOrientation( true );
    this.updateCameraOrientation();
  }

  /** @private - Rigidly orient the view only; the solver's positions, velocities, and angles are untouched. */
  updateMoleculeOrientation( alignToTextbook = false, dt = 0 ) {
    this.updateBookCamera( dt, alignToTextbook );
    const topologyChanged = this.textbookOrientation.update( this.model.moleculeProperty.value );
    this.cartesianFrame.molecularFrameQuaternion.copy( this.textbookOrientation.quaternion );
    if ( topologyChanged || alignToTextbook || this.cartesianFrame.textbookLocked ) {
      this.cartesianFrame.alignmentQuaternion.copy( this.textbookOrientation.quaternion );
    }
    if ( this.cartesianFrame.textbookLocked ) {
      const target = this.cartesianFrame.molecularFrameQuaternion;
      if ( !this.cartesianFrame.textbookViewQuaternion || alignToTextbook || !this.hasStepped ) {
        this.cartesianFrame.textbookViewQuaternion = target.clone();
      }
      else if ( dt > 0 ) {
        const pose = this.cartesianFrame.textbookViewQuaternion;
        const angle = 2 * Math.acos( Math.min( 1, Math.abs( pose.dot( target ) ) ) );
        if ( angle > 1e-7 ) {
          // Ease toward the new shape without a large single-frame jump, including after a long background pause.
          const elapsed = Math.min( dt, 1 / 20 );
          const fraction = Math.min( 1 - Math.exp( -elapsed / 0.12 ), 2 * Math.PI * elapsed / angle );
          pose.slerp( target, fraction ).normalize();
        }
        else { pose.copy( target ); }
      }
    }
    this.moleculeView.quaternion.copy( this.cartesianFrame.getMoleculeViewQuaternion( this.model.moleculeQuaternionProperty.value ) );
    this.moleculeView.updateMatrix();
    this.moleculeView.updateMatrixWorld();
  }

  /** @private - Update home views only on a geometry change or explicit reset. Orbit gestures cancel automatic easing. */
  updateBookCamera( dt, reset = false ) {
    const configuration = this.model.moleculeProperty.value.getCentralVSEPRConfiguration();
    const { x, e } = configuration;
    const key = `${x},${e}`;
    if ( key !== this.bookCameraKey || reset ) {
      this.bookCameraKey = key;
      const directions = TextbookGeometry( configuration.allOrientations, x, e );
      this.homeOrbitQuaternion.copy( TextbookReference( directions, x, e ).home );
      this.bookCameraPending = this.cartesianFrame.textbookLocked && !this.cartesianFrame.roomEnabled;
      if ( reset || !this.hasStepped ) {
        if ( !this.cartesianFrame.roomEnabled ) { this.cartesianFrame.orbitQuaternion.copy( this.homeOrbitQuaternion ); }
        this.bookCameraPending = false;
      }
    }
    if ( this.bookCameraPending && dt > 0 ) {
      const pose = this.cartesianFrame.orbitQuaternion;
      const angle = 2 * Math.acos( Math.min( 1, Math.abs( pose.dot( this.homeOrbitQuaternion ) ) ) );
      if ( angle > 1e-7 ) {
        const elapsed = Math.min( dt, 1 / 20 );
        pose.slerp( this.homeOrbitQuaternion, Math.min( 1 - Math.exp( -elapsed / 0.18 ), Math.PI * elapsed / angle ) ).normalize();
      }
      else { pose.copy( this.homeOrbitQuaternion ); this.bookCameraPending = false; }
    }
  }

  /** @public */
  setRoomView( name ) {
    const poses = { front: [ 0, -0.12 ], side: [ Math.PI / 2, -0.12 ], above: [ -0.35, -0.62 ], home: [ -0.35, -0.18 ] };
    const pose = poses[ name ];
    this.cartesianFrame.setRoomView( pose[ 0 ], pose[ 1 ] );
    this.updateCameraOrientation();
  }

  /** @private */
  updateCameraOrientation() {
    const molecule = this.model.moleculeProperty.value;
    if ( molecule.centralAtom ) {
      const centralWorld = new THREE.Vector3().copy( molecule.centralAtom.positionProperty.value )
        .applyQuaternion( this.cartesianFrame.getMoleculeViewQuaternion( this.model.moleculeQuaternionProperty.value ) );
      this.cartesianFrame.applyCamera( this.threeCamera,
        this.cartesianFrame.roomEnabled ? new THREE.Vector3( -1.5, -1.25, 46 ) : MoleculeShapesScreenView.cameraPosition, centralWorld );
    }
  }
}

// @public - center the molecule between the left coordinate controls and the original right controls.
MoleculeShapesScreenView.cameraPosition = new THREE.Vector3( -1.5, -1.25, 40 );

export default MoleculeShapesScreenView;
