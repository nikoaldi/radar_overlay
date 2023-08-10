import React, { useEffect, useRef, useState} from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './leaflet-geojson-vt';
import _ from 'lodash';

function MapTest() {
    const mapRef = useRef(null);
    const websocketRef = useRef(null);
    const vectorTileLayerRef = useRef([]);
    const wmsLayerRef = useRef(null);
    const seamaps = process.env.REACT_APP_WMS_NATURAL_EARTH;
    const s57Layer = process.env.REACT_APP_WMS_S57;
    const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL;


    useEffect(() => {
        const THROTTLE_TIME = 5; // Throttle time in milliseconds

        if (!mapRef.current) {
            const map = L.map('map').setView([47.39885782790412, -122.45102114364046], 9);
            L.tileLayer.wms(seamaps ,{
                layers: 'natural_earth:ocean',
                format: 'image/png',
                transparent: true,
                tiled: true,
            }).addTo(map);
            console.log("seamaps:", seamaps);
            mapRef.current = map;
        }

        if (!wmsLayerRef.current) {
            const wmsLayer = L.tileLayer.wms(s57Layer, {
                layers: 's57:S57All',
                format: 'image/png',
                transparent: true,
                tiled: true,
            }).addTo(mapRef.current);
            wmsLayerRef.current = wmsLayer;
        }
        
        // Connect to the WebSocket server
        websocketRef.current = new WebSocket(websocketUrl);
        let throttleHandle;
        let dataQueue = [];
        let circle;
        let CircleLength = 10; // Default circle radius in meters
        let radius = 0;
        let hitung = 0;
        let startAzDelete = null;
        let endAzDelete = null;
        let polyline;
        let on = 0;
        
        // Function to create/update the circle with a given radius
        function updateCircleRadius(radius) {
            if (circle) {
                circle.setRadius(radius);
            } else {
                circle = L.circle(mapRef.current.getCenter(), {
                    weight:2,
                    color: '#2AC80D',
                    fillColor: '#000000',
                    fillOpacity: 1,
                    radius: radius,
                }).addTo(mapRef.current);
            }
        }

        function updateLineCoordinates(startLat, startLng, endLat, endLng) {
            var lineCoordinates = [
                [startLat, startLng], // Start point (latitude, longitude)
                [endLat, endLng]      // End point (latitude, longitude)
            ];
            if (polyline) {
                polyline.setLatLngs(lineCoordinates);
                polyline.bringToFront();
            } else {
                polyline = L.polyline(lineCoordinates, { color: '#2AC80D' }).addTo(mapRef.current);
                polyline.bringToFront();
            }
        }
        // Create an empty polyline and add it to the map
        // var polyline = L.polyline([], { color: '#2AC80D',weight: 5 }).addTo(mapRef.current);
        // Handle WebSocket connection open event
        websocketRef.current.onopen = () => {
            console.log('WebSocket connected');
        };
        // Handle WebSocket message event
        websocketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // console.log(data)
            try {
                if(startAzDelete === null ){
                    startAzDelete = data.startAzi;
                    endAzDelete =  startAzDelete + 3;
                } 
                if (on === 1){
                    if(data.startAzi > 170 && data.startAzi < 180){
                        console.log("sasa")
                    }
                    
                } 
                
                // Replace these values with your desired starting point coordinates
                    // console.log(hapus)
    const startLatitude = 47.39885782790412;
    const startLongitude = -122.45102114364046;
    // Replace these values with your desired bearing and distance
    let bearing = data.startAzi; // in degrees
    const distance = 20000; // in meters

                        // Function to calculate the destination point given the starting point, bearing, and distance
    function calculateDestinationPoint(lat, lon, bearing, distance) {
        const radiusEarth = 6371e3; // Earth's radius in meters
        const lat1 = (lat * Math.PI) / 180;
        const lon1 = (lon * Math.PI) / 180;
        const angularDistance = distance / radiusEarth;
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angularDistance) +
            Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing * (Math.PI / 180))
        );
        const lon2 =
            lon1 +
            Math.atan2(
            Math.sin(bearing * (Math.PI / 180)) * Math.sin(angularDistance) * Math.cos(lat1),
            Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
            );
        return [((lat2 * 180) / Math.PI).toFixed(6), ((lon2 * 180) / Math.PI).toFixed(6)];
        }
           // Create a moving polyline
            const startLatLng = L.latLng(startLatitude, startLongitude);
            const destinationPoint = calculateDestinationPoint(startLatitude, startLongitude, bearing, distance);
            // Draw Line
            updateLineCoordinates(startLatitude,startLongitude,destinationPoint[0],destinationPoint[1])  
            } catch {
                return;
            }
            if (data.features && data.features.length > 0) {
                if (data.startAzi > 180 && data.startAzi < 185 && on === 0){
                    on =1;
                } 
                else if (data.startAzi > 160 && data.startAzi < 180 && on === 1){
                    on =2;
                }
                
                // Add received data to the queue
                dataQueue.push(data);

                // Throttle the data handling
                if (!throttleHandle) {
                    throttleHandle = setTimeout(() => {
                        if(on !== 0  ){
                            processGeoJSONData(dataQueue);
                        }
                        
                        throttleHandle = null;
                        dataQueue = [];
                    }, THROTTLE_TIME);
                }
            }
        };
        // In the useEffect hook, update the part where you create the vectorTileLayer:
        const processGeoJSONData = (dataQueue) => {
            const data = _.merge({}, ...dataQueue); // Merge all GeoJSON data into one
            const options = (feature) => {
                hitung = hitung +1;
                // Draw Circle
                if (data.radius > CircleLength ) {
                    radius = data.radius
                    CircleLength = data.radius;
                    updateCircleRadius(radius);
                }
                const properties = feature.properties || {}; // Ensure properties object exists
                // Provide default values if properties are missing
                const strokeColor = properties.stroke || '#2AC80D';
                const fillColor = properties.fill || '#2AC80D';
                const weight = properties.weight || 2;
                const opacity = properties.opacity || 1.0;
                const fillOpacity = properties.opacity || 1.0;
                return {
                    weight,
                    fillColor,
                    color: strokeColor,
                    fillOpacity,
                    opacity,
                };
            };            
            const vectorTile = L.geoJson(data, { style: options });
            
        
            try {
                if (on === 2 && vectorTileLayerRef.current.length > 0) {
                    mapRef.current.removeLayer(vectorTileLayerRef.current[0]);
                    vectorTileLayerRef.current.shift();
                    vectorTile.addTo(mapRef.current);
                } else {
                    vectorTile.addTo(mapRef.current);
                }
            } catch (error){
                console.log("Error");
                return;
            }
            vectorTileLayerRef.current.push(vectorTile);
        };
        // Handle WebSocket error event
        websocketRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };


        // Clean up the WebSocket connection on unmount
        return () => {
            clearTimeout(throttleHandle);
            websocketRef.current.close();
        };
    }, []);
    return <div id="map" style={{ width: '100', height: '100vh' }}></div>;
}

export default MapTest;