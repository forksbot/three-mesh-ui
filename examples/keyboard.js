
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';

import ThreeMeshUI from '../src/three-mesh-ui.js';
import VRControl from './utils/VRControl.js';
import ShadowedLight from './utils/ShadowedLight.js';

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

let scene, camera, renderer, controls, vrControl, keyboard;
let objsToTest = [];

const raycaster = new THREE.Raycaster();

// compute mouse position in normalized device coordinates
// (-1 to +1) for both directions.
// Used to raycasting against the interactive elements

const mouse = new THREE.Vector2();
mouse.x = mouse.y = null;

let selectState = false;
let touchState = false;

window.addEventListener( 'mousemove', ( event )=>{
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
});

window.addEventListener( 'mousedown', ()=> { selectState = true });

window.addEventListener( 'mouseup', ()=> { selectState = false });

window.addEventListener( 'touchstart', ( event )=> {
	touchState = true;
	mouse.x = ( event.touches[0].clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.touches[0].clientY / window.innerHeight ) * 2 + 1;
});

window.addEventListener( 'touchend', ()=> {
	touchState = false;
	mouse.x = null;
	mouse.y = null;
});

//

window.addEventListener('load', init );
window.addEventListener('resize', onWindowResize );

//

function init() {

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x505050 );

	camera = new THREE.PerspectiveCamera( 60, WIDTH / HEIGHT, 0.1, 100 );

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.xr.enabled = true;
	document.body.appendChild( VRButton.createButton(renderer) );
	document.body.appendChild( renderer.domElement );
	renderer.shadowMap.enabled = true ;

	// LIGHT

	const light = ShadowedLight({
		z: 10,
		width: 6,
		bias: -0.0001
	});

	const hemLight = new THREE.HemisphereLight( 0x808080, 0x606060 );

	scene.add( light, hemLight );

	// CONTROLLERS

	controls = new OrbitControls( camera, renderer.domElement );
	camera.position.set( 0, 1.6, 0 );
	controls.target = new THREE.Vector3( 0, 1.2, -1 );
	controls.update();

	//

	vrControl = VRControl( renderer, camera, scene );

	scene.add( vrControl.controllerGrips[ 0 ], vrControl.controllers[ 0 ] );

	vrControl.controllers[ 0 ].addEventListener( 'selectstart', ()=> { selectState = true } );
	vrControl.controllers[ 0 ].addEventListener( 'selectend', ()=> { selectState = false } );

	// ROOM

	const room = new THREE.LineSegments(
        new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
		new THREE.LineBasicMaterial( { color: 0x808080 } )
	);
	
	const roomMesh = new THREE.Mesh(
		new THREE.BoxGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
		new THREE.MeshBasicMaterial({
			side: THREE.BackSide,
			transparent: true,
			opacity: 0
		}),
	);

	scene.add( room, roomMesh );
    objsToTest.push(roomMesh);

    // USER INTERFACE

    makeUI();

	// LOOP

	renderer.setAnimationLoop( loop );

};

//

