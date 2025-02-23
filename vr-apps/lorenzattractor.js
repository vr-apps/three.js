

import * as THREE from '../build/three.module.js';

let camera, scene, renderer;
let attractor, light;

let x = 15 * Math.random();
let y = 15 * Math.random();
let z = 15 * Math.random();

const scale = .02; // for reducing overall displayed size
const speed = 5; // integer, increase for faster visualization

const steps = 100000;
let current = 1;
const shown = 10000;

const beta = 8 / 3;
const rho = 28;
const sigma = 10;

const dt = .005;

init();
animate();

export default { renderer };

function draw() {

	const geometry = attractor.geometry;

	geometry.attributes.position.array.copyWithin(3);
	geometry.attributes.color.array.copyWithin(3);

	if (current < steps) {

		const dx = sigma * (y - x) * dt;
		const dy = (x * (rho - z) - y) * dt;
		const dz = (x * y - beta * z) * dt;

		x += dx;
		y += dy;
		z += dz;

		geometry.attributes.position.set([scale * x, scale * y, scale * z], 0);

		light.color.setHSL(current / steps, 1, .5);

		geometry.attributes.color.set(light.color.toArray(), 0);

	}

	if (current < steps + shown) {

		current++;

	} else {

		current = 0;

	}

}

function init() {

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
	camera.position.set(0, 1.6, 1);

	//

	const geometry = new THREE.BufferGeometry();

	const positions = new Float32Array(3 * shown);

	for (let i = 0; i < positions.length; i += 3) {

		positions.set([scale * x, scale * y, scale * z], i);

	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const colors = new Float32Array(3 * shown);

	for (let i = 0; i < positions.length; i += 3) {

		colors.set([1, 0, 0], i);

	}

	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const material = new THREE.LineBasicMaterial({ vertexColors: true });

	attractor = new THREE.Line(geometry, material);
	attractor.position.set(0, 1.5, - 2);
	attractor.frustumCulled = false; // critical to avoid blackouts!
	scene.add(attractor);

	//

	light = new THREE.PointLight(0xffffff, 1);
	light.distance = 2;
	attractor.add(light);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(10, 10),
		new THREE.MeshPhongMaterial()
	);
	ground.geometry.rotateX(- 90 * Math.PI / 180);
	scene.add(ground);

	//

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	document.body.appendChild(renderer.domElement);

	//

	window.addEventListener('resize', onWindowResize);

	//

	if (typeof TESTING !== 'undefined') { for (let i = 0; i < 200; i++) { render(); } };

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

	for (let i = 0; i < speed; i++) draw();

	attractor.geometry.attributes.position.needsUpdate = true;
	attractor.geometry.attributes.color.needsUpdate = true;
	attractor.rotation.z += .001;

	renderer.render(scene, camera);

}
