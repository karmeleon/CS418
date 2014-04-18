//the time of the last frame
var prevFrameTime = 0;
//current fps
var cumFrameTime = 0;
//number of frames we've looked at so far
var numAccountedFrames = 0;

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