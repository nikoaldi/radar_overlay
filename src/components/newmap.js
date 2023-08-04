import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './leaflet-geojson-vt';
import _ from 'lodash';
import * as turf from '@turf/turf';

function MapTesttt() {
    const mapRef = useRef(null);
    const websocketRef = useRef(null);
    const vectorTileLayerRef = useRef(null);
    const [opacity, setOpacity] = useState(1.0);

    useEffect(() => {
        const THROTTLE_TIME = 40; // Throttle time in milliseconds

        // Set up the Leaflet map if it doesn't exist
        if (!mapRef.current) {
            const map = L.map('map').setView([-6.949612491503703, 107.61957049369812], 11);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            mapRef.current = map;
        }

        

        // Connect to the WebSocket server
        websocketRef.current = new WebSocket('ws://localhost:8080/geosocket1');

        let throttleHandle;
        let dataQueue = [];
        let circle;
        let CircleLength = 10; // Default circle radius in meters
        let radius = 0;
        let polyline;

        // Function to create/update the circle with a given radius
        function updateCircleRadius(radius) {
            if (circle) {
                circle.setRadius(radius);
            } else {
                circle = L.circle(mapRef.current.getCenter(), {
                    weight:2,
                    color: '#2AC80D',
                    fillColor: '#000000',
                    fillOpacity: 0.8,
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
            } else {
                polyline = L.polyline(lineCoordinates, { color: 'red' }).addTo(mapRef.current);
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
            

            if (data.features && data.features.length > 0) {
                // Add received data to the queue
                dataQueue.push(data);

                // Throttle the data handling
                if (!throttleHandle) {
                    throttleHandle = setTimeout(() => {
                        processGeoJSONData(dataQueue);
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
                console.log(data)
                
                // Draw Circle
                if (data.features[data.features.length -1].properties.radius > CircleLength ) {
                    radius = data.features[data.features.length -1].properties.radius;
                    CircleLength = data.features[data.features.length -1].properties.radius;
                    updateCircleRadius(radius);
                }
                
                const properties = feature.properties || {}; // Ensure properties object exists
            
                // Provide default values if properties are missing
                const strokeColor = properties.stroke || '#2AC80D';
                const fillColor = properties.fill || '#2AC80D';
                const weight = properties.weight || 1;
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

            if (vectorTileLayerRef.current) {
                // If the vector tile layer already exists, update it with new data
                const newLayer = L.geoJson(data, { style: options }); // Add the new GeoJSON layer to the Layer Group

                const vectorTileLayerGroup = vectorTileLayerRef.current;
                const layers = vectorTileLayerGroup.getLayers();

                // Remove the very first added vector from the map
                if (layers.length > 2000) {
                    const firstLayer = layers[0];
                    vectorTileLayerGroup.removeLayer(firstLayer);
                }

                vectorTileLayerGroup.addLayer(newLayer);
            } else {
                // Create a new Layer Group and add the GeoJSON layer to it
                const vectorTileLayerGroup = L.layerGroup();
                vectorTileLayerGroup.addLayer(L.geoJson(data, { style: options }));
                vectorTileLayerGroup.addTo(mapRef.current);
                vectorTileLayerRef.current = vectorTileLayerGroup;
            }

            // Limit the number of features displayed
            if (vectorTileLayerRef.current.getLayers().length > 2048) {
                mapRef.current.removeLayer(vectorTileLayerRef.current);
                vectorTileLayerRef.current = null;
            }

           
            
            // Replace these values with your desired starting point coordinates
            const startLatitude = -6.949612491503703;
            const startLongitude = 107.61957049369812;

            // Replace these values with your desired bearing and distance
            let bearing = data.features[0].properties.endAz; // in degrees
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

export default MapTesttt;