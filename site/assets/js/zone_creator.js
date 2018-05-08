/////////////////////////////////////////////////////////////////////
// ZoneCreationExtension, written by Denis Grigor - Dec 2017
//                        based on Philippe Leefsma samples and style
// 
// Illustrates how to create zones by defining 4 points on
//
/////////////////////////////////////////////////////////////////////
class ZoneCreationExtension extends Autodesk.Viewing.Extension {

    /////////////////////////////////////////////////////////
    // Class constructor
    //
    /////////////////////////////////////////////////////////
    constructor(viewer, options) {

        super(viewer, options)

        this.viewer = viewer
        this.creationMode = null;
        this.default_cursor = viewer.canvas.style.cursor;

        this.vertexBuffer = [];
        this.zones = [];
    }

    /////////////////////////////////////////////////////////
    // Load callback
    //
    /////////////////////////////////////////////////////////
    load() {

        console.log('ZoneCreationExtension loaded')

        this.creationMode = document.getElementById("creation_mode");
        this.creationMode.addEventListener('change', this.StartZoneCreation)

        // this.viewer.addEventListener(
        //   Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, () => {

        //     this.dbIds = this.getAllDbIds()
        //   })


        // Register and activate as tool, to be able to implement
        // ToolInterface methods like handleSingleClick(event,button)
        // (https://developer.autodesk.com/en/docs/viewer/v2/reference/javascript/toolinterface/)
        this.viewer.toolController.registerTool(this)

        this.viewer.toolController.activateTool(
            'Viewing.Extension.ZoneCreationExtension')


        return true
    }

    /////////////////////////////////////////////////////////
    // Tool Interface
    //
    /////////////////////////////////////////////////////////
    getNames() {

        return ['Viewing.Extension.ZoneCreationExtension']
    }

    activate() {

    }

    deactivate() {

    }

    /////////////////////////////////////////////////////////
    // Unload callback
    //
    /////////////////////////////////////////////////////////
    unload() {

        console.log('ZoneCreationExtension unloaded')

        this.viewer.toolController.deactivateTool(
            'Viewing.Extension.ZoneCreationExtension')

        this.viewer.toolController.unregisterTool(this)

        return true
    }


    /////////////////////////////////////////////////////////
    // Creates Raycaster object from the pointer
    //
    /////////////////////////////////////////////////////////
    pointerToRaycaster(domElement, camera, pointer) {

        const pointerVector = new THREE.Vector3()
        const pointerDir = new THREE.Vector3()
        const ray = new THREE.Raycaster()

        const rect = domElement.getBoundingClientRect()

        const x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1

        if (camera.isPerspective) {

            pointerVector.set(x, y, 0.5)

            pointerVector.unproject(camera)

            ray.set(camera.position,
                pointerVector.sub(
                    camera.position).normalize())

        } else {

            pointerVector.set(x, y, -1)

            pointerVector.unproject(camera)

            pointerDir.set(0, 0, -1)

            ray.set(pointerVector,
                pointerDir.transformDirection(
                    camera.matrixWorld))
        }

        return ray
    }

    /////////////////////////////////////////////////////////
    // Click handler
    //
    /////////////////////////////////////////////////////////
    handleSingleClick(event) {


        // checking working conditions
        if (event &&event.button === 2) {
            console.log(this.creationMode.checked ? "canceling creation mode" : "");
            this.creationMode.checked = false;
        }



        if (!this.creationMode.checked) {
            console.log("Not in creation mode");
            return false;
        }


        if (this.vertexBuffer.length == 4) {
            this.createZoneFromAvailableVertices();
            this.creationMode.checked = false;
            // this.viewer.style.cursor = this.default_cursor;
            return true;
        }


        // identify ray-intersection
        let ray = new THREE.Vector3();

        ray = viewer.clientToWorld(event.clientX, event.clientY);

        if (!ray) {
            console.log("No model intersection");
            return;
        }



        let point_mesh = new THREE.Mesh(
            new THREE.BoxGeometry(100, 100, 100),
            new THREE.MeshBasicMaterial({ color: 0xff0000 }));

        point_mesh.position.x = ray.intersectPoint.x;
        point_mesh.position.y = ray.intersectPoint.y;
        point_mesh.position.z = ray.intersectPoint.z;

        this.vertexBuffer.push(point_mesh);

        viewer.impl.scene.add(point_mesh);

        viewer.impl.sceneUpdated(true);

        console.log(event.clientX, event.clientY);

        const pointer = event.pointers
            ? event.pointers[0]
            : event

        const rayCaster = this.pointerToRaycaster(
            this.viewer.impl.canvas,
            this.viewer.impl.camera,
            pointer)

        const intersectResults = rayCaster.intersectObjects(
            this.intersectMeshes, true)

        const hitTest = this.viewer.model.rayIntersect(
            rayCaster, true, this.dbIds)

        const selections = intersectResults.filter((res) =>

            (!hitTest || (hitTest.distance > res.distance))
        )

        if (selections.length) {

            console.log('Custom meshes selected:')
            console.log(selections)

            return true
        }

        return false
    }