function makeUI() {

	// PANEL MATERIALS

	const foregroundMaterial = new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
	const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x5c5c5c });
	const hoveredMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1c1c });
	const selectedMaterial = new THREE.MeshBasicMaterial({ color: 0x109c5d });

	// TEXT PANEL

    const textPanel = ThreeMeshUI.Block({
    	fontFamily: './assets/Roboto-msdf.json',
		fontTexture: './assets/Roboto-msdf.png',
    	width: 1,
    	height: 0.5,
    	backgroundMaterial: foregroundMaterial
    });

    textPanel.position.set( 0, 1.4, -1.2 );
	textPanel.rotation.x = -0.15;
    scene.add( textPanel );

    //

    const title = ThreeMeshUI.Block({
    	width: 1,
    	height: 0.1,
    	justifyContent: 'center',
    	fontSize: 0.045
    }).add(
    	ThreeMeshUI.Text({ content: 'Type some text on the keyboard' })
    );

    const userText = ThreeMeshUI.Text({ content: '' });

    const textField = ThreeMeshUI.Block({
    	width: 1,
    	height: 0.4,
    	fontSize: 0.033,
    	padding: 0.02
    }).add( userText );

    title.frameContainer.visible = textField.frameContainer.visible = false;

    textPanel.add( title, textField );

	// KEYBOARD

	keyboard = ThreeMeshUI.Keyboard({
		fontFamily: './assets/Roboto-msdf.json',
		fontTexture: './assets/Roboto-msdf.png',
		backgroundMaterial: backgroundMaterial
	});

	keyboard.position.set( 0, 0.88, -1 );
	keyboard.rotation.x = -0.55;
	scene.add( keyboard );

	//

	keyboard.keys.forEach( (key)=> {

		objsToTest.push( key );

		key.setupState({
			state: 'idle',
			attributes: {
				offset: 0,
				backgroundMaterial: foregroundMaterial
			}
		});

		key.setupState({
			state: 'hovered',
			attributes: {
				offset: 0,
				backgroundMaterial: hoveredMaterial
			}
		});

		key.setupState({
			state: 'selected',
			attributes: {
				offset: -0.009,
				backgroundMaterial: selectedMaterial
			},
			// triggered when the user clicked on a keyboard's key
			onSet: ()=> {

				// if the key have a command (eg: 'backspace', 'switch', 'enter'...)
				// special actions are taken
				if ( key.info.command ) {

					switch( key.info.command ) {

						// switch between letters and symbols panels
						case 'switch' :
							keyboard.setNextPanel();
							break;

						case 'enter' :
							userText.set({
								content: userText.content += '\n'
							});
							break;

						case 'space' :
							userText.set({
								content: userText.content += ' '
							});
							break;

						case 'backspace' :
							if ( !userText.content.length ) break
							userText.set({
								content: userText.content.substring(0, userText.content.length - 1) || ""
							});
							break;

						case 'shift' :
							keyboard.toggleCase();
							break;

					};

				// print a glyph, if any
				} else if ( key.info.input ) {

					userText.set({
						content: userText.content += key.info.input
					});

				};

			}
		});

	});

};

//

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
};

//

function loop() {

	// Don't forget, ThreeMeshUI must be updated manually.
	// This has been introduced in version 3.0.0 in order
	// to improve performance
	ThreeMeshUI.update();

	controls.update();
	renderer.render( scene, camera );
	updateButtons();
};

// Called in the loop, get intersection with either the mouse or the VR controllers,
// then update the buttons states according to result

function updateButtons() {

	// Find closest intersecting object

	let intersect;

	if ( renderer.xr.isPresenting ) {

		vrControl.setFromController( 0, raycaster.ray );

		intersect = raycast();

		// Position the little white dot at the end of the controller pointing ray
		if ( intersect ) vrControl.setPointerAt( 0, intersect.point );

	} else if ( mouse.x !== null && mouse.y !== null ) {

		raycaster.setFromCamera( mouse, camera );

		intersect = raycast();

	};

	// Update targeted button state (if any)

	if ( intersect && intersect.object.isUI ) {

		if ( (selectState && intersect.object.currentState === 'hovered') || touchState ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState( 'selected' );

		} else if ( !selectState && !touchState ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState( 'hovered' );

		};

	};

	// Update non-targeted buttons state

	objsToTest.forEach( (obj)=> {

		if ( (!intersect || obj !== intersect.object) && obj.isUI ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			obj.setState( 'idle' );

		};

	});

};

//

function raycast() {

	return objsToTest.reduce( (closestIntersection, obj)=> {

		// Everything that is not a child of scene is pruned out
		if ( !obj || !scene.getObjectById( obj.id ) ) return closestIntersection

		const intersection = raycaster.intersectObject( obj, true );

		// if intersection is an empty array, we skip
		if ( !intersection[0] ) return closestIntersection

		// if this intersection is closer than any previous intersection, we keep it
		if ( !closestIntersection || intersection[0].distance < closestIntersection.distance ) {

			// Make sure to return the UI object, and not one of its children (text, frame...)
			intersection[0].object = obj;

			return intersection[0]

		} else {

			return closestIntersection

		};

	}, null );

};
