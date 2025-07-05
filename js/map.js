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

	// Category color map (update as requested)
	const categoryColors = {
		"イベント": "#e74c3c",   // red
		"体験": "#f1c40f",       // yellow
		"展示": "#3498db",       // blue
		"食べ物": "#ff9800",     // orange
		"場所": "#43c59e",       // green
		"交通": "#9b59b6"        // purple
	};
	const categoryIcons = {
		"イベント": "images/show.png",
		"体験": "images/Activity.png",
		"展示": "images/Exhibit.png",
		"食べ物": "images/food.png",
		"交通": "images/transportation.png"
	};
	const defaultColor = "#43c59e";

	// Store markers by category for toggling
	const categoryMarkers = {};

	// --- Create legend container in HTML first ---
	let legend = document.getElementById('category-legend');
	let legendToggleBtn = document.getElementById('category-legend-toggle-btn');
	if (!legendToggleBtn) {
		legendToggleBtn = document.createElement('button');
		legendToggleBtn.id = 'category-legend-toggle-btn';
		legendToggleBtn.textContent = 'カテゴリ表示';
		legendToggleBtn.style.position = 'absolute';
		legendToggleBtn.style.top = '32px';
		legendToggleBtn.style.left = '16px';
		legendToggleBtn.style.zIndex = 31;
		legendToggleBtn.style.padding = '8px 16px';
		legendToggleBtn.style.borderRadius = '6px';
		legendToggleBtn.style.border = '1px solid #ccc';
		legendToggleBtn.style.background = '#fff';
		legendToggleBtn.style.cursor = 'pointer';
		legendToggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
		document.body.appendChild(legendToggleBtn);
	}

	if (!legend) {
		legend = document.createElement('div');
		legend.id = 'category-legend';
		legend.style.position = 'absolute';
		legend.style.top = '80px';
		legend.style.left = '16px';
		legend.style.background = '#fff';
		legend.style.border = '1px solid #ccc';
		legend.style.borderRadius = '8px';
		legend.style.padding = '12px 16px';
		legend.style.zIndex = 30;
		legend.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
		legend.style.display = 'none'; // Hide by default

		const title = document.createElement('b');
		title.textContent = 'カテゴリ';
		legend.appendChild(title);
		legend.appendChild(document.createElement('br'));

		// --- Add "Show All" checkbox ---
		const showAllLabel = document.createElement('label');
		showAllLabel.style.display = 'flex';
		showAllLabel.style.alignItems = 'center';
		showAllLabel.style.margin = '4px 0';
		showAllLabel.style.cursor = 'pointer';

		const showAllCheckbox = document.createElement('input');
		showAllCheckbox.type = 'checkbox';
		showAllCheckbox.id = 'legend-toggle-showall';
		showAllCheckbox.checked = true;
		showAllCheckbox.style.marginRight = '6px';

		const showAllText = document.createElement('span');
		showAllText.textContent = 'すべて表示';

		showAllLabel.appendChild(showAllCheckbox);
		showAllLabel.appendChild(showAllText);
		legend.appendChild(showAllLabel);

		showAllCheckbox.addEventListener('change', function() {
			const visible = this.checked;
			// Set all category checkboxes and markers to match
			Object.keys(categoryMarkers).forEach(categoryKey => {
				const cb = document.getElementById(`legend-toggle-${categoryKey}`);
				if (cb) cb.checked = false; // Uncheck all other category checkboxes
				(categoryMarkers[categoryKey] || []).forEach(marker => {
					const el = marker.getElement();
					el.style.display = visible ? '' : 'none';
				});
			});
		});

		document.body.appendChild(legend);
	}

	// Toggle legend visibility on button click
	legendToggleBtn.onclick = function() {
		legend.style.display = (legend.style.display === 'none' ? 'block' : 'none');
	};

	// Track which categories have been added to the legend
	const legendCategories = new Set();

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
			// Ensure category is present and trimmed
			const cat = (item.category || "場所").trim();
			const color = categoryColors[cat] || defaultColor;
			const iconUrl = categoryIcons[cat] || null;

			// --- Add category to legend if not already present ---
			if (!legendCategories.has(cat)) {
				const id = `legend-toggle-${cat}`;
				const label = document.createElement('label');
				label.style.display = 'flex';
				label.style.alignItems = 'center';
				label.style.margin = '4px 0';
				label.style.cursor = 'pointer';

				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.id = id;
				checkbox.checked = false; // Make category checkboxes unchecked by default
				checkbox.style.marginRight = '6px';

				const colorDot = document.createElement('span');
				colorDot.style.display = 'inline-block';
				colorDot.style.width = '16px';
				colorDot.style.height = '16px';
				colorDot.style.background = color;
				colorDot.style.borderRadius = '50%';
				colorDot.style.marginRight = '8px';
				colorDot.style.border = '1px solid #aaa';

				const catName = document.createElement('span');
				catName.textContent = cat;

				label.appendChild(checkbox);
				label.appendChild(colorDot);
				label.appendChild(catName);

				legend.appendChild(label);

				checkbox.addEventListener('change', function() {
					if (this.checked) {
						// Hide all other categories, show only this one
						Object.keys(categoryMarkers).forEach(categoryKey => {
							const show = categoryKey === cat;
							(categoryMarkers[categoryKey] || []).forEach(marker => {
								const el = marker.getElement();
								el.style.display = show ? '' : 'none';
							});
							// Set checkbox state to reflect visibility
							const cb = document.getElementById(`legend-toggle-${categoryKey}`);
							if (cb) cb.checked = show;
						});
						// Uncheck "Show All" if only one is shown
						const showAllCb = document.getElementById('legend-toggle-showall');
						if (showAllCb) showAllCb.checked = false;
					} else {
						// Hide this category only
						(categoryMarkers[cat] || []).forEach(marker => {
							const el = marker.getElement();
							el.style.display = 'none';
						});
						// Uncheck "Show All" if any category is hidden
						const showAllCb = document.getElementById('legend-toggle-showall');
						if (showAllCb) showAllCb.checked = false;
					}
				});

				legendCategories.add(cat);
			}
			// --- end legend creation ---

			let marker;
			if (iconUrl) {
				// Use custom icon for marker
				const el = document.createElement('div');
				el.style.width = '48px';
				el.style.height = '48px';
				el.style.background = 'none';
				el.style.display = 'flex';
				el.style.alignItems = 'center';
				el.style.justifyContent = 'center';

				const img = document.createElement('img');
				img.src = iconUrl;
				img.style.width = '44px';
				img.style.height = '44px';
				img.style.display = 'block';
				img.style.objectFit = 'contain';

				el.appendChild(img);

				marker = new maplibregl.Marker({ element: el })
					.setLngLat([lon, lat])
					.addTo(map);
			} else {
				// Fallback to color marker
				marker = new maplibregl.Marker({ color })
					.setLngLat([lon, lat])
					.addTo(map);
			}

			const popup = new maplibregl.Popup({ offset: 25 })
				.setHTML(
					`<strong>${item.title}</strong><br>` +
					`${item.explanation}<br>` +
					(item.location ? `<em>Location:</em> ${item.location}<br>` : '') +
					(item.organizer ? `<em>Organizer:</em> ${item.organizer}` : '')
				);

			marker.getElement().addEventListener('mouseenter', () => popup.addTo(map).setLngLat([lon, lat]));
			marker.getElement().addEventListener('mouseleave', () => popup.remove());

			// Center the map and show sidepanel on every marker click
			marker.getElement().addEventListener('click', (e) => {
				map.easeTo({ center: [lon, lat], duration: 180 });

				// Show sidepanel with marker info
				const sidepanel = document.getElementById('sidepanel');
				const sidepanelContent = document.getElementById('sidepanel-content');
				if (sidepanel && sidepanelContent) {
					sidepanelContent.innerHTzML =
						`<h2 style="margin-top:0;">${item.title}</h2>` +
						(item.location ? `<div><b>場所:</b> ${item.location}</div>` : '') +
						(item.organizer ? `<div><b>主催:</b> ${item.organizer}</div>` : '') +
						(item.explanation ? `<div style="margin-top:12px;">${item.explanation}</div>` : '');
					sidepanel.style.display = 'block';
				}
				popup.remove(); // Hide popup if sidepanel is shown
			});

			const key = `${lat},${lon}`;
			if (!markerMap.has(key)) markerMap.set(key, []);
			markerMap.get(key).push({ marker, item, popup, lat, lon });

			// Store marker by category for toggling
			if (!categoryMarkers[cat]) categoryMarkers[cat] = [];
			categoryMarkers[cat].push(marker);
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

