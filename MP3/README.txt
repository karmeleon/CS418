Another month, another MP. This time, it's a mystical spinning teapot. Who is it, really? What are its motives? I don't know and I don't give a shit, this is a CS MP. Let's get this over with.



Compiling/running


Use the WebGL-enabled browser of your choice to open index.html. I suggest Firefox because Chrome can't load textures from local files because of some stupid security restriction. Alternatively you can host the files on your own server, but it's way easier to just use a different browser. Once you've gotten it running, you can mess with the checkboxes on the left-hand side to see each feature individually. The "shininess" box controls the specularity, not the diffuse lighting.



Features

It's a spinning teapot with Phong diffuse and specular lighting in addition to texture mapping and sphere mapping. It's really not that exciting. Oh yeah, it has backface culling and depth testing enabled too.

Design

It loads the .obj file from the server/disk/file/whatever, parses it to find vertices and triangles, then generates vertex normals. This is accomplished by computing a normal for each polygon, then adding adjacent normals together for each vertex and normalizing the result. Standard normals stuff, you know how it is. The texture and sphere map are loaded from the same place and handed to GL for safe keeping. All of these are pushed to the vertex and fragment shaders.


The vertex shader is boring; basically all it does is multiply each vertex by the MV and P matrices before throwing them over to the fragment shader. The fragment shader is slightly less bland, but still extremely predictable and functionally identical to every other fragment shader you've seen today. Seriously, you can just trust that it works, give me full credit, and move on with your life. I won't tell.


The texture coordinates were generated along with the normals by treating the model as a cylinder. It mostly works, but it gets glitchy near the handle and spout. The texture I used does a pretty good of masking this, fortunately :D



Credits


Me for writing this MP.

Me again for writing the obj parser I used for a different project (https://github.com/shawnwalton/obj2json).

Me once again for modifying the obj parser to work with these (annoyingly nonstandard) obj files.

LearningwebGL for the excellent tutorials and boilerplate code.

Paul Debevec for the spheremap.

Alibaba.com for the texture, strangely. (http://www.alibaba.com/product-detail/Polished-Porcelain-Floor-Tile600-600MM_314262378.html)

Youtube link: https://www.youtube.com/watch?v=5rdFX1Sz-sE

This is for the 3 credit hour version.