    handleMouseMove(event) {
    }


    /////////////////////////////////////////////////////////
    // UI events
    //
    /////////////////////////////////////////////////////////
    StartZoneCreation(event) {

        if (event.target.checked) {
            viewer.canvas.style.cursor = 'crosshair';
            console.log("starting creation mode");
        } else {
            viewer.canvas.style.cursor = "";
        }
    }


    /////////////////////////////////////////////////////////
    // ZoneBox creation
    //
    /////////////////////////////////////////////////////////
    createZoneFromAvailableVertices() {


        const color = 0xff0000;

        // const material = new THREE.MeshBasicMaterial({
        //     color: color,
        //     transparent: true,
        //     opacity: 0.5,
        //     side: THREE.DoubleSide,
        //     reflectivity: 0.0
        // })


        const material = new THREE.MeshPhongMaterial({
            specular: new THREE.Color(color),
            side: THREE.DoubleSide,
            color,
            transparent: true,
            opacity: 0.4
        })


        // Classic approach
        // let zone_geom = new THREE.Geometry();
        // for (let i = 0; i < this.vertexBuffer.length; ++i) {
        //     zone_geom.vertices.push(new THREE.Vector3(
        //         this.vertexBuffer[i].position.x,
        //         this.vertexBuffer[i].position.y + 20,
        //         this.vertexBuffer[i].position.z,
        //     ));
        // }

        // zone_geom.faces.push(new THREE.Face3(0, 1, 2));
        // zone_geom.faces.push(new THREE.Face3(0, 2, 3));

        // let zone_mesh = new THREE.Mesh(
        //     zone_geom, material);
        //     zone_mesh.material.side = THREE.DoubleSide;
        // viewer.impl.scene.add(zone_mesh);


        // New approach
        let polygon = new THREE.Shape();
        polygon.moveTo(this.vertexBuffer[0].position.x, this.vertexBuffer[0].position.z);
        polygon.lineTo(this.vertexBuffer[1].position.x, this.vertexBuffer[1].position.z);
        polygon.lineTo(this.vertexBuffer[2].position.x, this.vertexBuffer[2].position.z);
        polygon.lineTo(this.vertexBuffer[3].position.x, this.vertexBuffer[3].position.z);
        polygon.lineTo(this.vertexBuffer[0].position.x, this.vertexBuffer[0].position.z);

        var extrudeSettings = {
            steps: 2,
            amount: 1600,
            bevelEnabled: true,
            bevelThickness: 1,
            bevelSize: 1,
            bevelSegments: 1
        };

        var geometry = new THREE.ExtrudeGeometry(polygon, extrudeSettings);
        var mesh = new THREE.Mesh(geometry, material);


        mesh.rotation.x = Math.PI / 2;


        this.viewer.impl.matman().addMaterial(
            'transparent',
            material,
            true
        )
        this.zones.push(mesh);
        viewer.impl.sceneAfter.add(mesh);
        viewer.impl.invalidate (true);


        this.vertexBuffer.forEach(element => {
            viewer.impl.scene.remove(element);
        });
        this.vertexBuffer = [];




    }

}

Autodesk.Viewing.theExtensionManager.registerExtension(
    'ZoneCreationExtension',
    ZoneCreationExtension)