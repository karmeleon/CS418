// matrices
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// shader program
var shaderProgram;

// gl buffers
// vertex
var sceneVertexPositionBuffer;

// index
var sceneVertexIndexBuffer;

// texturecoords
var sceneTextureCoordBuffer;

// textures
var composedTerrainTexture;

var rockTexture;
var snowTexture;

// pressed keys
var keysDown = {};

// units per second
var airSpeed = 0.2;
// degrees per second
var turnSpeed = 35.0;
// keep track of the last time movement was processed, in microseconds
var lastFrame = -1;

// keeps track of whether or not the textures have loaded
var loadedTextureCount = 0;

var useLighting = true;

function startGL() {
	var canvas = document.getElementById("mp2-canvas");
	initGL(canvas);
	initShaders();
	initBuffers();
	initTextures();

	gl.clearColor(0.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;

	tick();
}

function handleKeyDown(event) {
	if(event.keyCode == 76)
		useLighting = !useLighting;
	keysDown[event.keyCode] = true;
}

function handleKeyUp(event) {
	keysDown[event.keyCode] = false;
}

function tick() {
	requestAnimFrame(tick);

	if(loadedTextureCount == 3) {
		document.getElementById("loading-message").style.display = "none";
		drawScene();
		animate();
	}
	
	trackFPS("fps-counter");
}

function initShaders() {
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	console.log("loading vertex shader");
	gl.attachShader(shaderProgram, vertexShader);
	console.log("loading fragment shader");
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not link shaders. Make sure your graphics drivers are up to date and try a different browser.");
	}

	gl.useProgram(shaderProgram);

	// attributes
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	// uniforms
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.fragTerrainSamplerUniform = gl.getUniformLocation(shaderProgram, "uFragTerrainData");
	shaderProgram.vertTerrainSamplerUniform = gl.getUniformLocation(shaderProgram, "uVertTerrainData");
	shaderProgram.rockTextureSamplerUniform = gl.getUniformLocation(shaderProgram, "uRockTexture");
	shaderProgram.snowTextureSamplerUniform = gl.getUniformLocation(shaderProgram, "uSnowTexture");
	shaderProgram.lightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
}

function initBuffers() {
	// gives us 65536 vertices, the maximum addressable by the 16-bit unsigned ints used in the index buffer
	// anything more than that and the model implodes
	var gridSize = 256;

	sceneVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sceneVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generateBigSquare(gridSize)), gl.STATIC_DRAW);
	sceneVertexPositionBuffer.itemSize = 2;
	sceneVertexPositionBuffer.numItems = gridSize * gridSize;
	
	sceneTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generateTextureCoords(gridSize)), gl.STATIC_DRAW);
	sceneTextureCoordBuffer.itemSize = 2;
	sceneTextureCoordBuffer.numItems = gridSize * gridSize;

	sceneVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sceneVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(generateIndices(gridSize)), gl.STATIC_DRAW);
	sceneVertexIndexBuffer.itemSize = 1;
	sceneVertexIndexBuffer.numItems = 3 * (2 * (gridSize - 1) * (gridSize - 1));

	// put the mvmatrix in the right place
	mat4.lookAt(mvMatrix, [0.0, 3.0, 6.0], [0.0, 3.0, 5.0], [0.0, 1.0, 0.0]);
}

function xyToi(x, y, width, skip) {
	return skip * (width * y + x);
}

function generateBigSquare(side) {
	var vertices = [];
	var sideLength = 25.0;
	for(var i = 0; i < side; i++) {	// y
		for(var j = 0; j < side; j++) {	// x
			vertices[xyToi(j, i, side, 2)] = ((j / side) * sideLength) - (sideLength / 2);
			vertices[xyToi(j, i, side, 2) + 1] = ((i / side) * sideLength) - (sideLength / 2);
			// the y coord will always be 0 so we don't need to include it
		}
	}
	return vertices;
}

function generateTextureCoords(side) {
	var coords = [];
	for(var i = 0; i < side; i++) {	// y
		for(var j = 0; j < side; j++) {	// x
			coords[xyToi(j, i, side, 2)] = j / side;
			coords[xyToi(j, i, side, 2) + 1] = i / side;
			if(coords[xyToi(j, i, side, 2)] < 0.0 || coords[xyToi(j, i, side, 2) + 1] < 0.0)
				console.log("texture coords are hard");
		}
	}
	return coords;
}

