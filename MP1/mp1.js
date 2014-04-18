//Much of the boilerplate code for this MP was taken from http://learningwebgl.com/blog/?page_id=1217
//However, all of the actual drawing code is completely original.

//our GL context
var gl;

//sets up the GL context by finding the canvas
function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch(e) { }
	if(!gl)
		alert("WebGL doesn't appear to be enabled on this browser.");
}

//searches the document for shaders, compiles them, then assembles them into a program
function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if(!shaderScript)
		return null;

	var str = "";
	var k = shaderScript.firstChild;
	while(k) {
		if(k.nodeType == 3)
			str += k.textContent;
		k = k.nextSibling;
	}

	var shader;
	if(shaderScript.type == "x-shader/x-fragment")
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	else if(shaderScript.type == "x-shader/x-vertex")
		shader = gl.createShader(gl.VERTEX_SHADER);
	else
		return null;

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

var shaderProgram;

//finds the fragment and vertex shaders, links them together, then links their uniform and attrib values to their JS counterparts
function initShaders() {
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not link shaders. Make sure your graphics drivers are up to date and try a different browser.");
	}

	gl.useProgram(shaderProgram);

	//flag our varyings
	//basic
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	//animation
	shaderProgram.targetOffsetAttribute = gl.getAttribLocation(shaderProgram, "aTargetOffset");
	gl.enableVertexAttribArray(shaderProgram.targetOffsetAttribute);

	shaderProgram.prevOffsetAttribute = gl.getAttribLocation(shaderProgram, "aPrevOffset");
	gl.enableVertexAttribArray(shaderProgram.prevOffsetAttribute);

	//and our uniforms
	//matrices
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

	//we only ever draw with one color at a time, so we can just use a uniform for color too
	shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");

	//animation
	shaderProgram.animationPctUniform = gl.getUniformLocation(shaderProgram, "uProgress");

	//depth coloring
	shaderProgram.depthColoringUniform = gl.getUniformLocation(shaderProgram, "uDepthColoring");
}

//Main loop.
function tick() {
	//from webgl-utils.js, flags this function as the one that should be called when the browser wants to redraw the canvas
	requestAnimFrame(tick);

	if(document.getElementById("go").checked)
		animate();

	drawScene();

	trackFPS("fps-counter");
}

//finds the canvas, sets up the GL context, sets up all the shaders and buffers we need, then starts the main loop
function startGL() {
	var canvas = document.getElementById("mp1-canvas");
	initGL(canvas);
	initShaders();
	initAnimation();
	initBuffers();

	//clear the canvas to start with
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	//turn on depth testing
	gl.enable(gl.DEPTH_TEST);

	//start it ticking
	tick();
}

//model view matrix
var mvMatrix = mat4.create();
//projection matrix
var pMatrix = mat4.create();

//passes all uniforms in one fell swoop
function setUniforms() {
	//matrices
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	//animation percentage
	gl.uniform1f(shaderProgram.animationPctUniform, animPercentage);

	//color is done per-object, don't push it here
}

//position of each vertex in I
var vertexPositionBuffer;
//color of each vertex in I
var vertexColor;
//if we want to shade with z-index
var vertexZShadingBuffer;
//stores explicitly how to make polygons from the vertices so I don't have to use some hacky combination of triangle strips and triangles
var vertexIndexBuffer;

//stores how to connect line for wireframe
var wireframeIndexBuffer;
//stores the wireframe color
var wireframeColor;

//stores how to connect line for outline
var outlineIndexBuffer;
//stores outline color
var outlineColor;


//offsets of the current animation
var animationNextOffsetBuffer;
//offset of the previous animation
var animationPrevOffsetBuffer;

//initializes the buffers. We could do a bunch of individual lines of code to draw each vertex, but that's slow and inefficient.
function initBuffers() {
	IBuffers();
	wireframeBuffers();
	outlineBuffers();
	animationBuffers();
}

