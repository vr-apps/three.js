

import * as THREE from '../build/three.module.js';
import { GUI } from '../examples/jsm/libs/dat.gui.module.js';
import { HTMLMesh } from '../examples/jsm/interactive/HTMLMesh.js';
import { InteractiveGroup } from '../examples/jsm/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from '../examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from '../examples/jsm/webxr/XRHandModelFactory.js';

let container;
let camera, scene, renderer;
let hand1, hand2;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let video;

// Four eye charts are rendered to demonstrate the differences in text quality. The two
// charts on the bottom are rendered to the eye buffer while the two charts on the top are
// rendered into XRQuadLayers, and the latter pair are substantially more legible.
//
// The two charts on the left are rendered without mipmaps and have aliasing artifacts while
// the two charts on the right are with mipmaps an don't twinkle but are blurrier. To
// maximize text legibility, it's important to choose a texture size optimized for the
// distance of the text. (This example intentionally uses incorrectly large textures to
// demonstrate this issue.) If the optimal text size can't be determined beforehand, then
// mipmaps are required to avoid aliasing.
//
// The background of the scene is an equirectangular layer. It uses an XRMediaBinding to
// render the contents of a video element into the scene. This example uses a low resolution
// video to avoid large files, but using media layers allows video that is higher resolution than normal rendering.

let snellenTexture;
let quadLayerPlain;
let quadLayerMips;
let guiLayer;
let guiMesh;
let errorMesh;

// Set via GUI.
const parameters = {
	eyeChartDistanceFt: 20,
};

// Data shared between the THREE.Meshes on the bottom and WebXR Layers on the top for the eye
// charts. See https://en.wikipedia.org/wiki/Snellen_chart for details about the math.
//
// The image was designed so that each 2x2px block on the 20/20 line subtends 1 minute of
// arc. That is
//    tan(1/60 deg) * 6.1m * 160px/142mm = 2px
// per block on line 8.
//
// This fidelity is beyond any modern consumer headset since it would require ~60px/deg of
// resolution. The Quest has ~16ppd and the Quest 2 has ~20ppd so only lines 3 or 4 will be
// legible when using layers. Without layers, you lose ~sqrt(2) in resolution due to the
// extra resampling.
const snellenConfig = {
	// The texture is a power of two so that mipmaps can be generated.
	textureSizePx: 512,
	// This is the valid part of the image.
	widthPx: 320,
	heightPx: 450,

	x: 0,
	y: 1.5,
	z: - 6.1, // 20/20 vision @ 20ft = 6.1m

	// This is the size of mesh and the visible part of the quad layer.
	widthMeters: .268, // 320px image * (142mm/160px scale factor)
	heightMeters: .382 // 450px image * (142mm/160px scale factor)
};

snellenConfig.cropX = snellenConfig.widthPx / snellenConfig.textureSizePx;
snellenConfig.cropY = snellenConfig.heightPx / snellenConfig.textureSizePx;

// The quad layer is a [-1, 1] quad but only a part of it has image data. Scale the layer so
// that the part with image data is the same size as the mesh.
snellenConfig.quadWidth = .5 * snellenConfig.widthMeters / snellenConfig.cropX;
snellenConfig.quadHeight = .5 * snellenConfig.heightMeters / snellenConfig.cropY;

init();
animate();

