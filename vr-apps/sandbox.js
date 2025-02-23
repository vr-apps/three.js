

import * as THREE from '../build/three.module.js';

import { Lensflare, LensflareElement } from '../examples/jsm/objects/Lensflare.js';
import { Reflector } from '../examples/jsm/objects/Reflector.js';

import { HTMLMesh } from '../examples/jsm/interactive/HTMLMesh.js';
import { InteractiveGroup } from '../examples/jsm/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from '../examples/jsm/webxr/XRControllerModelFactory.js';

import { GUI } from '../examples/jsm/libs/dat.gui.module.js';

let camera, scene, renderer;
let reflector;

const parameters = {
	radius: 0.5,
	tube: 0.2,
	tubularSegments: 150,
	radialSegments: 20,
	p: 2,
	q: 3
};

init();
animate();

export default { renderer };

function init() {

	const background = new THREE.CubeTextureLoader()
		.setPath('textures/cube/MilkyWay/')
		.load(['dark-s_px.jpg', 'dark-s_nx.jpg', 'dark-s_py.jpg', 'dark-s_ny.jpg', 'dark-s_pz.jpg', 'dark-s_nz.jpg']);

	scene = new THREE.Scene();
	scene.background = background;

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
	camera.position.set(0, 1.6, 1.5);

	//

	const torusGeometry = new THREE.TorusKnotGeometry(...Object.values(parameters));
	const torusMaterial = new THREE.MeshStandardMaterial({ roughness: 0.01, metalness: 0.2, envMap: background });
	const torus = new THREE.Mesh(torusGeometry, torusMaterial);
	torus.name = 'torus';
	torus.position.y = 1.25;
	torus.position.z = - 2;
	torus.castShadow = true;
	torus.receiveShadow = true;
	scene.add(torus);

	const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 0.1, 50);
	const cylinderMaterial = new THREE.MeshPhongMaterial();
	const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
	cylinder.position.z = - 2;
	cylinder.castShadow = true;
	cylinder.receiveShadow = true;
	scene.add(cylinder);

	const light1 = new THREE.DirectionalLight(0x8800ff);
	light1.position.set(- 1, 1.5, - 1.5);
	light1.castShadow = true;
	light1.shadow.camera.zoom = 4;
	scene.add(light1);
	light1.target.position.set(0, 0, - 2);
	scene.add(light1.target);

	// const helper1 = new THREE.CameraHelper( light.shadow.camera );
	// scene.add( helper1 );

	const light2 = new THREE.DirectionalLight(0xff0000);
	light2.position.set(1, 1.5, - 2.5);
	light2.castShadow = true;
	light2.shadow.camera.zoom = 4;
	scene.add(light2);
	light2.target.position.set(0, 0, - 2);
	scene.add(light2.target);

	// const helper2 = new THREE.CameraHelper( light.shadow.camera );
	// scene.add( helper2 );

	// lensflare
	const loader = new THREE.TextureLoader();
	const texture0 = loader.load("textures/lensflare/lensflare0.png");
	const texture3 = loader.load("textures/lensflare/lensflare3.png");

	const lensflare = new Lensflare();
	lensflare.position.set(0, 5, - 5);
	lensflare.addElement(new LensflareElement(texture0, 700, 0));
	lensflare.addElement(new LensflareElement(texture3, 60, 0.6));
	lensflare.addElement(new LensflareElement(texture3, 70, 0.7));
	lensflare.addElement(new LensflareElement(texture3, 120, 0.9));
	lensflare.addElement(new LensflareElement(texture3, 70, 1));
	scene.add(lensflare);

	//

	reflector = new Reflector(new THREE.PlaneGeometry(2, 2), {
		textureWidth: window.innerWidth * window.devicePixelRatio,
		textureHeight: window.innerHeight * window.devicePixelRatio
	});
	reflector.position.x = 1;
	reflector.position.y = 1.25;
	reflector.position.z = - 3;
	reflector.rotation.y = - Math.PI / 4;
	scene.add(reflector);

	const frameGeometry = new THREE.BoxGeometry(2.1, 2.1, 0.1);
	const frameMaterial = new THREE.MeshPhongMaterial();
	const frame = new THREE.Mesh(frameGeometry, frameMaterial);
	frame.position.z = - 0.07;
	frame.castShadow = true;
	frame.receiveShadow = true;
	reflector.add(frame);

	//

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.autoClear = false;
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.xr.enabled = true;
	document.body.appendChild(renderer.domElement);

	window.addEventListener('resize', onWindowResize);

	//

	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, - 5)]);

	const controller1 = renderer.xr.getController(0);
	controller1.add(new THREE.Line(geometry));
	scene.add(controller1);

	const controller2 = renderer.xr.getController(1);
	controller2.add(new THREE.Line(geometry));
	scene.add(controller2);

	//

	const controllerModelFactory = new XRControllerModelFactory();

	const controllerGrip1 = renderer.xr.getControllerGrip(0);
	controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
	scene.add(controllerGrip1);

	const controllerGrip2 = renderer.xr.getControllerGrip(1);
	controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
	scene.add(controllerGrip2);

	// GUI

	function onChange() {

		torus.geometry.dispose();
		torus.geometry = new THREE.TorusKnotGeometry(...Object.values(parameters));

	}

	const gui = new GUI({ width: 300 });
	gui.add(parameters, 'radius', 0.0, 1.0).onChange(onChange);
	gui.add(parameters, 'tube', 0.0, 1.0).onChange(onChange);
	gui.add(parameters, 'tubularSegments', 10, 150, 1).onChange(onChange);
	gui.add(parameters, 'radialSegments', 2, 20, 1).onChange(onChange);
	gui.add(parameters, 'p', 1, 10, 1).onChange(onChange);
	gui.add(parameters, 'q', 0, 10, 1).onChange(onChange);
	gui.domElement.style.visibility = 'hidden';

	const group = new InteractiveGroup(renderer, camera);
	scene.add(group);

	const mesh = new HTMLMesh(gui.domElement);
	mesh.position.x = - 0.75;
	mesh.position.y = 1.5;
	mesh.position.z = - 0.5;
	mesh.rotation.y = Math.PI / 4;
	mesh.scale.setScalar(2);
	group.add(mesh);

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

	renderer.setAnimationLoop(render);

}

function render() {

	const time = performance.now() * 0.0002;
	const torus = scene.getObjectByName('torus');
	torus.rotation.x = time * 2;
	torus.rotation.y = time * 5;

	renderer.render(scene, camera);

}
