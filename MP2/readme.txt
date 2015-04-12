CS 418 SP14 MP2
Shawn Walton
smwalto2

Running:

Simply open index.html in Firefox or IE11. It also works in Chrome, but due to some security restrictions it doesn't work properly when run from a file. You'll need to either host this folder on a web server, start Chrome with the "--disable-web-security" flag, or just use another browser.

Design:

Keyboard events are handled by the handleKeyDown() and handleKeyUp() functions. They simply set the status of each key (pressed or released) in the keysDown matrix. The meat of this MP, the model view matrix rotations, are done in the animate() function. It first computes how much time has passed since the last frame and looks at which keys are pressed. Once it's figured out which way the matrix needs to rotate, it rotates an identity matrix in the correct directions, translates it forwards a bit, then multiplies that matrix with the model view matrix. Simple stuff.

The terrain was generated from a set of three 2048x2048 maps from http://www.virtual-lands-3d.com/model-tags.html?start=0&tags=Free+3d+models. I combined the three greyscale images together so the red channel defines the height, the blue channel determines the presence or absence of a river, and the green channel tells where the rocks are. I generate a 256x256 grid of vertices along with their texture coordinates and triangle indices in the initBuffers() function. I'd like to have generated a mesh with more vertices, but index buffers in WebGL are 16-bit integers so I can only address 256x256 = 65536 vertices per draw call. I generate a flat square here; all terrain is modeled in the vertex shader.

Textures are loaded in the initTextures() function. alpine-terrain-composed.png is the combined map file, rock.png is the rock texture I use from http://www.deviantart.com/art/Seamless-Rock-Texture-A-273637565, and snow.png is the beautiful snow texture I made in GIMP.

Shaders:

The vertex shader simply displaces each vertex in the y-direction by reading the red component of the map texture, multiplying it by a height factor, and adding it to the y-coordinate.

The fragment shader reads the map texture, determines how much of each texture it should use, then computes lighting and combines them all together to determine the final color of each fragment. Normals are calculated by sampling the height of nearby vertices. I'm fully aware that doing it on the fragment shader adds a huge number of texture lookups and normals can easily be precomputed, but it works and I don't want to spend a lot of time adding it.

Video:

Here. http://www.youtube.com/watch?v=ZRq4uboLfBo