export default { renderer };

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
	camera.position.set(0, 1.6, 3);


	scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

	const light = new THREE.DirectionalLight(0xffffff);
	light.position.set(0, 6, 0);
	light.castShadow = true;
	light.shadow.camera.top = 2;
	light.shadow.camera.bottom = - 2;
	light.shadow.camera.right = 2;
	light.shadow.camera.left = - 2;
	light.shadow.mapSize.set(4096, 4096);
	scene.add(light);

	//

	renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setClearAlpha(1);
	renderer.setClearColor(new THREE.Color(0), 0);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;
	renderer.xr.enabled = true;

	container.appendChild(renderer.domElement);

	// controllers

	controller1 = renderer.xr.getController(0);
	scene.add(controller1);

	controller2 = renderer.xr.getController(1);
	scene.add(controller2);

	const controllerModelFactory = new XRControllerModelFactory();
	const handModelFactory = new XRHandModelFactory().setPath("./models/fbx/");

	// Hand 1
	controllerGrip1 = renderer.xr.getControllerGrip(0);
	controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
	scene.add(controllerGrip1);

	hand1 = renderer.xr.getHand(0);
	hand1.add(handModelFactory.createHandModel(hand1));

	scene.add(hand1);

	// Hand 2
	controllerGrip2 = renderer.xr.getControllerGrip(1);
	controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
	scene.add(controllerGrip2);

	hand2 = renderer.xr.getHand(1);
	hand2.add(handModelFactory.createHandModel(hand2));
	scene.add(hand2);

	//

	const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, - 1)]);

	const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x5555ff }));
	line.name = 'line';
	line.scale.z = 10;

	controller1.add(line.clone());
	controller2.add(line.clone());

	// Eye charts
	const eyeCharts = new THREE.Group();
	eyeCharts.position.z = snellenConfig.z;
	scene.add(eyeCharts);

	snellenTexture = new THREE.TextureLoader().load("textures/snellen.png");
	snellenTexture.repeat.x = snellenConfig.cropX;
	snellenTexture.repeat.y = snellenConfig.cropY;
	snellenTexture.generateMipmaps = false;
	snellenTexture.minFilter = THREE.LinearFilter;
	const snellenMeshPlain = new THREE.Mesh(
		new THREE.PlaneGeometry(snellenConfig.widthMeters, snellenConfig.heightMeters),
		new THREE.MeshBasicMaterial({ map: snellenTexture }));
	snellenMeshPlain.position.x = snellenConfig.x - snellenConfig.widthMeters;
	snellenMeshPlain.position.y = snellenConfig.y - snellenConfig.heightMeters;
	eyeCharts.add(snellenMeshPlain);

	snellenTexture = new THREE.TextureLoader().load("textures/snellen.png");
	snellenTexture.repeat.x = snellenConfig.cropX;
	snellenTexture.repeat.y = snellenConfig.cropY;
	const snellenMeshMipMap = new THREE.Mesh(
		new THREE.PlaneGeometry(snellenConfig.widthMeters, snellenConfig.heightMeters),
		new THREE.MeshBasicMaterial({ map: snellenTexture }));
	snellenMeshMipMap.position.x = snellenConfig.x + snellenConfig.widthMeters;
	snellenMeshMipMap.position.y = snellenConfig.y - snellenConfig.heightMeters;
	eyeCharts.add(snellenMeshMipMap);

	// The layers don't participate depth testing between each other. Since the projection
	// layer is rendered last, any 3D object will incorrecly overlap layers. To avoid this,
	// invisible quads can be placed into the scene to participate in depth testing when the
	// projection layer is rendered.
	const dummyMeshLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(snellenConfig.widthMeters, snellenConfig.heightMeters),
		new THREE.MeshBasicMaterial({ opacity: 0 }));
	dummyMeshLeft.position.x = snellenConfig.x - snellenConfig.widthMeters;
	dummyMeshLeft.position.y = snellenConfig.y + snellenConfig.heightMeters;
	eyeCharts.add(dummyMeshLeft);

	const dummyMeshRight = dummyMeshLeft.clone(true);
	dummyMeshRight.position.x = snellenConfig.x + snellenConfig.widthMeters;
	eyeCharts.add(dummyMeshRight);

	// The GUI is rendered into an invisible HTMLMesh and the backing canvas's data is copied
	// into a layer as required. Hit testing and interaction is done using standard HTMLMesh
	// behavior, but since the layer is in the same place as the invisible mesh, the user
	// thinks they're directly interacting with the layer.
	const gui = new GUI({ width: 300 });
	gui.add(parameters, 'eyeChartDistanceFt', 1.0, 20.0).onChange(onChange);
	gui.domElement.style.visibility = 'hidden';

	function onChange() {

		eyeCharts.position.z = - parameters.eyeChartDistanceFt * 0.3048;

		if (quadLayerPlain) {

			quadLayerPlain.transform = new XRRigidTransform({
				x: snellenConfig.x - snellenConfig.widthMeters,
				y: snellenConfig.y + snellenConfig.heightMeters,
				z: eyeCharts.position.z
			});

		}

		if (quadLayerMips) {

			quadLayerMips.transform = new XRRigidTransform({
				x: snellenConfig.x + snellenConfig.widthMeters,
				y: snellenConfig.y + snellenConfig.heightMeters,
				z: eyeCharts.position.z
			});

		}

		guiLayer.needsUpdate = true;

	}

	const group = new InteractiveGroup(renderer, camera);
	scene.add(group);

	guiMesh = new HTMLMesh(gui.domElement);
	guiMesh.position.x = 1.0;
	guiMesh.position.y = 1.5;
	guiMesh.position.z = - 1.0;
	guiMesh.rotation.y = - Math.PI / 4;
	guiMesh.scale.setScalar(2);
	guiMesh.material.opacity = 0;
	group.add(guiMesh);

	// Error message if layer initialization fails.
	const errorCanvas = document.createElement('canvas');
	errorCanvas.width = 400;
	errorCanvas.height = 40;
	const errorContext = errorCanvas.getContext('2d');
	errorContext.fillStyle = '#FF0000';
	errorContext.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
	errorContext.fillStyle = '#000000';
	errorContext.font = '28px sans-serif';
	errorContext.fillText('ERROR: Layers not initialized!', 10, 30);

	errorMesh = new THREE.Mesh(
		new THREE.PlaneGeometry(1, .1),
		new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(errorCanvas) })
	);
	errorMesh.position.z = - 1;
	errorMesh.position.y = 1.5;
	errorMesh.visible = false;
	scene.add(errorMesh);

	window.addEventListener('resize', onWindowResize, false);

	video = document.createElement('video');
	video.loop = true;
	video.src = 'textures/MaryOculus.webm';

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}
//