function IBuffers() {
	//tell GL that we're in buffer-making mode
	vertexPositionBuffer = gl.createBuffer();
	//tell GL that this buffer should be the "current" one
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	
	//these are the ones from the mesh2d demo
	var vertices = [
		//x, y, z
		-0.6,  1.0,  0,
		-0.6,  0.6,  0,
		-0.2,  0.6,  0,
		-0.2, -0.6,  0,
		-0.6, -0.6,  0,
		-0.6, -1.0,  0,
		 0.6, -1.0,  0,
		 0.6, -0.6,  0,
		 0.2, -0.6,  0,
		 0.2,  0.6,  0,
		 0.6,  0.6,  0,
		 0.6,  1.0,  0
	];
	
	//turn this array into something that GL likes
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	//each vertex has 3 coordinates
	vertexPositionBuffer.itemSize = 3;
	//there are 12 vertices
	vertexPositionBuffer.numItems = 12;

	//on to the color buffer
	vertexColor = [0.9568, 0.4980, 0.1411, 1.0];

	vertexZShadingBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexZShadingBuffer);

	colors = [];

	for(var i = 0; i < vertexPositionBuffer.numItems; i++) {
		//the shader shades in the other way if we send RGB > 1
		colors.push(2.0);
		colors.push(2.0);
		colors.push(2.0);
		colors.push(2.0);
	}

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	vertexZShadingBuffer.itemSize = 4;
	vertexZShadingBuffer.numItems = 12;

	//aaaaand the index buffer. This just says which vertices make each triangle.
	vertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
	var indices = [
		//the first vertex is 0
		 0,  1,  2,
		 0,  2,  9,
		 0,  9, 10,
		 0, 10, 11,
		 2,  9,  8,
		 2,  3,  8,
		 5,  4,  3,
		 5,  3,  8,
		 5,  8,  7,
		 5,  7,  6
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	//these are size 1 for some reason
	vertexIndexBuffer.itemSize = 1;
	//and there are 10 tris * 3 vertices per tri
	vertexIndexBuffer.numItems = 30;
}

function wireframeBuffers() {
	wireframeColor = [1.0, 1.0, 1.0, 1.0];

	wireframeIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireframeIndexBuffer);
	//GL_LINE_STRIP is no good for wireframe, as is GL_LINE_LOOP, so GL_LINES it is
	var indices = [
		//top
		 0,  1,
		 1,  2,
		 0,  2,
		 0,  9,
		 2,  9,
		 9, 10,
		 0, 10,
		 0, 11,
		10, 11,
		//middle
		 2,  3,
		 2,  8,
		 9,  8,
		 3,  8,
		//bottom
		 5,  4,
		 5,  3,
		 3,  4,
		 5,  8,
		 5,  7,
		 7,  8,
		 5,  6,
		 7,  6
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	wireframeIndexBuffer.itemSize = 1;
	wireframeIndexBuffer.numItems = 42;
}

function outlineBuffers() {
	outlineColor = [0.0, 0.2352, 0.4901, 1.0];

	outlineIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, outlineIndexBuffer);
	var indices = [
		 0,  1,
		 1,  2,
		 2,  3,
		 3,  4,
		 4,  5,
		 5,  6,
		 6,  7,
		 7,  8,
		 8,  9,
		 9, 10,
		10, 11,
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	outlineIndexBuffer.itemSize = 1;
	outlineIndexBuffer.numItems = 22;
}

function animationBuffers() {
	animationPrevOffsetBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, animationPrevOffsetBuffer);
	//DYNAMIC_DRAW so we can change it
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prevOffsets), gl.DYNAMIC_DRAW);
	animationPrevOffsetBuffer.itemSize = 3;
	animationPrevOffsetBuffer.numItems = 12;

	animationNextOffsetBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, animationNextOffsetBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nextOffsets), gl.DYNAMIC_DRAW);
	animationNextOffsetBuffer.itemSize = 3;
	animationNextOffsetBuffer.numItems = 12;

	animationProgressBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, animationProgressBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(animPercentage), gl.DYNAMIC_DRAW);
	animationProgressBuffer.itemSize = 1;
	animationProgressBuffer.numItems = 12;
}

//time the animation started
var animStartTime = 0;
//time each animation should last (ms)
var animTotalTime = 500;

//the last set of offsets
var prevOffsets;
//the next set of offsets
var nextOffsets;
//the percentage of the way there we are
var animPercentage;

function initAnimation() {
	//just zero the buffers
	prevOffsets = [];
	nextOffsets = [];
	animPercentage = [];

	for(var i = 0; i < 12; i++)
		animPercentage.push(0.0);

	for(var i = 0; i < 12 * 3; i++) {
		prevOffsets.push(0.0);
		nextOffsets.push(0.0);
	}
}

