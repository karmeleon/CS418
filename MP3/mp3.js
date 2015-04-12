var standardProgram;

function initShaders() {
	var fragmentShader = getShader(gl, "frag-lighting-fs");
	var vertexShader = getShader(gl, "frag-lighting-vs");
	standardProgram = gl.createProgram();
	gl.attachShader(standardProgram, vertexShader);
	gl.attachShader(standardProgram, fragmentShader);
	gl.linkProgram(standardProgram);

	if (!gl.getProgramParameter(standardProgram, gl.LINK_STATUS)) {
        alert("Could not initialise standard shader");
    }

    gl.useProgram(standardProgram);

    standardProgram.vertexPositionAttribute = gl.getAttribLocation(standardProgram, "aVertexPosition");
    gl.enableVertexAttribArray(standardProgram.vertexPositionAttribute);

    standardProgram.vertexNormalAttribute = gl.getAttribLocation(standardProgram, "aVertexNormal");
    gl.enableVertexAttribArray(standardProgram.vertexNormalAttribute);

    standardProgram.vertexTextureCoordAttribute = gl.getAttribLocation(standardProgram, "aTextureCoord");
    gl.enableVertexAttribArray(standardProgram.vertexTextureCoordAttribute);

    standardProgram.pMatrixUniform = gl.getUniformLocation(standardProgram, "uPMatrix");
    standardProgram.mvMatrixUniform = gl.getUniformLocation(standardProgram, "uMVMatrix");
    standardProgram.nMatrixUniform = gl.getUniformLocation(standardProgram, "uNMatrix");
    standardProgram.samplerUniform = gl.getUniformLocation(standardProgram, "uTextureSampler");
    standardProgram.sphereUniform = gl.getUniformLocation(standardProgram, "uSphereSampler")
    standardProgram.materialShininessUniform = gl.getUniformLocation(standardProgram, "uMaterialShininess");
    standardProgram.showSpecularHighlightsUniform = gl.getUniformLocation(standardProgram, "uShowSpecularHighlights");
    standardProgram.useTexturesUniform = gl.getUniformLocation(standardProgram, "uUseTextures");
    standardProgram.useLightingUniform = gl.getUniformLocation(standardProgram, "uUseLighting");
    standardProgram.useSpheremapUniform = gl.getUniformLocation(standardProgram, "uUseSpheremap");
    standardProgram.ambientColorUniform = gl.getUniformLocation(standardProgram, "uAmbientColor");
    standardProgram.pointLightingLocationUniform = gl.getUniformLocation(standardProgram, "uPointLightingLocation");
    standardProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(standardProgram, "uPointLightingSpecularColor");
    standardProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(standardProgram, "uPointLightingDiffuseColor");
}

function handleLoadedTexture(texture) {
	//gl wants images stored differently from the way JS stores them, so flip them
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	//set this texture object as our active object
	gl.bindTexture(gl.TEXTURE_2D, texture);
	//actually load the image into vram
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	//set how to interpolate textures that are larger on screen than they are in the file
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	//set how to interpolate textures that are smaller on screen than they are in the file
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	//generate mipmaps
	gl.generateMipmap(gl.TEXTURE_2D);

	//clean up after ourselves
	gl.bindTexture(gl.TEXTURE_2D, null);
}

var modelTexture;
var sphereMap;

function initTextures() {
	//ready an empty texture "slot"
	modelTexture = gl.createTexture();
	//ready an empty JS image
	modelTexture.image = new Image();
	//tell what do do when the texture is done loading
	modelTexture.image.onload = function() {
		handleLoadedTexture(modelTexture);
		$('#textureloading').hide();
	};
	// http://www.alibaba.com/product-detail/Polished-Porcelain-Floor-Tile600-600MM_314262378.html
	modelTexture.image.src = 'porcelain.jpg';
	
	sphereMap = gl.createTexture();
	sphereMap.image = new Image();
	sphereMap.image.onload = function() {
        handleLoadedTexture(sphereMap);
        $('#sphereloading').hide();
	};
	sphereMap.image.src = "sphere.png";
}

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

