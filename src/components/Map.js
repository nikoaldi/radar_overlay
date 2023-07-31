import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './leaflet-geojson-vt';

function MapTest() {
    const mapRef = useRef(null);
    const websocketRef = useRef(null);
    const vectorTileLayerRef = useRef(null);
  

    useEffect(() => {

        // Set up the Leaflet map if it doesn't exist
        if (!mapRef.current) {
            const map = L.map('map').setView([-6.949639442878905 , 107.61965170455426], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            mapRef.current = map;
        }

        // Connect to the WebSocket server
        websocketRef.current = new WebSocket('ws://localhost:8080/geosocket');

        // Handle WebSocket connection open event
        websocketRef.current.onopen = () => {
            console.log('WebSocket connected');
        };
    
        // Handle WebSocket message event
        websocketRef.current.onmessage = (event) => {
            // Received GeoJSON data from the WebSocket
            let data;
            try {
                data = JSON.parse(event.data);
                console.log(data)
            } catch (error) {
                console.error('Invalid JSON data received:', error);
                return;
            }

            const options = {
                maxZoom: 19,
                tolerance: 50,
                debug: 0,
                style: {
                weight: 2,
                fillColor: '#00ff33',
                color: '#F2FF00',
                },
            };
  
            // Remove the existing vector tile layer if it exists
            if (vectorTileLayerRef.current) {
                mapRef.current.removeLayer(vectorTileLayerRef.current);
                }

            // Add the vector tiles layer to the map
            const vectorTileLayer = L.geoJson.vt(data, options).addTo(mapRef.current);

            // Add the vector tile layer to the map
            vectorTileLayer.addTo(mapRef.current);

            // Save the vector tile layer reference
            vectorTileLayerRef.current = vectorTileLayer;
        };

        // Handle WebSocket error event
        websocketRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
  
        // Clean up the WebSocket connection on unmount
        return () => {
            websocketRef.current.close();
        };
    

    }, []);


    return <div id="map" style={{width: '100', height: '100vh'}}></div>;
}

export default MapTest;
