//our GL context
var gl;

//the time of the last frame
var prevFrameTime = 0;
//current fps
var cumFrameTime = 0;
//number of frames we've looked at so far
var numAccountedFrames = 0;

var mvMatrixStack = [];

var GLCanvas;

$( window ).resize(function() {
    GLCanvas.width = window.innerWidth;
	GLCanvas.height = window.innerHeight;
	gl.viewportHeight = GLCanvas.clientHeight;
	gl.viewportWidth = GLCanvas.clientWidth;
	document.getElementById("resolution").innerHTML = gl.viewportWidth + " x " + gl.viewportHeight;
});

//sets up the GL context by finding the canvas
function initGL(canvas) {
    GLCanvas = canvas;
	try {
		gl = canvas.getContext("experimental-webgl");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		gl.viewportHeight = canvas.clientHeight;
		gl.viewportWidth = canvas.clientWidth;
		document.getElementById("resolution").innerHTML = gl.viewportWidth + " x " + gl.viewportHeight;
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

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

var consoleLogProgress = 0;

function log60(message) {
	if(consoleLogProgress == 60) {
		console.log(message);
		consoleLogProgress = 0;
	}
	else
		consoleLogProgress++;
}

function trackFPS(id) {
	var time = new Date().getTime();	//in ms
	var frameTime = time - prevFrameTime;
	prevFrameTime = time;
	cumFrameTime = (numAccountedFrames * cumFrameTime + frameTime) / (numAccountedFrames + 1);
	numAccountedFrames++;
	if(numAccountedFrames == 30) {
		var FPS = 0;
		if(cumFrameTime == 0)
			FPS = "invalid";
		else
			FPS = (1000 / cumFrameTime).toFixed(2);
		document.getElementById(id).innerHTML="FPS: " + FPS;
		numAccountedFrames = 0;
		cumFrameTime = 0;
	}
}

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}