function setMatrixUniforms() {
    gl.uniformMatrix4fv(standardProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(standardProgram.mvMatrixUniform, false, mvMatrix);

    var a = mat3.create();
	var b = mat3.create();
	var nMatrix = mat3.create();
	mat3.fromMat4(a, mvMatrix);
	mat3.invert(b, a);
	mat3.transpose(nMatrix, b);

    gl.uniformMatrix3fv(standardProgram.nMatrixUniform, false, nMatrix);
}

var vertexPositionBuffer;
var vertexNormalBuffer;
var vertexTextureCoordBuffer;
var vertexIndexBuffer;

function computeNormsTexCoords(data) {
	// the plan is to find the normal of each triangle, then go through all the vertices, find all the triangles they're attached to, and compute the per-vertex normal from there
	var numVertices = data.vertexPositions.length / 3;
	var numTris = data.indices.length / 3;

	data.vertexNormals = new Array();

	// will contain the xyz components of the normal
	var triangles = new Array(numTris);
	// vertexIndices[n] will contain the indices of the triangles that vertex[n] is part of
	var vertexIndices = new Array(numVertices);
	for(var i = 0; i < vertexIndices.length; i++)
		vertexIndices[i] = new Array();

    var u = vec3.create();
	var v = vec3.create();

	for(var i = 0; i < numTris; i++) {
		// indices of the indices of the vertices
		var vii1 = 3 * i;
		var vii2 = 3 * i + 1;
		var vii3 = 3 * i + 2;
		// indices of the vertices
		var vi1 = data.indices[vii1] * 3;
		var vi2 = data.indices[vii2] * 3;
		var vi3 = data.indices[vii3] * 3;
		// vertices
		var v1 = [data.vertexPositions[vi1], data.vertexPositions[vi1 + 1], data.vertexPositions[vi1 + 2]];
		var v2 = [data.vertexPositions[vi2], data.vertexPositions[vi2 + 1], data.vertexPositions[vi2 + 2]];
		var v3 = [data.vertexPositions[vi3], data.vertexPositions[vi3 + 1], data.vertexPositions[vi3 + 2]];

		
		var normal = vec3.create();
		var normalized = vec3.create();
		vec3.subtract(u, v2, v1);
		vec3.subtract(v, v3, v1);
		vec3.cross(normal, u, v);
		vec3.normalize(normalized, normal);

		// save this vector
		triangles[i] = normalized;
		// save the vertices it's part of
		vertexIndices[vi1 / 3].push(i);
		vertexIndices[vi2 / 3].push(i);
		vertexIndices[vi3 / 3].push(i);
	}

	for(var i = 0; i < numVertices; i++) {
		var totalNormal = vec3.create();
		var temp = vec3.create();
		while(vertexIndices[i].length !== 0) {
			var currentTriangle = vertexIndices[i].pop();
			vec3.add(temp, totalNormal, triangles[currentTriangle]);
			vec3.copy(totalNormal, temp);
		}
		var normalized = vec3.create();
		vec3.normalize(normalized, totalNormal);
		data.vertexNormals[i * 3] = normalized[0];
		data.vertexNormals[i * 3 + 1] = normalized[1];
		data.vertexNormals[i * 3 + 2] = normalized[2];
	}

	for(var i = 0; i < numVertices; i++) {
		// angle should be atan(x/z)
		var angle = Math.atan(data.vertexPositions[3 * i] / data.vertexPositions[3 * i + 2]);
		data.vertexTextureCoords[2 * i] = Math.sin((angle + Math.PI / 4) / 2);
		data.vertexTextureCoords[2 * i + 1] = data.vertexPositions[3 * i + 1] * 7;
	}

	return data;
}

function handleLoadedModel(data) {
	vertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertexNormals), gl.STATIC_DRAW);
	vertexNormalBuffer.itemSize = 3;
	vertexNormalBuffer.numItems = data.vertexNormals.length / 3;
	console.log("found " + vertexNormalBuffer.numItems + " normals");

	vertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertexTextureCoords), gl.STATIC_DRAW);
	vertexTextureCoordBuffer.itemSize = 2;
	vertexTextureCoordBuffer.numItems = data.vertexTextureCoords.length / 2;
	console.log("found " + vertexTextureCoordBuffer.numItems + " texture coords");

	vertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertexPositions), gl.STATIC_DRAW);
	vertexPositionBuffer.itemSize = 3;
	vertexPositionBuffer.numItems = data.vertexPositions.length / 3;
	console.log("found " + vertexPositionBuffer.numItems + " vertices");

	vertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
	vertexIndexBuffer.itemSize = 1;
	vertexIndexBuffer.numItems = data.indices.length;
	console.log("found " + vertexIndexBuffer.numItems / 1 + " indices");
}

