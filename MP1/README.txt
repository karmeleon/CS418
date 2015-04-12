Just open mp1.html in a modern browser of your choice. The checkboxes should be self-explanatory. The "Radius of animation" box sets the maximum movement of each vertex. The "Time of each movement (ms)" box simply sets the amount of time that each movement lasts.

WebGL is based off OpenGL ES, which doesn't have gl_begin, gl_end, gl_vertex, or a fixed-function pipeline. Instead, all data has to be passed to a vertex and fragment shader in buffers.

The I is actually outlined in blue, but it can be hard to see on Windows because no browser for it actually supports a line width other than 1. It works fine on OSX and Android, though.

The animation is done mostly on the vertex shader; the only part done in JS is generating the random numbers and keeping track of time. The path is linearly interpolated, but it's eased into and out of each curve with a cosine function. I'm not going for the 4 credit hour version of the course, I just started way, way early (it's 1/29 as I type) and wanted to mess with GLSL. The "color based on depth" option is also done in the vertex shader and helps to visualize the depth of the scene. I wanted to do lighting as well, but I couldn't randomly move the vertices and still know the correct normal :( oh well.

I used some boilerplate code (initGL, getShader, initShaders, the barebones shaders) from learningwebgl.com to get started, but everything else is either completely my own doing or modified to the point of unrecognizability.

Compatibility

Chrome: works on all modern desktop and Android versions, automatically antialiased and VSync'd by default.
IE: Works on IE11, not antialiased, but VSync'd. Does not work in IE10 or below without third-party plugins.
Firefox: works on modern versions, automatically antialiased and VSync'd by default.

I develop on the newest stable version of Chrome on Windows 8.1 x86-64, so that's the only browser it's guaranteed to work on.