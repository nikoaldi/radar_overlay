import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './leaflet-geojson-vt';
import _ from 'lodash';

function MapTest() {
    const mapRef = useRef(null);
    const websocketRef = useRef(null);
    const vectorTileLayerRef = useRef(null);
    const [opacity, setOpacity] = useState(1.0);

    useEffect(() => {
        const THROTTLE_TIME = 40; // Throttle time in milliseconds

        // Set up the Leaflet map if it doesn't exist
        if (!mapRef.current) {
            const map = L.map('map').setView([-9.2893, 106.4583], 11);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            mapRef.current = map;
        }

        // Connect to the WebSocket server
        websocketRef.current = new WebSocket('ws://172.16.25.219:8080/geosocket');

        let throttleHandle;
        let dataQueue = [];

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
                const properties = feature.properties || {}; // Ensure properties object exists
            
                // Provide default values if properties are missing
                const strokeColor = properties.stroke || '#000000';
                const fillColor = properties.fill || '#000000';
                const weight = properties.weight || 4;
                const opacity = properties.opacity || 1.0;
                const fillOpacity = properties.fillOpacity || 1.0;
            
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
                // vectorTileLayerRef.current.clearLayers();
                vectorTileLayerRef.current.addLayer(L.geoJson(data, { style: options })); // Add the GeoJSON layer to the Layer Group
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