function animate() {
	//modifying the index buffers is no fun. instead, we'll generate a random offset for each vertex to
	//reach after half a second, then give the offsets and the percentage of the way there it should be
	//to the vertex shader and let it do the interpolation there.
	var currentTime = new Date().getTime();

	if(animStartTime + animTotalTime < currentTime) {
		//need to start a new animation
		//update the animation duration
		animTotalTime = parseFloat(document.getElementById("time").value);
		if(isNaN(animTotalTime))
			animTotalTime = 500;
		if(animTotalTime < 16)
			animTotalTime = 16;
		//we could probably devise a way to simply swap between these instead of copying them, but meh
		prevOffsets = nextOffsets.slice(0);
		maxRadius = parseFloat(document.getElementById("radius").value);
		if(isNaN(maxRadius) || maxRadius < 0.0)
			maxRadius = 0.2;
		for(var i = 0; i < vertexPositionBuffer.numItems; i++) {
			//we'll make the offset fall within a sphere
			var rho = Math.random() * maxRadius;
			var theta = Math.random() * 2 * Math.PI;
			var phi = Math.random() * Math.PI;
			nextOffsets[3 * i] = rho * Math.sin(theta) * Math.cos(phi);
			nextOffsets[3 * i + 1] = rho * Math.sin(theta) * Math.sin(phi);
			nextOffsets[3 * i + 2] = rho * Math.cos(theta);
		}
		animStartTime = currentTime;

		//now update the two animation offset buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, animationPrevOffsetBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(prevOffsets));

		gl.bindBuffer(gl.ARRAY_BUFFER, animationNextOffsetBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(nextOffsets));
	}
	animPercentage = (currentTime - animStartTime) / animTotalTime;
	//update progress buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, animationProgressBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(animPercentage));
}

function drawScene() {
	//pass info about the size of the canvas
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

	//clear the canvas
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//set up perspective--45 degrees vertical FOV, correct aspect ratio, clip anything < 0.1 or > 100.0 units from camera, pMatrix is our projection matrix
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

	//set up model view matrix at the origin
	mat4.identity(mvMatrix);

	//translate 5 units into the scene
	mat4.translate(mvMatrix, [0.0, 0.0, -5.0]);

	//push animation data to shader
	
	gl.bindBuffer(gl.ARRAY_BUFFER, animationPrevOffsetBuffer);
	gl.vertexAttribPointer(shaderProgram.targetOffsetAttribute, animationPrevOffsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, animationNextOffsetBuffer);
	gl.vertexAttribPointer(shaderProgram.prevOffsetAttribute, animationPrevOffsetBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.uniform1f(shaderProgram.animationPctUniform, false, animPercentage);

	if(document.getElementById("mesh").checked)
		drawI();

	//so the lines can be seen over the polys
	if(document.getElementById("outline").checked) {
		mat4.translate(mvMatrix, [0.0, 0.0, 0.001]);
		drawOutline();
	}

	if(document.getElementById("wireframe").checked) {
		mat4.translate(mvMatrix, [0.0, 0.0, 0.001]);
		drawWireframe(document.getElementById("mesh").checked);
	}
}

function drawI() {
	//set the vertex position buffer as the active buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	//give the vertex position buffer to the shader program
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	//send the color uniform
	gl.uniform4fv(shaderProgram.colorUniform, vertexColor);

	//send whether or not to use z-coloring
	if(document.getElementById("zshading").checked)
		gl.uniform1i(shaderProgram.depthColoringUniform, 1);
	else
		gl.uniform1i(shaderProgram.depthColoringUniform, 0);

	//set the index buffer as the active buffer
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
	//push all these buffers to the GPU
	setUniforms();

	//draw the I!
	gl.drawElements(gl.TRIANGLES, vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawOutline() {
	//don't want this to affect the outline
	gl.uniform1i(shaderProgram.depthColoringUniform, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.uniform4fv(shaderProgram.colorUniform, outlineColor);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, outlineIndexBuffer);
	setUniforms();

	//it doesn't work qq
	gl.lineWidth(5.0);
	gl.drawElements(gl.LINE_LOOP, outlineIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawWireframe(black) {
	//don't want this to affect the wireframe
	gl.uniform1i(shaderProgram.depthColoringUniform, 0);
	//set the vertex position buffer as the active buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	//give the vertex position buffer to the shader program
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	if(!black)
		gl.uniform4fv(shaderProgram.colorUniform, [0.0, 0.0, 0.0, 1.0]);
	else
		gl.uniform4fv(shaderProgram.colorUniform, wireframeColor);

	//set the index buffer as the active buffer
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireframeIndexBuffer);
	//push all these buffers to the GPU
	setUniforms();

	//1-width lines
	gl.lineWidth(1.0);
	//draw the wireframe!
	gl.drawElements(gl.LINES, wireframeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}