function loadTeapotModel() {
	$.get('teapot_0.obj', function(data) {
		handleLoadedModel(computeNormsTexCoords(obj2json(data)));
		ready = true;
	});
}

var ready = false;

var angle = 0;

function drawScene() {
	if(!ready)
		return;

	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawFinalImage();
}

function drawFinalImage() {
	mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

	var specularHighlights = $('#usespecularity').is(":checked");
	gl.uniform1i(standardProgram.showSpecularHighlightsUniform, specularHighlights);

	var lighting = $('#uselighting').is(":checked");
	gl.uniform1i(standardProgram.useLightingUniform, lighting);

	var textures = $("#usetextures").is(":checked");
	gl.uniform1i(standardProgram.useTexturesUniform, textures);

    var sphere = $('#usespheremap').is(':checked');
    gl.uniform1i(standardProgram.useSpheremapUniform, sphere);

	if(lighting) {
		gl.uniform3f(standardProgram.ambientColorUniform, 0.1, 0.1, 0.1);
		gl.uniform3f(standardProgram.pointLightingLocationUniform, -10.0, 4.0, 20.0);
		gl.uniform3f(standardProgram.pointLightingSpecularColorUniform, 1.0, 1.0, 1.0);
		gl.uniform3f(standardProgram.pointLightingDiffuseColorUniform, 0.8, 0.8, 0.8);
	}

	mat4.identity(mvMatrix);
	
	var cameraLocation = [0, 0.15, 0];
	
	cameraLocation[0] = 0.3 * Math.sin(degToRad(angle));
	cameraLocation[2] = 0.3 * Math.cos(degToRad(angle));
	
	mat4.lookAt(mvMatrix, cameraLocation, [0, 0.1, 0], [0, 1, 0]);
	//select the first texture as the active one
	gl.activeTexture(gl.TEXTURE0);
	//bind the correct texture to the first texture slot
	gl.bindTexture(gl.TEXTURE_2D, modelTexture);

	gl.uniform1i(standardProgram.samplerUniform, 0);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, sphereMap);
	gl.uniform1i(standardProgram.sphereUniform, 1);

	//set the shininess of the model
	var shiny = parseFloat($("#shininess").val());
	if(isNaN(shiny))
		shiny = 4.0;
	gl.uniform1f(standardProgram.materialShininessUniform, shiny);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	gl.vertexAttribPointer(standardProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoordBuffer);
	gl.vertexAttribPointer(standardProgram.vertexTextureCoordAttribute, vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
	gl.vertexAttribPointer(standardProgram.vertexNormalAttribute, vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

var lastTime = 0;

function animate() {
	var timeNow = new Date().getTime();
	if(lastTime !== 0)
		angle += 0.03 * (timeNow - lastTime);
	lastTime = timeNow;
}

function tick() {
	requestAnimFrame(tick);
	drawScene();
	animate();
	trackFPS("fps-counter");
}

function startGL() {
	var canvas = document.getElementById("lighting-canvas");
	initGL(canvas);
	initShaders();
	initTextures();
	loadTeapotModel();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	tick();
}
