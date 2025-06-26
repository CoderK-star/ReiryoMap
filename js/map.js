function initmap() {
	// Reitaku University, Chiba, Japan: 35.8256, 139.9542

	const map = new maplibregl.Map({
		container: 'map', // ID of your map container
		style: {
			version: 8,
			sources: {
				"google-satellite": {
					type: "raster",
					tiles: [
						"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
					],
					tileSize: 256,
					attribution: "Map data &copy; <a href=\"https://www.google.com/intl/en_us/help/terms_maps/\" target=\"_blank\">Google</a>",
					maxzoom: 21
				}
			},
			layers: [
				{
					id: "google-satellite-layer",
					type: "raster",
					source: "google-satellite"
				}
			]
		},
		center: [139.955303, 35.833707],
		zoom: 16
	});
	const markerMap = new Map(); // key: "lat,lon", value: [{ marker, item, popup }]
	let spiderLines = []; // Store spider lines for cleanup

	function clearSpiderfy() {
		// Remove all spiderfied markers and lines
		spiderLines.forEach(line => {
			if (map.getLayer(line.id)) map.removeLayer(line.id);
			if (map.getSource(line.id)) map.removeSource(line.id);
		});
		spiderLines = [];
		document.querySelectorAll('.spider-marker').forEach(el => el.remove());
	}

	function spiderfy(markerArr, lat, lon) {
		clearSpiderfy();
		if (markerArr.length <= 1) return;
		const center = [lon, lat];
		const radius = 0.001; // ~100m, increased for wider spread
		const angleStep = (2 * Math.PI) / markerArr.length;
		markerArr.forEach((obj, i) => {
			const angle = i * angleStep;
			const spiderLat = lat + radius * Math.sin(angle);
			const spiderLon = lon + radius * Math.cos(angle);
			// Create a new marker for spiderfied position
			const spiderMarker = new maplibregl.Marker({ color: "#d33" })
				.setLngLat([spiderLon, spiderLat])
				.addTo(map);
			const el = spiderMarker.getElement();
			el.classList.add('spider-marker');
			el.addEventListener('mouseenter', () => obj.popup.addTo(map).setLngLat([spiderLon, spiderLat]));
			el.addEventListener('mouseleave', () => obj.popup.remove());
			// Draw a line from center to spider marker
			const lineId = `spider-line-${lat}-${lon}-${i}-${Date.now()}`;
			map.addSource(lineId, {
				type: 'geojson',
				data: {
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: [center, [spiderLon, spiderLat]]
					}
				}
			});
			map.addLayer({
				id: lineId,
				type: 'line',
				source: lineId,
				paint: {
					'line-color': '#d33',
					'line-width': 2
				}
			});
			spiderLines.push({ id: lineId });
		});
		setTimeout(() => {
			map.once('click', clearSpiderfy);
			map.once('movestart', clearSpiderfy);
		}, 0);
	}

	if (Array.isArray(dataObject)) {
		dataObject.forEach(item => {
			const lat = Number(item.lat);
			const lon = Number(item.lon);
			if (
				typeof lat !== 'number' || typeof lon !== 'number' ||
				isNaN(lat) || isNaN(lon) ||
				lat < -90 || lat > 90 ||
				lon < -180 || lon > 180
			) {
				console.warn(`Invalid lat/lon for item:`, item);
				return;
			}
			const marker = new maplibregl.Marker()
				.setLngLat([lon, lat])
				.addTo(map);

			const popup = new maplibregl.Popup({ offset: 25 })
				.setHTML(
					`<strong>${item.title}</strong><br>` +
					`${item.explanation}<br>` +
					(item.location ? `<em>Location:</em> ${item.location}<br>` : '') +
					(item.organizer ? `<em>Organizer:</em> ${item.organizer}` : '')
				);

			marker.getElement().addEventListener('mouseenter', () => popup.addTo(map).setLngLat([lon, lat]));
			marker.getElement().addEventListener('mouseleave', () => popup.remove());

			// Center the map on every marker when clicked
			marker.getElement().addEventListener('click', (e) => {
				map.easeTo({ center: [lon, lat], duration: 180 });
			});

			const key = `${lat},${lon}`;
			if (!markerMap.has(key)) markerMap.set(key, []);
			markerMap.get(key).push({ marker, item, popup, lat, lon });
		});
	}

	// Attach spiderfy to every marker with duplicate positions
	markerMap.forEach((markerArr, key) => {
		if (markerArr.length <= 1) return;
		markerArr.forEach(({ marker, lat, lon }) => {
			marker.getElement().addEventListener('click', (e) => {
				e.stopPropagation();
				map.easeTo({ center: [lon, lat], duration: 180 });
				spiderfy(markerArr, lat, lon);
			});
		});
	});
	

	// Optional: Add a marker at the university
	new maplibregl.Marker()
		.setLngLat([139.955303, 35.833707])
		.addTo(map);

	// Add custom zoom in/out buttons with icons at the bottom right
	const zoomControl = document.createElement('div');
	zoomControl.style.position = 'absolute';
	zoomControl.style.bottom = '20px';
	zoomControl.style.right = '20px';
	zoomControl.style.zIndex = 1;
	zoomControl.innerHTML = `
		<button id="zoom-in-btn" style="width:40px;height:40px;font-size:24px;margin-bottom:4px;cursor:pointer;border-radius:4px;border:1px solid #ccc;background:#fff;">
			<span aria-label="Zoom in" title="Zoom in">＋</span>
		</button>
		<br>
		<button id="zoom-out-btn" style="width:40px;height:40px;font-size:24px;cursor:pointer;border-radius:4px;border:1px solid #ccc;background:#fff;">
			<span aria-label="Zoom out" title="Zoom out">－</span>
		</button>
	`;
	document.body.appendChild(zoomControl);

	document.getElementById('zoom-in-btn').onclick = () => map.zoomIn();
	document.getElementById('zoom-out-btn').onclick = () => map.zoomOut();

	// Add GeolocateControl to the map and move it to the bottom left
	const geolocate = new maplibregl.GeolocateControl({
		positionOptions: { enableHighAccuracy: true },
		trackUserLocation: true,
	});
	map.addControl(geolocate, 'bottom-left');

	// Change the GeolocateControl button slightly bigger
	map.on('load', () => {
		const geoBtn = document.querySelector('.maplibregl-ctrl-bottom-left .maplibregl-ctrl-geolocate');
		if (geoBtn) {
			geoBtn.style.transform = 'scale(1.4)';
			geoBtn.style.marginBottom = '12px';
		}
	});

	// Trigger geolocation and tracking when the custom button is clicked
	document.getElementById('geolocate-btn').onclick = () => {
		geolocate.trigger();
	};
}

