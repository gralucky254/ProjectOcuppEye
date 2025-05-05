// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library is not loaded!');
        document.getElementById('map').innerHTML = 
            '<div class="map-error">Error: Map library failed to load. Please refresh the page.</div>';
        return;
    }

    // Initialize the map centered on Nairobi
    const map = L.map('map').setView([-1.2921, 36.8219], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add sample bus markers (replace with real data)
    const buses = [
        { id: 'bus-25', lat: -1.2921, lng: 36.8219, status: 'normal', route: 'Route 25' },
        { id: 'bus-42', lat: -1.3021, lng: 36.8319, status: 'overloaded', route: 'Route 42' }
    ];

    buses.forEach(bus => {
        const marker = L.marker([bus.lat, bus.lng], {
            icon: L.divIcon({
                className: `bus-marker ${bus.status === 'overloaded' ? 'overloaded-marker' : ''}`,
                html: `<span>${bus.id.split('-')[1]}</span>`,
                iconSize: [24, 24]
            })
        }).addTo(map);
        
        marker.bindPopup(`
            <b>Bus ${bus.id.split('-')[1]}</b><br>
            Status: <b>${bus.status === 'overloaded' ? '<span style="color:red">OVERLOADED</span>' : 'Normal'}</b><br>
            Route: ${bus.route}
        `);
    });

    // Map control handlers
    document.getElementById('refresh-map').addEventListener('click', function() {
        // In a real app, this would fetch new bus locations
        console.log('Refreshing map data...');
        // fetchBusLocations();
    });

    document.getElementById('zoom-in').addEventListener('click', function() {
        map.zoomIn();
    });

    document.getElementById('zoom-out').addEventListener('click', function() {
        map.zoomOut();
    });
});