function animate() {

	renderer.setAnimationLoop(render);

}

function render(t, frame) {

	const xr = renderer.xr;
	const session = xr.getSession();
	const gl = renderer.getContext();

	// Init layers once in immersive mode and video is ready.
	if (session && session.renderState.layers === undefined) {

		errorMesh.visible = true;

	}

	if (session && session.renderState.layers !== undefined && session.hasMediaLayer === undefined && video.readyState >= 2) {

		session.hasMediaLayer = true;
		session.requestReferenceSpace('local-floor').then((refSpace) => {

			// Create Quad layers for Snellen chart.
			const glBinding = new XRWebGLBinding(session, gl);
			const quadLayerConfig = {
				width: snellenConfig.quadWidth,
				height: snellenConfig.quadHeight,
				viewPixelWidth: snellenConfig.textureSizePx,
				viewPixelHeight: snellenConfig.textureSizePx,
				isStatic: true,
				space: refSpace, layout: "mono",
				transform: new XRRigidTransform({
					x: snellenConfig.x - snellenConfig.widthMeters,
					y: snellenConfig.y + snellenConfig.heightMeters,
					z: snellenConfig.z
				})

			};

			quadLayerPlain = glBinding.createQuadLayer(quadLayerConfig);

			quadLayerConfig.mipLevels = 3;
			quadLayerConfig.transform = new XRRigidTransform({
				x: snellenConfig.x + snellenConfig.widthMeters,
				y: snellenConfig.y + snellenConfig.heightMeters,
				z: snellenConfig.z
			});
			quadLayerMips = glBinding.createQuadLayer(quadLayerConfig);

			// Create GUI layer.
			guiLayer = glBinding.createQuadLayer({
				width: guiMesh.geometry.parameters.width,
				height: guiMesh.geometry.parameters.height,
				viewPixelWidth: guiMesh.material.map.image.width,
				viewPixelHeight: guiMesh.material.map.image.height,
				space: refSpace,
				transform: new XRRigidTransform(guiMesh.position, guiMesh.quaternion)
			});

			// Create background EQR video layer.
			const mediaBinding = new XRMediaBinding(session);
			const equirectLayer = mediaBinding.createEquirectLayer(
				video,
				{
					space: refSpace,
					layout: "stereo-left-right",
					// Rotate by 45 deg to avoid stereo conflict with the 3D geometry.
					transform: new XRRigidTransform(
						{},
						{ x: 0, y: .28, z: 0, w: .96 })
				}
			);

			errorMesh.visible = false;
			session.updateRenderState({ layers: [equirectLayer, quadLayerPlain, quadLayerMips, guiLayer, session.renderState.layers[0]] });
			video.play();

		});

	}

	// Copy image to layers as required.
	// needsRedraw is set on creation or if the underlying GL resources of a layer are lost.
	if (quadLayerPlain && quadLayerPlain.needsRedraw) {

		const glBinding = new XRWebGLBinding(session, gl);
		const glayer = glBinding.getSubImage(quadLayerPlain, frame);
		renderer.state.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texSubImage2D(gl.TEXTURE_2D, 0,
			(snellenConfig.textureSizePx - snellenConfig.widthPx) / 2,
			(snellenConfig.textureSizePx - snellenConfig.heightPx) / 2,
			snellenConfig.widthPx, snellenConfig.heightPx,
			gl.RGBA, gl.UNSIGNED_BYTE, snellenTexture.image);

	}

	// Same as above but also gl.generateMipmap.
	if (quadLayerMips && quadLayerMips.needsRedraw) {

		const glBinding = new XRWebGLBinding(session, gl);
		const glayer = glBinding.getSubImage(quadLayerMips, frame);
		renderer.state.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texSubImage2D(gl.TEXTURE_2D, 0,
			(snellenConfig.textureSizePx - snellenConfig.widthPx) / 2,
			(snellenConfig.textureSizePx - snellenConfig.heightPx) / 2,
			snellenConfig.widthPx, snellenConfig.heightPx,
			gl.RGBA, gl.UNSIGNED_BYTE, snellenTexture.image);
		gl.generateMipmap(gl.TEXTURE_2D);

	}

	// Same as above, but guiLayer.needsUpdate is set when the user interacts with the GUI.
	if (guiLayer && (guiLayer.needsRedraw || guiLayer.needsUpdate)) {

		const glBinding = new XRWebGLBinding(session, gl);
		const glayer = glBinding.getSubImage(guiLayer, frame);
		renderer.state.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		const canvas = guiMesh.material.map.image;
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

	}

	renderer.render(scene, camera);

}