function generateIndices(side) {
	var indices = [];
	for(var i = 0; i < side - 1; i++) {	// y
		for(var j = 0; j < side - 1; j++) {	// x
			// generate top polygon
			indices[((2 * i * (side - 1)) + j) * 3] = xyToi(j + 1, i, side, 1);
			indices[((2 * i * (side - 1)) + j) * 3 + 1] = xyToi(j, i, side, 1);
			indices[((2 * i * (side - 1)) + j) * 3 + 2] = xyToi(j + 1, i + 1, side, 1);

			// generate bottom polygon
			indices[((2 * i * (side - 1)) + side - 1 + j) * 3] = xyToi(j, i, side, 1);
			indices[((2 * i * (side - 1)) + side - 1 + j) * 3 + 1] = xyToi(j, i + 1, side, 1);
			indices[((2 * i * (side - 1)) + side - 1 + j) * 3 + 2] = xyToi(j + 1, i + 1, side, 1);
		}
	}
	return indices;
}

function initTextures() {
	composedTerrainTexture = gl.createTexture();
	composedTerrainTexture.image = new Image();
	composedTerrainTexture.image.onload = function() {
		handleLoadedTexture(composedTerrainTexture);
	}
	composedTerrainTexture.image.src = "alpine-terrain-composed.png"

	rockTexture = gl.createTexture();
	rockTexture.image = new Image();
	rockTexture.image.onload = function() {
		handleLoadedTexture(rockTexture);
	}
	rockTexture.image.src = "rock.png";

	snowTexture = gl.createTexture();
	snowTexture.image = new Image();
	snowTexture.image.onload = function() {
		handleLoadedTexture(snowTexture);
	}
	snowTexture.image.src = "snow.png";
}

function handleLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
	loadedTextureCount++;
}

function setUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	
	var a = mat3.create();
	var b = mat3.create();
	var nMatrix = mat3.create();
	mat3.fromMat4(a, mvMatrix);
	mat3.invert(b, a);
	mat3.transpose(nMatrix, b);

	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
	gl.uniform1i(shaderProgram.lightingUniform, useLighting);
}

function animate() {
	//var current = window.performance.now();
	var current = new Date().getTime();
	if(lastFrame == -1)
		lastFrame = current;
	// we want the time in seconds for simplicity
	var elapsed = (current - lastFrame) / 1000.0;
	lastFrame = current;

	var zRot = 0;
	var yRot = 0;
	var xRot = 0;
	// handle keys here
	if(keysDown[87]) {
		// W, rotate in the negative direction about the x axis
		xRot += elapsed * turnSpeed;
	}

	if(keysDown[83]) {
		// S, rotate in the positive direction about the x axis
		xRot -= elapsed * turnSpeed;
	}

	if(keysDown[65]) {
		// A, rotate left
		yRot -= elapsed * turnSpeed;
	}

	if(keysDown[68]) {
		// D, rotate right
		yRot += elapsed * turnSpeed;
	}

	if(keysDown[81]) {
		// Q, rotate in the negative direction about the z axis
		zRot -= elapsed * turnSpeed;
	}

	if(keysDown[69]) {
		// E, rotate in the positive direction about the z axis
		zRot += elapsed * turnSpeed;
	}

	var a = mat4.create();
	var b = mat4.create();
	var c = mat4.create();
	mat4.copy(c, mvMatrix);

	//rotate that shit
	mat4.rotateZ(a, mat4.create(), degToRad(zRot));
	mat4.rotateY(b, a, degToRad(yRot));
	mat4.rotateX(a, b, degToRad(xRot));

	//translate that shit
	mat4.translate(b, a, [0, 0, elapsed * airSpeed]);
	mat4.multiply(mvMatrix, b, c);
}

//var derp = 0;
function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
	
	// bind textures
	// composed map
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, composedTerrainTexture);
	gl.uniform1i(shaderProgram.fragTerrainSamplerUniform, 0);
	gl.uniform1i(shaderProgram.vertTerrainSamplerUniform, 0);

	// rock texture
	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, rockTexture);
	gl.uniform1i(shaderProgram.rockTextureSamplerUniform, 3);

	// snow texture
	gl.activeTexture(gl.TEXTURE4);
	gl.bindTexture(gl.TEXTURE_2D, snowTexture);
	gl.uniform1i(shaderProgram.snowTextureSamplerUniform, 4);

	gl.bindBuffer(gl.ARRAY_BUFFER, sceneVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sceneVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, sceneTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sceneVertexIndexBuffer);
	
	setUniforms();
	gl.drawElements(gl.TRIANGLES, sceneVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}